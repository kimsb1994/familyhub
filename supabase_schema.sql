-- ═══════════════════════════════════════════════════════════
--  FamilyHub — Supabase SQL Schema
--  Executa aquest SQL al Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Families
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Family members (linked to auth.users)
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  avatar_color text default '#FF6B35',
  role text default 'member', -- 'admin' | 'member'
  created_at timestamptz default now(),
  unique(family_id, user_id)
);

-- Meals (plats del menú)
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  emoji text default '🍽️',
  time_minutes text,
  difficulty text default 'Fàcil', -- 'Fàcil' | 'Mitjana' | 'Difícil'
  meal_type text not null, -- 'Dinar' | 'Sopar'
  day_of_week text not null, -- 'Dilluns' .. 'Diumenge'
  week_start date not null, -- Monday of the week (for weekly grouping)
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Meal ingredients
create table public.meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meals(id) on delete cascade,
  name text not null,
  qty text,
  unit text,
  category text default 'Altres'
);

-- Shopping items (manual additions)
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  qty text,
  unit text,
  category text default 'Altres',
  is_checked boolean default false,
  week_start date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Calendar events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  color text default '#FF6B35',
  member_id uuid references public.family_members(id) on delete set null,
  is_urgent boolean default false,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  text text not null,
  is_done boolean default false,
  is_urgent boolean default false,
  due_date date,
  amount numeric, -- for financial imprevistos
  assigned_to uuid references public.family_members(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
alter table public.families         enable row level security;
alter table public.family_members   enable row level security;
alter table public.meals            enable row level security;
alter table public.meal_ingredients enable row level security;
alter table public.shopping_items   enable row level security;
alter table public.events           enable row level security;
alter table public.tasks            enable row level security;

-- Helper: is the current user a member of a family?
create or replace function public.is_family_member(fid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

-- Policies: members can read/write their family's data
do $$ declare t text; begin
  foreach t in array array[
    'families','family_members','meals','meal_ingredients',
    'shopping_items','events','tasks'
  ] loop
    execute format('
      create policy "%s_family_access" on public.%s
      for all using (
        %s
      )', t, t,
      case t
        when 'families'         then 'is_family_member(id)'
        when 'meal_ingredients' then 'exists(select 1 from public.meals m where m.id = meal_id and is_family_member(m.family_id))'
        else 'is_family_member(family_id)'
      end
    );
  end loop;
end $$;

# Database — Supabase Schema

Proyecto: `hofegfkdxrwqsdwdvmyy.supabase.co`

## Tablas

### families
```sql
id UUID PK | name TEXT | created_at TIMESTAMPTZ
```

### family_members
```sql
id UUID PK
family_id UUID → families(id) CASCADE
user_id UUID → auth.users(id) CASCADE
name TEXT
avatar_color TEXT DEFAULT '#FF6B35'
role TEXT DEFAULT 'member'  -- 'admin' | 'member'
created_at TIMESTAMPTZ
UNIQUE(family_id, user_id)
```

### meals
```sql
id UUID PK
family_id UUID
member_id UUID → family_members (nullable = meal familiar)
name TEXT | emoji TEXT DEFAULT '🍽️'
time_minutes TEXT | difficulty TEXT  -- 'Fàcil' | 'Mitjana' | 'Difícil'
meal_type TEXT   -- 'Dinar' | 'Sopar'
day_of_week TEXT -- 'Dilluns'...'Diumenge'
week_start DATE  -- lunes de la semana (getWeekStart())
created_by UUID → auth.users | created_at TIMESTAMPTZ
```

### meal_ingredients
```sql
id UUID PK
meal_id UUID → meals(id) CASCADE
name TEXT | qty TEXT | unit TEXT
category TEXT DEFAULT 'Altres'
```
Categorías: Verdures, Fruita, Carn/Peix, Làctics, Pasta/Arròs, Llegums, Pa/Farina, Condiments, Oli/Greixos, Altres

### shopping_items
```sql
id UUID PK
family_id UUID
name TEXT | qty TEXT | unit TEXT
category TEXT DEFAULT 'Altres'
is_checked BOOLEAN DEFAULT FALSE
week_start DATE
created_by UUID | created_at TIMESTAMPTZ
```
Auto-generados desde `meal_ingredients` + items manuales. `mergeIngredients()` combina duplicados.

### events
```sql
id UUID PK
family_id UUID
title TEXT
event_date DATE | event_time TIME
color TEXT DEFAULT '#FF6B35'
member_id UUID → family_members (nullable)
is_urgent BOOLEAN DEFAULT FALSE
description TEXT
created_by UUID | created_at TIMESTAMPTZ
gcal_event_id TEXT   -- sync Google Calendar
gcal_sync_at TIMESTAMPTZ
```

### tasks
```sql
id UUID PK
family_id UUID
text TEXT
is_done BOOLEAN DEFAULT FALSE
is_urgent BOOLEAN DEFAULT FALSE
due_date DATE
amount NUMERIC  -- imprevistos financieros
assigned_to UUID → family_members (nullable)
day_of_week TEXT  -- solo weekly
week_start DATE   -- solo weekly
created_by UUID | created_at TIMESTAMPTZ
```

### monthly_tasks
```sql
id UUID PK
family_id UUID
text TEXT
day_of_month INT  -- 1-31
assigned_to UUID → family_members (nullable)
is_urgent BOOLEAN DEFAULT FALSE
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMPTZ
```

## RLS

**Helper function** (SECURITY DEFINER):
```sql
CREATE OR REPLACE FUNCTION is_family_member(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM family_members
    WHERE family_id = fid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**Policies:** Cada tabla tiene SELECT/INSERT/UPDATE/DELETE policies usando:
- `families`: `is_family_member(id)`
- Resto: `is_family_member(family_id)`
- `meal_ingredients`: acceso indirecto via join con `meals`

## RPCs (PL/pgSQL)

```sql
-- Crear familia + primer miembro en transacción atómica
create_family_with_member(family_name TEXT, member_name TEXT)
→ { family_id, member_id }

-- Unirse a familia existente con UUID
join_family_with_code(code UUID, member_name TEXT)
→ { member_id }
```

## Edge Functions (Deno)

| Función | Propósito |
|---------|-----------|
| `gcal-token` | Devuelve access token Google Calendar válido, refresca si expirado |
| `gcal-push` | Crea/actualiza/elimina evento en Google Calendar (action: 'create'/'update'/'delete') |
| `gcal-exchange` | Intercambia auth code OAuth por access_token + refresh_token, guarda en DB |

## Realtime Subscriptions

Patrón usado en todas las páginas:
```js
const ch = supabase.channel('page-name')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name',
    filter: `family_id=eq.${family.id}`
  }, handleChange)
  .subscribe()

return () => supabase.removeChannel(ch)
```

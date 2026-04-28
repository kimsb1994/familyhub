# FamilyHub — Project Context

App familiar PWA para gestionar menú semanal, lista de compra, tareas, calendario y perfiles de familia.

**Stack:** React 18 + Supabase (PostgreSQL + Auth + Realtime) + Google Calendar API + Service Worker PWA  
**Idiomas UI:** Catalán (default), Castellano, English — ver `.claude/docs/i18n.md`  
**No usa:** Redux, TypeScript, Tailwind. Usa Context API + CSS custom properties  
**Entorno:** CRA (`react-scripts`), desplegado como PWA instalable

## Estructura src/

```
src/
├── App.js              # Root: auth guard, tablet detection, theme, PWA banners
├── lib/
│   ├── AuthContext.js  # Context: { session, member, family, members, loading, reload }
│   ├── supabase.js     # Cliente Supabase + signUp/signIn/signOut helpers
│   ├── constants.js    # Enums, helpers: getWeekStart, mergeIngredients, formatDate
│   └── i18n.js         # LanguageContext + useTranslation hook (CA/ES/EN)
├── hooks/
│   ├── usePWA.js               # Install prompt, offline, notificaciones, SW
│   ├── useGoogleCalendarSync.js # OAuth2 sync bidireccional Google Calendar
│   └── useKioskMode.js         # Fullscreen + wake lock para tablet hub
├── components/
│   ├── ui.js            # Avatar, Spinner, EmptyState, PageHeader, IngredientList
│   ├── BottomNav.js     # Navbar inferior 9 tabs con badge counters
│   └── QuickAddModal.js # Catálogo productos/ingredientes por categoría
├── pages/
│   ├── AuthPage.js      # Login → verify → create/join family (multi-step)
│   ├── Dashboard.js     # Home: menú hoy, eventos urgentes, tasques urgentes
│   ├── MenuPage.js      # Grid 7días × Dinar/Sopar, dish library, ingredients
│   ├── ShoppingPage.js  # Auto-merge ingredients + items manuales, por categoría
│   ├── CalendarPage.js  # Calendario mensual + Google Calendar sync
│   ├── TasksPage.js     # Weekly (día+semana) y Monthly (día mes), asignables
│   ├── ProfilePage.js   # Miembros, invitar por código, settings app
│   └── TabletHub.js     # Layout landscape 4 paneles, fullscreen + wake lock
└── styles/
    └── global.css       # CSS variables (dark/light), componentes base, animaciones
```

## Patrones clave

**Routing:** SPA con estado local, no React Router. Navegación via `view` prop en App.js.

**Auth flow:** `AuthContext` carga sesión Supabase → `family_members` → `families`. RPCs: `create_family_with_member`, `join_family_with_code`.

**Realtime:** Todas las páginas suscriben a `supabase.channel()` con `postgres_changes` filtrado por `family_id`. Cleanup en `useEffect` return.

**Fetch pattern:**
```js
const { data, error } = await supabase.from('table').select('*').eq('family_id', family.id)
```

**Semana:** `getWeekStart(date)` retorna el lunes de la semana (Date). Se usa como clave de agrupación en `meals`, `tasks`, `shopping_items`.

**Ingredientes:** `mergeIngredients(list)` combina duplicados sumando cantidades numéricas.

**Tema:** `body.light` activa light theme. Color acento en `localStorage['accent-color']`, aplicado via `document.documentElement.style.setProperty('--accent', color)`.

## Base de datos

Ver `.claude/docs/database.md` para tablas completas, RLS y Edge Functions.

**Tablas principales:** `families`, `family_members`, `meals`, `meal_ingredients`, `shopping_items`, `events`, `tasks`, `monthly_tasks`

**RLS helper:** `is_family_member(family_id UUID)` — todas las policies usan esta función.

## Componentes UI base (src/components/ui.js)

- `<Avatar member={m} size={32} />` — círculo color + inicial
- `<Spinner />` — loading spinner animado
- `<EmptyState icon="🍽️" title="..." subtitle="..." />`
- `<PageHeader title="..." accent="..." />`

## CSS variables principales

```css
--bg, --surface, --card, --border   /* Fondos y superficies */
--accent   /* Color principal (naranja #FF6B35 default) */
--teal     /* Accent secundario #00C9A7 */
--red      /* Errores/urgente #FF4466 */
--text, --muted                     /* Tipografía */
```

Clases utilitarias: `.card`, `.btn-primary`, `.btn-ghost`, `.btn-icon`, `.inp`, `.section-title`, `.chip`, `.tag`

## Variables de entorno (.env)

```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_GOOGLE_CLIENT_ID
```

## Google Calendar

Hook `useGoogleCalendarSync`: OAuth popup → Edge Function `gcal-exchange` → tokens en Supabase. Polling cada 5min. Push via `gcal-push` Edge Function. Token refresh via `gcal-token` Edge Function.

# Design System

## CSS Variables (src/styles/global.css)

### Dark theme (default)
```css
--bg:        #0F0F14   /* Fondo principal */
--surface:   #16161E   /* Superficies secundarias */
--card:      #1C1C27   /* Cards */
--border:    #2A2A3A   /* Bordes */
--accent:    #FF6B35   /* Naranja principal (customizable) */
--accent-dim:#FF6B3520 /* Accent 20% opacity */
--teal:      #00C9A7   /* Accent secundario */
--red:       #FF4466   /* Errores / urgente */
--text:      #F0F0F8   /* Texto principal */
--muted:     #7A7A9A   /* Texto secundario */
```

### Light theme (body.light)
```css
--bg:      #F4F4F9
--surface: #EAEAF3
--text:    #18182A
--muted:   #60608A
```

### Cambiar acento dinámicamente
```js
document.documentElement.style.setProperty('--accent', '#hexcolor')
localStorage.setItem('accent-color', '#hexcolor')
```

## Clases utilitarias

```css
.card           /* background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 1rem */
.btn-primary    /* accent bg, texto blanco, hover scale */
.btn-ghost      /* var(--border) bg, hover con texto */
.btn-icon       /* botón icono minimal sin background visible */
.inp            /* input/select: var(--surface) bg, var(--border) border */
.section-title  /* font Fraunces, con <span> accent */
.chip           /* badge inline redondeado */
.tag            /* uppercase small letras */
```

## Tipografía

- **DM Sans**: body text (Google Fonts)
- **Fraunces**: headings serif (Google Fonts, `.section-title`)

## Animaciones

```css
@keyframes fadeUp   { opacity 0→1 + translateY 20px→0 (300ms) }
@keyframes slideUp  { opacity 0→1 + translateY 30px→0 (250ms) }
@keyframes spin     { rotate 0→360deg (1s infinite) }
@keyframes pulse    { opacity 1→0.4→1 }
```

## Colores de miembros (avatar)

```js
// constants.js
MEMBER_COLORS = ['#FF6B35','#00C9A7','#7B61FF','#FFB547','#FF4466','#4ECDC4','#45B7D1','#96CEB4']
```

## Colores de categorías de ingredientes

```js
CAT_COLORS = {
  'Verdures': '#4CAF50',
  'Fruita': '#FF9800',
  'Carn/Peix': '#F44336',
  'Làctics': '#2196F3',
  'Pasta/Arròs': '#FFC107',
  'Llegums': '#8BC34A',
  'Pa/Farina': '#FF8C00',
  'Condiments': '#9C27B0',
  'Oli/Greixos': '#607D8B',
  'Altres': '#757575'
}
```

## Responsive

- Mobile-first (max-width: 480px)
- Tablet detection en JS: `useIsTablet()` — detecta landscape + pantalla grande
- Tablet: layout `TabletHub.js` (4 paneles 2×2), sin `BottomNav`
- Mobile: `BottomNav` fija en bottom, páginas individuales

## Componentes UI reutilizables (src/components/ui.js)

```jsx
<Avatar member={m} size={32} />          // círculo color + inicial nombre
<Spinner />                              // spinner animado
<EmptyState icon="🍽️" title="..." subtitle="..." />
<PageHeader title="..." accent="..." /> // accent = parte coloreada del título
<IngredientList items={[]} />
```

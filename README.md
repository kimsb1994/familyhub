# 🏡 FamilyHub

Gestió familiar completa: menú setmanal, llista de compra auto-generada, calendari d'events, tasques i imprevistos.

**PWA instal·lable** · **Sync en temps real** · **Vista hub per a tablet** · **Multi-usuari per família**

---

## Estructura del projecte

```
familyhub/
├── public/
│   ├── index.html          ← Splash screen + PWA meta
│   ├── manifest.json       ← Config PWA (icones, nom, colors)
│   ├── sw.js               ← Service Worker (offline + notificacions)
│   └── icons/              ← Icones PWA (generar amb script)
├── scripts/
│   └── generate-icons.js   ← Script per generar icones
├── src/
│   ├── App.js              ← Root: auth guard + detecció tablet/mòbil
│   ├── index.js            ← Entry point React
│   ├── hooks/
│   │   └── usePWA.js       ← Install prompt, offline, notificacions
│   ├── lib/
│   │   ├── supabase.js     ← Client Supabase + auth helpers
│   │   ├── AuthContext.js  ← Context de sessió + família
│   │   └── constants.js    ← Dies, categories, helpers
│   ├── components/
│   │   ├── ui.js           ← Avatar, Spinner, EmptyState, etc.
│   │   └── BottomNav.js    ← Navegació inferior mòbil
│   ├── pages/
│   │   ├── AuthPage.js     ← Login + registre + crear/unir família
│   │   ├── Dashboard.js    ← Pantalla d'inici
│   │   ├── MenuPage.js     ← Menú setmanal amb ingredients
│   │   ├── ShoppingPage.js ← Llista de compra auto-generada
│   │   ├── CalendarPage.js ← Calendari d'events
│   │   ├── TasksPage.js    ← Tasques i imprevistos
│   │   ├── ProfilePage.js  ← Perfils i configuració
│   │   └── TabletHub.js    ← Vista hub per a tablet (landscape)
│   └── styles/
│       └── global.css      ← Variables CSS + estils globals
├── supabase_schema.sql     ← Schema SQL per executar a Supabase
├── .env.example            ← Plantilla variables d'entorn
└── package.json
```

---

## Posada en marxa

### 1. Crear el projecte React

```bash
npx create-react-app familyhub
cd familyhub
npm install @supabase/supabase-js date-fns
```

### 2. Copiar els fitxers

Substitueix el contingut de `src/` i `public/` amb els fitxers d'aquest projecte.

### 3. Configurar Supabase

1. Ves a [supabase.com](https://supabase.com) i crea un projecte gratuït
2. Ves a **SQL Editor** i executa el contingut de `supabase_schema.sql`
3. Ves a **Settings → API** i copia la URL i la clau anon

### 4. Variables d'entorn

Crea un fitxer `.env` a l'arrel:

```
REACT_APP_SUPABASE_URL=https://XXXXXXXX.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

### 5. Generar icones PWA

```bash
npm install canvas --save-dev
node scripts/generate-icons.js
```

### 6. Arrancar en local

```bash
npm start
```

---

## Desplegar a producció (Vercel)

```bash
# 1. Pujar a GitHub
git init && git add . && git commit -m "FamilyHub"
git remote add origin https://github.com/TU_USUARI/familyhub.git
git push -u origin main

# 2. Anar a vercel.com → New Project → importar el repo
# 3. Afegir les variables d'entorn a Vercel (mateixos valors que .env)
# 4. Deploy!
```

**Configurar Supabase per a producció:**
- Supabase Dashboard → Authentication → URL Configuration
- Site URL: `https://familyhub.vercel.app`
- Redirect URLs: `https://familyhub.vercel.app/**`

---

## Instal·lar com a PWA

**Android (Chrome):**
1. Obre l'app al navegador
2. Menú → "Afegir a la pantalla d'inici"
3. Confirmar

**iOS (Safari):**
1. Obre l'app a Safari
2. Botó compartir → "Afegir a la pantalla d'inici"
3. Confirmar

**Tablet (hub de casa):**
- Instal·la la PWA normalment
- Obre l'app en mode landscape → apareixerà automàticament la vista hub amb els 4 panells
- Activa "Pantalla sempre encesa" a la configuració del sistema per mantenir el hub visible

---

## Funcionalitats

| Mòdul | Descripció |
|-------|-----------|
| 🍽️ Menú | Planifica dinar i sopar per cada dia, amb ingredients per a 3 persones |
| 🛒 Compra | Llista auto-generada dels ingredients del menú + productes manuals |
| 📅 Calendari | Events per a tota la família o per membre, amb alertes urgents |
| ✅ Tasques | Tasques assignades a membres, imprevistos urgents amb import |
| 👥 Família | Perfils de membres, invitar per codi, editar nom i color |
| 📱 PWA | Instal·lable a iOS i Android, funciona offline |
| 🖥️ Hub tablet | Vista landscape amb tots els mòduls visibles alhora |
| 🔴 Temps real | Sync automàtic entre tots els dispositius via Supabase |

---

## Cost en producció

| Servei | Pla | Cost |
|--------|-----|------|
| Vercel | Free | 0€/mes |
| Supabase | Free (50k usuaris, 500MB) | 0€/mes |
| Domini propi (opcional) | — | ~10€/any |

**Total: 0€/mes** per a ús familiar normal.

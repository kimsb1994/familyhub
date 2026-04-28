// src/App.js — versió final amb PWA + tablet hub
import React, { useEffect, useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { supabase } from './lib/supabase'
import { mergeIngredients, getWeekStart } from './lib/constants'
import { usePWA, isIOS } from './hooks/usePWA'

// ── Google Calendar OAuth callback ───────────────────────────────────────────
// Cuando el popup de Google redirige de vuelta a la app con ?state=gcal_connect
// esta pantalla intercambia el código y notifica al padre antes de cerrarse.
function GCalCallback() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    if (!code) { setStatus('error'); return }

    const run = async () => {
      // Esperar a que la sesión esté disponible (está en localStorage)
      await supabase.auth.getSession()
      const { error } = await supabase.functions.invoke('gcal-exchange', {
        body: { code, redirect_uri: window.location.origin },
      })
      if (error) { setStatus('error'); return }

      if (window.opener) {
        // Modo popup: notificar al padre y cerrar
        window.opener.postMessage('gcal_connected', window.location.origin)
        window.close()
      } else {
        // Modo misma pestaña: limpiar URL y continuar normalmente
        window.history.replaceState({}, '', window.location.pathname)
        setStatus('done')
        setTimeout(() => window.location.reload(), 500)
      }
    }
    run()
  }, [])

  const msgs = {
    loading: 'Connectant Google Calendar…',
    error:   'Error al connectar. Tanca aquesta finestra i torna-ho a intentar.',
    done:    'Connectat! Tornant a l\'app…',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'var(--app-height, 100vh)', gap:16, fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ fontSize:40 }}>📅</div>
      <div style={{ fontSize:15, color: status === 'error' ? '#F43F5E' : 'var(--text)' }}>{msgs[status]}</div>
      {status === 'loading' && (
        <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #FF6B3530', borderTopColor:'#FF6B35', animation:'spin 1s linear infinite' }} />
      )}
    </div>
  )
}

import AuthPage     from './pages/AuthPage'
import Dashboard    from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import MenuPage     from './pages/MenuPage'
import ShoppingPage from './pages/ShoppingPage'
import TasksPage    from './pages/TasksPage'
import ProfilePage  from './pages/ProfilePage'
import TabletHub, { DishesPanel, ExpensesPanel, EventsPanel } from './pages/TabletHub'
import BottomNav    from './components/BottomNav'

import { LanguageProvider, useTranslation } from './lib/i18n'
import './styles/global.css'

// ── Battery icon SVG ──────────────────────────────────────────────────────────
function BatteryIcon({ level, charging }) {
  const pct = Math.round((level ?? 1) * 100)
  const color = pct > 50 ? '#00C9A7' : pct > 20 ? '#FFD166' : '#F43F5E'
  const fill  = Math.max(0, Math.round((level ?? 1) * 13))
  return (
    <svg width="22" height="11" viewBox="0 0 22 11" style={{ verticalAlign: 'middle' }}>
      <rect x="0.5" y="1" width="17" height="9" rx="2" stroke={color} strokeWidth="1.2" fill="none" />
      <rect x="17.5" y="3.5" width="2.5" height="4" rx="1" fill={color} />
      <rect x="2" y="2.5" width={fill} height="6" rx="1.2" fill={color} />
      {charging && <text x="9" y="9" fontSize="7" fill="#FFD166" textAnchor="middle">⚡</text>}
    </svg>
  )
}

// ── Mobile status bar ─────────────────────────────────────────────────────────
function MobileStatusBar({ isOnline }) {
  const [time,    setTime]    = useState(new Date())
  const [battery, setBattery] = useState(null) // { level, charging }

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!navigator.getBattery) return
    let b = null
    const upd = () => b && setBattery({ level: b.level, charging: b.charging })
    const init = async () => {
      try {
        b = await navigator.getBattery()
        upd()
        b.addEventListener('levelchange', upd)
        b.addEventListener('chargingchange', upd)
      } catch {}
    }
    init()
    return () => { if (b) { b.removeEventListener('levelchange', upd); b.removeEventListener('chargingchange', upd) } }
  }, [])

  const timeStr = time.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
  const pct     = battery ? Math.round(battery.level * 100) : null
  const batColor = !pct ? 'var(--muted)' : pct > 50 ? '#00C9A7' : pct > 20 ? '#FFD166' : '#F43F5E'

  return (
    <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
      <span style={{ fontWeight: 700, color: 'var(--text)', letterSpacing: '.04em' }}>{timeStr}</span>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        {!isOnline && <span style={{ color: 'var(--yellow)', fontSize: 10, fontWeight: 600 }}>OFFLINE</span>}
        {/* Signal bars */}
        <svg width="15" height="11" viewBox="0 0 15 11" style={{ verticalAlign: 'middle' }}>
          <rect x="0"  y="8" width="2.5" height="3"  rx="1" fill="var(--muted)" />
          <rect x="3"  y="6" width="2.5" height="5"  rx="1" fill="var(--muted)" />
          <rect x="6"  y="4" width="2.5" height="7"  rx="1" fill="var(--text)"  />
          <rect x="9"  y="2" width="2.5" height="9"  rx="1" fill="var(--text)"  />
          <rect x="12" y="0" width="2.5" height="11" rx="1" fill="var(--text)"  />
        </svg>
        {/* Battery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <BatteryIcon level={battery?.level} charging={battery?.charging} />
          {pct !== null && <span style={{ color: batColor, fontWeight: 600 }}>{pct}%</span>}
          {pct === null && <span style={{ color: 'var(--muted)' }}>🔋</span>}
        </div>
      </div>
    </div>
  )
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false)
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth > window.innerHeight)
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])
  return isTablet
}

function InstallBanner({ onInstall, onDismiss }) {
  const { t } = useTranslation()
  const iosDesc = 'Toca ⬆️ → "Afegir a la pantalla d\'inici"'
  return (
    <div style={{ position:'fixed', bottom:'calc(88px + max(0px, env(safe-area-inset-bottom, 0px) - 16px))', left:'50%', transform:'translateX(-50%)', width:'calc(100% - 32px)', maxWidth:440, background:'var(--card)', border:'1px solid #FF6B3540', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, zIndex:200, boxShadow:'0 8px 32px #00000060' }}>
      <div style={{ fontSize:32, flexShrink:0 }}>🏡</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{t('app.install_title')}</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
          {isIOS ? iosDesc : t('app.install_desc')}
        </div>
      </div>
      {!isIOS && (
        <button onClick={onInstall} className="btn-primary" style={{ fontSize:12, padding:'8px 14px', flexShrink:0 }}>{t('app.install_btn')}</button>
      )}
      <button onClick={onDismiss} className="btn-icon">✕</button>
    </div>
  )
}

function OfflineBanner() {
  const { t } = useTranslation()
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, background:'var(--yellow)', color:'#000', padding:'8px 16px', textAlign:'center', fontSize:12, fontWeight:600, zIndex:500 }}>
      📡 {t('app.offline')}
    </div>
  )
}

function AppInner() {
  const { session, member, family, loading } = useAuth()
  const { isInstalled, installPrompt, isOnline, promptInstall, requestNotifications } = usePWA()
  const isTablet = useIsTablet()
  const [view,        setView]        = useState(() => new URLSearchParams(window.location.search).get('view') || 'home')

  // Fix iOS viewport height: 100dvh not supported on iOS < 15.4.
  // No actualizamos en cada resize porque en iOS el teclado virtual dispara resize
  // reduciendo window.innerHeight y causando saltos de layout. Solo actualizamos
  // cuando cambia el ancho (orientación real) no el alto (teclado).
  useEffect(() => {
    let lastWidth = globalThis.innerWidth
    const setH = () =>
      document.documentElement.style.setProperty('--app-height', `${globalThis.innerHeight}px`)
    const onResize = () => {
      if (globalThis.innerWidth !== lastWidth) {
        lastWidth = globalThis.innerWidth
        setH()
      }
    }
    const onOrient = () => setTimeout(setH, 200)
    setH()
    globalThis.addEventListener('resize', onResize)
    globalThis.addEventListener('orientationchange', onOrient)
    return () => {
      globalThis.removeEventListener('resize', onResize)
      globalThis.removeEventListener('orientationchange', onOrient)
    }
  }, [])
  const [members,     setMembers]     = useState([])
  const [badges,      setBadges]      = useState({})
  const [showInstall, setShowInstall] = useState(false)
  const [notifAsked,  setNotifAsked]  = useState(false)

  // Apply saved theme + accent color on app start
  useEffect(() => {
    try {
      const theme  = localStorage.getItem('theme')
      const accent = localStorage.getItem('accent-color')
      if (theme === 'light') document.body.classList.add('light')
      if (accent) {
        document.documentElement.style.setProperty('--accent',      accent)
        document.documentElement.style.setProperty('--accent-dim',  accent + '20')
        document.documentElement.style.setProperty('--accent-glow', accent + '40')
      }
    } catch { /* localStorage no disponible (iOS private mode) */ }
  }, [])

  useEffect(() => {
    if (isInstalled) return
    // En iOS beforeinstallprompt nunca se dispara — mostramos instrucciones manuales
    const canShow = isIOS
      ? !localStorage.getItem('ios-install-dismissed')
      : !!installPrompt
    if (!canShow) return
    const t = setTimeout(() => setShowInstall(true), 30000)
    return () => clearTimeout(t)
  }, [installPrompt, isInstalled])

  useEffect(() => {
    if (!session || notifAsked || isTablet) return
    const t = setTimeout(async () => { setNotifAsked(true); await requestNotifications() }, 5000)
    return () => clearTimeout(t)
  }, [session, notifAsked, isTablet, requestNotifications])

  const loadMembers = useCallback(async () => {
    if (!family) return
    const { data } = await supabase.from('family_members').select('*').eq('family_id', family.id)
    setMembers(data || [])
  }, [family])

  const loadBadges = useCallback(async () => {
    if (!family) return
    const weekStart = getWeekStart()
    const [shopRes, taskRes, mealRes] = await Promise.all([
      supabase.from('shopping_items').select('id', { count: 'exact' }).eq('family_id', family.id).eq('week_start', weekStart).eq('is_checked', false),
      supabase.from('tasks').select('id', { count: 'exact' }).eq('family_id', family.id).eq('is_done', false),
      supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', family.id).eq('week_start', weekStart),
    ])
    setBadges({
      shopping: (shopRes.count || 0) + mergeIngredients(mealRes.data || []).length,
      tasks:    taskRes.count || 0,
    })
  }, [family])

  useEffect(() => { loadMembers(); loadBadges() }, [loadMembers, loadBadges])

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'var(--app-height, 100vh)', gap:16 }}>
      <div style={{ fontSize:52 }}>🏡</div>
      <h1 style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:700, letterSpacing:'-.03em' }}>
        Family<span style={{ color:'var(--accent)', fontStyle:'italic' }}>Hub</span>
      </h1>
      <div className="spin" style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #FF6B3530', borderTopColor:'var(--accent)', marginTop:8 }}/>
    </div>
  )

  if (!session || !member) return <AuthPage onAuth={() => window.location.reload()} existingUserId={session?.user?.id} emailConfirmed={!!session?.user?.email_confirmed_at} userEmail={session?.user?.email} />

  // TABLET — hub mode
  if (isTablet) return (
    <>
      {!isOnline && <OfflineBanner />}
      <TabletHub members={members} />
    </>
  )

  // MOBILE
  return (
    <div style={{ width:'100%', maxWidth:480, margin:'0 auto', minHeight:'var(--app-height, 100vh)', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {!isOnline && <OfflineBanner />}

      <div style={{ flex: 1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {view === 'home'     && <Dashboard    members={members} onNavigate={setView} />}
        {view === 'calendar' && <CalendarPage members={members} />}
        {view === 'menu'     && <MenuPage />}
        {view === 'dishes'   && <DishesPanel   familyId={family.id} paneId="mobile" />}
        {view === 'shopping' && <ShoppingPage onNavigate={setView} />}
        {view === 'expenses' && <ExpensesPanel familyId={family.id} members={members} paneId="mobile" />}
        {view === 'tasks'    && <TasksPage    members={members} />}
        {view === 'events'   && <EventsPanel   familyId={family.id} members={members} sessionUserId={session?.user?.id} paneId="mobile" />}
        {view === 'profile'  && <ProfilePage  members={members} onMembersChange={loadMembers} />}
      </div>

      <BottomNav current={view} onChange={v => { setView(v); loadBadges() }} badges={badges} />

      {showInstall && !isInstalled && (
        <InstallBanner
          onInstall={async () => { await promptInstall(); setShowInstall(false) }}
          onDismiss={() => {
            setShowInstall(false)
            if (isIOS) try { localStorage.setItem('ios-install-dismissed', '1') } catch { /* noop */ }
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  // Interceptar callback OAuth de Google Calendar antes de renderizar la app
  const sp = new URLSearchParams(window.location.search)
  if (sp.get('state') === 'gcal_connect' && sp.get('code')) {
    return <GCalCallback />
  }
  return <LanguageProvider><AuthProvider><AppInner /></AuthProvider></LanguageProvider>
}

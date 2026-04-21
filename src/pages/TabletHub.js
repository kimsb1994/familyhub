// src/pages/TabletHub.js
// Vista especial per a tablet en mode landscape — hub central de casa
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getWeekStart, formatDate, mergeIngredients, groupBy, catColor, DAYS_FULL } from '../lib/constants'
import { Avatar } from '../components/ui'
import { useKioskMode } from '../hooks/useKioskMode'

// ── Mini clock ────────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const h = time.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })
  const d = time.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--text)' }}>{h}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, textTransform: 'capitalize' }}>{d}</div>
    </div>
  )
}

// ── Panel card wrapper ─────────────────────────────────────────────────────────
function Panel({ title, accent, icon, children, style = {} }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700 }}>{title}</span>
        {accent && <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700, color: 'var(--accent)', fontStyle: 'italic' }}>{accent}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  )
}

// ── Today's menu panel ─────────────────────────────────────────────────────────
function MenuPanel({ familyId }) {
  const [meals, setMeals] = useState([])
  const dayName  = DAYS_FULL[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const weekStart = getWeekStart()

  useEffect(() => {
    supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', familyId).eq('day_of_week', dayName).eq('week_start', weekStart)
      .then(({ data }) => setMeals(data || []))
    const ch = supabase.channel('hub-meals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `family_id=eq.${familyId}` },
        () => supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', familyId).eq('day_of_week', dayName).eq('week_start', weekStart).then(({ data }) => setMeals(data || [])))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [familyId, dayName, weekStart])

  const dinar = meals.find(m => m.meal_type === 'Dinar')
  const sopar = meals.find(m => m.meal_type === 'Sopar')

  return (
    <Panel title="Menú" accent="d'avui" icon="🍽️">
      {[['☀️', 'Dinar', dinar], ['🌙', 'Sopar', sopar]].map(([emoji, label, meal]) => (
        <div key={label} style={{ padding: '10px 12px', borderRadius: 12, background: meal ? 'var(--surface)' : 'transparent', border: `1px solid ${meal ? 'var(--border)' : 'transparent'}`, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{emoji} {label}</div>
          {meal ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span>{meal.emoji}</span>{meal.name}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {meal.meal_ingredients?.slice(0, 5).map((ing, i) => {
                  const c = catColor(ing.category)
                  return <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 12, background: c + '18', color: c, fontWeight: 600 }}>{ing.name}</span>
                })}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--dim)', fontStyle: 'italic' }}>Sense planificar</div>
          )}
        </div>
      ))}
    </Panel>
  )
}

// ── Shopping panel ─────────────────────────────────────────────────────────────
function ShoppingPanel({ familyId }) {
  const [meals,       setMeals]       = useState([])
  const [manualItems, setManualItems] = useState([])
  const [checked,     setChecked]     = useState({})
  const weekStart = getWeekStart()

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([
      supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', familyId).eq('week_start', weekStart),
      supabase.from('shopping_items').select('*').eq('family_id', familyId).eq('week_start', weekStart),
    ])
    setMeals(m.data || [])
    setManualItems(s.data || [])
  }, [familyId, weekStart])

  useEffect(() => {
    load()
    const ch = supabase.channel('hub-shop')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  const aiIng    = mergeIngredients(meals)
  const allItems = [...aiIng.map(i => ({ ...i, _ai: true })), ...manualItems.map(i => ({ ...i, _ai: false }))]
  const grouped  = groupBy(allItems, 'category')
  const total    = allItems.length
  const done     = allItems.filter(i => i._ai ? !!checked[i.name?.toLowerCase()] : i.is_checked).length

  return (
    <Panel title="Llista de" accent="compra" icon="🛒">
      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>{total - done} pendents</span>
            <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{done}/{total}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--teal),var(--accent))', width: `${total ? (done/total)*100 : 0}%`, borderRadius: 2, transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {total === 0 && <div style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center', padding: '16px 0' }}>Cap producte a la llista</div>}

      {Object.entries(grouped).slice(0, 5).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: catColor(cat), textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{cat}</div>
          {items.map((item, i) => {
            const key    = item._ai ? item.name.toLowerCase() : `m-${item.id}`
            const isDone = item._ai ? !!checked[item.name.toLowerCase()] : item.is_checked
            const toggle = () => {
              if (item._ai) setChecked(p => ({ ...p, [item.name.toLowerCase()]: !p[item.name.toLowerCase()] }))
              else { supabase.from('shopping_items').update({ is_checked: !item.is_checked }).eq('id', item.id).then(load) }
            }
            return (
              <div key={i} onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, cursor: 'pointer', opacity: isDone ? .4 : 1, transition: 'opacity .15s' }}>
                <div style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${isDone ? 'var(--teal)' : 'var(--border)'}`, background: isDone ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                  {isDone && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ flex: 1, fontSize: 13, textDecoration: isDone ? 'line-through' : 'none' }}>{item.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.qty} {item.unit}</span>
              </div>
            )
          })}
        </div>
      ))}
    </Panel>
  )
}

// ── Events panel ───────────────────────────────────────────────────────────────
function EventsPanel({ familyId, members }) {
  const [events, setEvents] = useState([])

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('events')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', familyId)
      .gte('event_date', today)
      .order('event_date').order('event_time').limit(8)
    setEvents(data || [])
  }, [familyId])

  useEffect(() => {
    load()
    const ch = supabase.channel('hub-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  if (events.length === 0) return (
    <Panel title="Pròxims" accent="events" icon="📅">
      <div style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center', padding: '16px 0' }}>Cap event proper</div>
    </Panel>
  )

  return (
    <Panel title="Pròxims" accent="events" icon="📅">
      {events.map(e => {
        const d   = new Date(e.event_date + 'T12:00')
        const day = d.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric' })
        return (
          <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: 'var(--surface)', border: `1px solid var(--border)`, marginBottom: 6 }}>
            <div style={{ width: 40, textAlign: 'center', background: (e.color || 'var(--accent)') + '20', borderRadius: 8, padding: '4px 2px', flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: e.color, fontWeight: 700, textTransform: 'uppercase' }}>{day.split(' ')[0]}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: e.color, fontFamily: 'Fraunces, serif', lineHeight: 1 }}>{day.split(' ')[1]}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
              {e.event_time && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{e.event_time.slice(0,5)}</div>}
            </div>
            {e.family_members && <Avatar member={e.family_members} size={24} />}
            {e.is_urgent && <span style={{ fontSize: 14 }}>⚡</span>}
          </div>
        )
      })}
    </Panel>
  )
}

// ── Tasks panel ────────────────────────────────────────────────────────────────
function TasksPanel({ familyId }) {
  const [tasks, setTasks] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('tasks')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', familyId).eq('is_done', false)
      .order('is_urgent', { ascending: false }).limit(8)
    setTasks(data || [])
  }, [familyId])

  useEffect(() => {
    load()
    const ch = supabase.channel('hub-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  async function toggleDone(task) {
    await supabase.from('tasks').update({ is_done: true }).eq('id', task.id)
    setTasks(p => p.filter(t => t.id !== task.id))
  }

  return (
    <Panel title="Tasques" accent="& imprevistos" icon="✅">
      {tasks.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center', padding: '16px 0' }}>Tot al dia! 🎉</div>}
      {tasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: task.is_urgent ? 'var(--red-dim)' : 'var(--surface)', border: `1px solid ${task.is_urgent ? '#FF446630' : 'var(--border)'}`, marginBottom: 6 }}>
          <div onClick={() => toggleDone(task)} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${task.is_urgent ? 'var(--red)' : 'var(--border)'}`, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
            {task.is_urgent && <span style={{ fontSize: 10 }}>⚡</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: task.is_urgent ? 600 : 500, color: task.is_urgent ? 'var(--red)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.text}</div>
            {task.amount && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{task.amount}€</div>}
          </div>
          {task.family_members && <Avatar member={task.family_members} size={22} />}
        </div>
      ))}
    </Panel>
  )
}

// ── Weekly menu strip ──────────────────────────────────────────────────────────
function WeekStrip({ familyId }) {
  const [meals, setMeals] = useState([])
  const weekStart = getWeekStart()
  const todayIdx  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  useEffect(() => {
    supabase.from('meals').select('name,emoji,meal_type,day_of_week').eq('family_id', familyId).eq('week_start', weekStart)
      .then(({ data }) => setMeals(data || []))
  }, [familyId, weekStart])

  const get = (day, type) => meals.find(m => m.day_of_week === day && m.meal_type === type)

  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
      {DAYS_FULL.map((day, i) => {
        const dn = get(day, 'Dinar'), sp = get(day, 'Sopar')
        const isToday = i === todayIdx
        return (
          <div key={day} style={{ flexShrink: 0, minWidth: 110, background: isToday ? 'var(--accent-dim)' : 'var(--surface)', border: `1px solid ${isToday ? '#FF6B3540' : 'var(--border)'}`, borderRadius: 12, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
              {['Dl','Dt','Dc','Dj','Dv','Ds','Dg'][i]}
              {isToday && <span style={{ marginLeft: 4, color: 'var(--accent)' }}>•</span>}
            </div>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 13 }}>☀️</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dn ? 'var(--text)' : 'var(--dim)', fontStyle: dn ? 'normal' : 'italic', fontWeight: dn ? 500 : 400 }}>
                {dn ? `${dn.emoji} ${dn.name}` : 'Pendent'}
              </span>
            </div>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13 }}>🌙</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: sp ? 'var(--text)' : 'var(--dim)', fontStyle: sp ? 'normal' : 'italic', fontWeight: sp ? 500 : 400 }}>
                {sp ? `${sp.emoji} ${sp.name}` : 'Pendent'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Kiosk activation overlay ───────────────────────────────────────────────────
function KioskOverlay({ onActivate }) {
  return (
    <div
      onClick={onActivate}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,15,20,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, cursor: 'pointer', gap: 20,
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 72 }}>🏡</div>
      <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>
        Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
      </h1>
      <div style={{ fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>Toca per activar el mode quiosc</div>
      <div style={{
        marginTop: 8, padding: '12px 28px',
        background: 'var(--accent)', borderRadius: 50,
        fontSize: 15, fontWeight: 700, color: '#fff',
        boxShadow: '0 4px 20px #FF6B3560',
      }}>
        Pantalla completa ⛶
      </div>
    </div>
  )
}

// ── Main tablet hub ────────────────────────────────────────────────────────────
export default function TabletHub({ members }) {
  const { family } = useAuth()
  const { isFullscreen, enterFullscreen, supportsFullscreen } = useKioskMode()

  if (!family) return null

  const showOverlay = supportsFullscreen && !isFullscreen

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--bg)',
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      gap: 0,
      overflow: 'hidden',
      padding: '16px 20px',
      boxSizing: 'border-box',
    }}>

      {showOverlay && <KioskOverlay onActivate={enterFullscreen} />}

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36 }}>🏡</div>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>
              Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
            </h1>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{family.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar member={m} size={36} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{m.name}</span>
              </div>
            ))}
          </div>
          <Clock />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 14,
        overflow: 'hidden',
      }}>
        <MenuPanel     familyId={family.id} />
        <ShoppingPanel familyId={family.id} />
        <EventsPanel   familyId={family.id} members={members} />
        <TasksPanel    familyId={family.id} />
      </div>

      {/* ── Bottom: weekly strip ── */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          Menú de la setmana
        </div>
        <WeekStrip familyId={family.id} />
      </div>
    </div>
  )
}

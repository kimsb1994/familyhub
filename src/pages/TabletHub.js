// src/pages/TabletHub.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getWeekStart, mergeIngredients, groupBy, catColor, DAYS_FULL } from '../lib/constants'
import { Avatar, Spinner } from '../components/ui'
import { useKioskMode } from '../hooks/useKioskMode'

const EVENT_COLORS = ['#FF6B35','#00C9A7','#FFD166','#8B5CF6','#06B6D4','#F43F5E','#84CC16']

// ── Mini clock ─────────────────────────────────────────────────────────────────
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
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>{h}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, textTransform: 'capitalize' }}>{d}</div>
    </div>
  )
}

// ── Panel card wrapper ─────────────────────────────────────────────────────────
function Panel({ title, accent, icon, children, style = {} }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700 }}>{title}</span>
        {accent && <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontStyle: 'italic' }}>{accent}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  )
}

// ── Menu panel ─────────────────────────────────────────────────────────────────
function MenuPanel({ familyId }) {
  const [meals, setMeals] = useState([])
  const dayName = DAYS_FULL[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
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
        <div key={label} style={{ padding: '8px 10px', borderRadius: 10, background: meal ? 'var(--surface)' : 'transparent', border: `1px solid ${meal ? 'var(--border)' : 'transparent'}`, marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{emoji} {label}</div>
          {meal ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span>{meal.emoji}</span>{meal.name}
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {meal.meal_ingredients?.slice(0, 4).map((ing, i) => {
                  const c = catColor(ing.category)
                  return <span key={i} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: c + '18', color: c, fontWeight: 600 }}>{ing.name}</span>
                })}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>Sense planificar</div>
          )}
        </div>
      ))}
    </Panel>
  )
}

// ── Shopping panel ─────────────────────────────────────────────────────────────
function ShoppingPanel({ familyId }) {
  const [meals, setMeals] = useState([])
  const [manualItems, setManualItems] = useState([])
  const [checked, setChecked] = useState({})
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

  const aiIng = mergeIngredients(meals)
  const allItems = [...aiIng.map(i => ({ ...i, _ai: true })), ...manualItems.map(i => ({ ...i, _ai: false }))]
  const grouped = groupBy(allItems, 'category')
  const total = allItems.length
  const done = allItems.filter(i => i._ai ? !!checked[i.name?.toLowerCase()] : i.is_checked).length

  return (
    <Panel title="Llista de" accent="compra" icon="🛒">
      {total > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>
            <span>{total - done} pendents</span>
            <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{done}/{total}</span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--teal),var(--accent))', width: `${total ? (done/total)*100 : 0}%`, borderRadius: 2, transition: 'width .3s' }} />
          </div>
        </div>
      )}
      {total === 0 && <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '12px 0' }}>Cap producte</div>}
      {Object.entries(grouped).slice(0, 4).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: catColor(cat), textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>{cat}</div>
          {items.map((item, i) => {
            const isDone = item._ai ? !!checked[item.name.toLowerCase()] : item.is_checked
            const toggle = () => {
              if (item._ai) setChecked(p => ({ ...p, [item.name.toLowerCase()]: !p[item.name.toLowerCase()] }))
              else supabase.from('shopping_items').update({ is_checked: !item.is_checked }).eq('id', item.id).then(load)
            }
            return (
              <div key={i} onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 6, cursor: 'pointer', opacity: isDone ? .4 : 1 }}>
                <div style={{ width: 13, height: 13, borderRadius: 4, border: `1.5px solid ${isDone ? 'var(--teal)' : 'var(--border)'}`, background: isDone ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isDone && <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ flex: 1, fontSize: 11, textDecoration: isDone ? 'line-through' : 'none' }}>{item.name}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{item.qty} {item.unit}</span>
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
      .order('event_date').order('event_time').limit(6)
    setEvents(data || [])
  }, [familyId])

  useEffect(() => {
    load()
    const ch = supabase.channel('hub-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  return (
    <Panel title="Pròxims" accent="events" icon="📅">
      {events.length === 0 && <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '12px 0' }}>Cap event proper</div>}
      {events.map(e => {
        const d = new Date(e.event_date + 'T12:00')
        const day = d.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric' })
        const dotColor = e.family_members?.avatar_color || e.color || 'var(--accent)'
        return (
          <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 4 }}>
            <div style={{ width: 34, textAlign: 'center', background: dotColor + '20', borderRadius: 6, padding: '3px 2px', flexShrink: 0 }}>
              <div style={{ fontSize: 8, color: dotColor, fontWeight: 700, textTransform: 'uppercase' }}>{day.split(' ')[0]}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: dotColor, fontFamily: 'Fraunces, serif', lineHeight: 1 }}>{day.split(' ')[1]}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
              {e.event_time && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{e.event_time.slice(0,5)}</div>}
            </div>
            {e.family_members && <Avatar member={e.family_members} size={20} />}
            {e.is_urgent && <span style={{ fontSize: 12 }}>⚡</span>}
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
      .order('is_urgent', { ascending: false }).limit(6)
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
      {tasks.length === 0 && <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '12px 0' }}>Tot al dia! 🎉</div>}
      {tasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: task.is_urgent ? 'var(--red-dim)' : 'var(--surface)', border: `1px solid ${task.is_urgent ? '#FF446630' : 'var(--border)'}`, marginBottom: 4 }}>
          <div onClick={() => toggleDone(task)} style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${task.is_urgent ? 'var(--red)' : 'var(--border)'}`, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {task.is_urgent && <span style={{ fontSize: 9 }}>⚡</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: task.is_urgent ? 600 : 500, color: task.is_urgent ? 'var(--red)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.text}</div>
            {task.amount && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{task.amount}€</div>}
          </div>
          {task.family_members && <Avatar member={task.family_members} size={20} />}
        </div>
      ))}
    </Panel>
  )
}

// ── Tablet event modal (centered) ──────────────────────────────────────────────
function TabletEventModal({ existing, defaultDate, familyId, members, sessionUserId, onSaved, onClose }) {
  const [title,    setTitle]    = useState(existing?.title || '')
  const [date,     setDate]     = useState(existing?.event_date || defaultDate || new Date().toISOString().split('T')[0])
  const [time,     setTime]     = useState(existing?.event_time?.slice(0,5) || '')
  const [color,    setColor]    = useState(existing?.color || '#FF6B35')
  const [memberId, setMemberId] = useState(existing?.member_id || '')
  const [isUrgent, setIsUrgent] = useState(existing?.is_urgent || false)
  const [saving,   setSaving]   = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const payload = { family_id: familyId, title: title.trim(), event_date: date, event_time: time || null, color, member_id: memberId || null, is_urgent: isUrgent, created_by: sessionUserId }
    existing
      ? await supabase.from('events').update(payload).eq('id', existing.id)
      : await supabase.from('events').insert(payload)
    onSaved()
  }

  async function del() {
    await supabase.from('events').delete().eq('id', existing.id)
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 440, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700 }}>{existing ? 'Editar' : 'Nou'} event</h3>
          {existing && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>

        <input className="inp" placeholder="Títol de l'event *" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 10 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <input className="inp" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>

        <select className="inp" value={memberId} onChange={e => setMemberId(e.target.value)} style={{ marginBottom: 10 }}>
          <option value="">Tota la família</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {EVENT_COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '3px solid transparent', transition: 'border .12s' }} />
          ))}
        </div>

        <div onClick={() => setIsUrgent(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid #FF446630', marginBottom: 16, cursor: 'pointer' }}>
          <div className={`checkbox ${isUrgent ? 'red' : ''}`}>
            {isUrgent && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>⚡ Urgent</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !title.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? '💾 Guardar' : '+ Crear'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

// ── Tablet calendar (left half) ────────────────────────────────────────────────
function TabletCalendar({ familyId, members, sessionUserId }) {
  const [events,  setEvents]  = useState([])
  const [month,   setMonth]   = useState(new Date())
  const [selDay,  setSelDay]  = useState(new Date().getDate())
  const [modal,   setModal]   = useState(null)

  const load = useCallback(async () => {
    const y = month.getFullYear(), m = String(month.getMonth()+1).padStart(2,'0')
    const { data } = await supabase.from('events')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', familyId)
      .gte('event_date', `${y}-${m}-01`)
      .lte('event_date', `${y}-${m}-31`)
      .order('event_date').order('event_time', { nullsFirst: true })
    setEvents(data || [])
  }, [familyId, month])

  useEffect(() => {
    load()
    const ch = supabase.channel('hub-cal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  const today         = new Date()
  const daysInMonth   = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate()
  const firstWeekday  = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const offset        = firstWeekday === 0 ? 6 : firstWeekday - 1
  const monthStr      = month.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })

  const evtByDay = events.reduce((a, e) => {
    const d = parseInt(e.event_date.split('-')[2])
    ;(a[d] = a[d] || []).push(e)
    return a
  }, {})

  const selEvents = evtByDay[selDay] || []
  const selDateStr = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`
  const selLabel = new Date(selDateStr + 'T12:00').toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Month header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{monthStr}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 13 }} onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
          <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 13 }} onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
        </div>
      </div>

      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {['Dl','Dt','Dc','Dj','Dv','Ds','Dg'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, flex: 1 }}>
        {[...Array(offset)].map((_, i) => <div key={`e${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const d = i + 1
          const evts = evtByDay[d] || []
          const isToday = d === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()
          const isSel = d === selDay
          return (
            <div
              key={d}
              onClick={() => setSelDay(d)}
              style={{
                textAlign: 'center', padding: '4px 2px 3px', borderRadius: 8, fontSize: 12,
                fontWeight: isToday ? 700 : 400, cursor: 'pointer',
                background: isSel ? 'var(--accent)' : isToday ? 'var(--accent-dim)' : 'transparent',
                color: isSel ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
                transition: 'background .12s',
              }}
            >
              <div>{d}</div>
              {evts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {evts.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.7)' : (e.family_members?.avatar_color || e.color || 'var(--accent)') }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day panel */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'capitalize', letterSpacing: '.03em' }}>
            {selLabel}
          </div>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: '3px 10px' }}
            onClick={() => setModal({ type: 'add', defaultDate: selDateStr })}
          >
            + Afegir
          </button>
        </div>

        {selEvents.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>Sense events</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
            {selEvents.map(e => (
              <div
                key={e.id}
                onClick={() => setModal({ type: 'edit', data: e })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <div style={{ width: 3, borderRadius: 2, background: e.family_members?.avatar_color || e.color || 'var(--accent)', alignSelf: 'stretch', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.is_urgent && '⚡ '}{e.title}
                  </div>
                  {e.event_time && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{e.event_time.slice(0,5)}</div>}
                </div>
                {e.family_members && <Avatar member={e.family_members} size={22} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <TabletEventModal
          existing={modal.type === 'edit' ? modal.data : null}
          defaultDate={modal.defaultDate}
          familyId={familyId}
          members={members}
          sessionUserId={sessionUserId}
          onSaved={() => { load(); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Kiosk overlay ──────────────────────────────────────────────────────────────
function KioskOverlay({ onActivate }) {
  return (
    <div onClick={onActivate} style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,20,0.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', gap: 20, userSelect: 'none' }}>
      <div style={{ fontSize: 72 }}>🏡</div>
      <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>
        Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
      </h1>
      <div style={{ fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>Toca per activar el mode quiosc</div>
      <div style={{ marginTop: 8, padding: '12px 28px', background: 'var(--accent)', borderRadius: 50, fontSize: 15, fontWeight: 700, color: '#fff', boxShadow: '0 4px 20px #FF6B3560' }}>
        Pantalla completa ⛶
      </div>
    </div>
  )
}

// ── Main tablet hub ────────────────────────────────────────────────────────────
export default function TabletHub({ members }) {
  const { family, session } = useAuth()
  const { isFullscreen, enterFullscreen, supportsFullscreen } = useKioskMode()

  if (!family) return null

  const showOverlay = supportsFullscreen && !isFullscreen

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 0, overflow: 'hidden', padding: '14px 18px', boxSizing: 'border-box' }}>

      {showOverlay && <KioskOverlay onActivate={enterFullscreen} />}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🏡</div>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>
              Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
            </h1>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{family.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Avatar member={m} size={32} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.name}</span>
              </div>
            ))}
          </div>
          <Clock />
        </div>
      </div>

      {/* Main layout: calendar (left) + 2x2 panels (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflow: 'hidden', minHeight: 0 }}>

        {/* Left: interactive calendar */}
        <TabletCalendar
          familyId={family.id}
          members={members}
          sessionUserId={session?.user?.id}
        />

        {/* Right: 2x2 panels grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, minHeight: 0, overflow: 'hidden' }}>
          <MenuPanel     familyId={family.id} />
          <ShoppingPanel familyId={family.id} />
          <EventsPanel   familyId={family.id} members={members} />
          <TasksPanel    familyId={family.id} />
        </div>
      </div>
    </div>
  )
}

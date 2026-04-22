// src/pages/TabletHub.js
import React, { useEffect, useState, useCallback, useRef } from 'react'
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

// ── Tablet meal modal ──────────────────────────────────────────────────────────
function TabletMealModal({ existing, mealType, familyId, dayName, weekStart, onSaved, onClose }) {
  const [name,   setName]   = useState(existing?.name || '')
  const [emoji,  setEmoji]  = useState(existing?.emoji || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const payload = { family_id: familyId, meal_type: mealType, day_of_week: dayName, week_start: weekStart, name: name.trim(), emoji: emoji.trim() || '🍽️' }
    if (existing) {
      await supabase.from('meals').update({ name: payload.name, emoji: payload.emoji }).eq('id', existing.id)
    } else {
      await supabase.from('meals').insert(payload)
    }
    onSaved()
  }

  async function del() {
    await supabase.from('meals').delete().eq('id', existing.id)
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 380, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700 }}>{existing ? 'Editar' : 'Nou'} {mealType}</h3>
          {existing && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="inp" placeholder="🍝" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width: 64, textAlign: 'center', fontSize: 22 }} />
          <input className="inp" placeholder="Nom del plat *" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? '💾 Guardar' : '+ Afegir'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

// ── Menu panel ─────────────────────────────────────────────────────────────────
function MenuPanel({ familyId, paneId }) {
  const [meals,  setMeals]  = useState([])
  const [modal,  setModal]  = useState(null)
  const dayName   = DAYS_FULL[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const weekStart = getWeekStart()

  const load = useCallback(async () => {
    const { data } = await supabase.from('meals').select('*, meal_ingredients(*)')
      .eq('family_id', familyId).eq('day_of_week', dayName).eq('week_start', weekStart)
    setMeals(data || [])
  }, [familyId, dayName, weekStart])

  useEffect(() => {
    load()
    const ch = supabase.channel(`hub-meals-${paneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  const dinar = meals.find(m => m.meal_type === 'Dinar')
  const sopar = meals.find(m => m.meal_type === 'Sopar')

  return (
    <>
      <Panel title="Menú" accent="d'avui" icon="🍽️" style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
          {[['☀️', 'Dinar', dinar], ['🌙', 'Sopar', sopar]].map(([ico, label, meal]) => (
            <div
              key={label}
              onClick={() => setModal({ mealType: label, existing: meal || null })}
              style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, cursor: 'pointer', transition: 'border-color .15s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{ico} {label}</div>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{meal ? '✏️' : '+'}</span>
              </div>
              {meal ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{meal.emoji}</span>{meal.name}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {meal.meal_ingredients?.slice(0, 5).map((ing, i) => {
                      const c = catColor(ing.category)
                      return <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: c + '18', color: c, fontWeight: 600 }}>{ing.name}</span>
                    })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--dim)', fontStyle: 'italic' }}>Toca per afegir</div>
              )}
            </div>
          ))}
        </div>
      </Panel>
      {modal && (
        <TabletMealModal
          existing={modal.existing}
          mealType={modal.mealType}
          familyId={familyId}
          dayName={dayName}
          weekStart={weekStart}
          onSaved={() => { load(); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

// ── Shopping panel ─────────────────────────────────────────────────────────────
function ShoppingPanel({ familyId, paneId }) {
  const [meals, setMeals] = useState([])
  const [manualItems, setManualItems] = useState([])
  const [checked, setChecked] = useState({})
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
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
    const ch = supabase.channel(`hub-shop-${paneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  const aiIng = mergeIngredients(meals)
  const allItems = [...aiIng.map(i => ({ ...i, _ai: true })), ...manualItems.map(i => ({ ...i, _ai: false }))]
  const grouped = groupBy(allItems, 'category')
  const total = allItems.length
  const done = allItems.filter(i => i._ai ? !!checked[i.name?.toLowerCase()] : i.is_checked).length

  async function addItem(e) {
    e.preventDefault()
    if (!newItem.trim()) return
    setAdding(true)
    await supabase.from('shopping_items').insert({ family_id: familyId, name: newItem.trim(), week_start: weekStart, is_checked: false })
    setNewItem('')
    setAdding(false)
    load()
  }

  return (
    <Panel title="Llista de" accent="compra" icon="🛒" style={{ height: '100%' }}>
      <form onSubmit={addItem} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          className="inp"
          placeholder="Afegir producte..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
        />
        <button className="btn-primary" type="submit" disabled={adding || !newItem.trim()} style={{ padding: '6px 12px', fontSize: 13, flexShrink: 0 }}>+</button>
      </form>
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
function EventsPanel({ familyId, members, paneId }) {
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
    const ch = supabase.channel(`hub-events-${paneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  return (
    <Panel title="Pròxims" accent="events" icon="📅" style={{ height: '100%' }}>
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
function TasksPanel({ familyId, paneId }) {
  const [tasks,   setTasks]   = useState([])
  const [newText, setNewText] = useState('')
  const [adding,  setAdding]  = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('tasks')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', familyId).eq('is_done', false)
      .order('is_urgent', { ascending: false }).limit(10)
    setTasks(data || [])
  }, [familyId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`hub-tasks-${paneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  async function toggleDone(task) {
    await supabase.from('tasks').update({ is_done: true }).eq('id', task.id)
    setTasks(p => p.filter(t => t.id !== task.id))
  }

  async function addTask(e) {
    e.preventDefault()
    if (!newText.trim()) return
    setAdding(true)
    await supabase.from('tasks').insert({ family_id: familyId, text: newText.trim(), is_done: false, is_urgent: false })
    setNewText('')
    setAdding(false)
    load()
  }

  return (
    <Panel title="Tasques" accent="& imprevistos" icon="✅" style={{ height: '100%' }}>
      <form onSubmit={addTask} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          className="inp"
          placeholder="Nova tasca..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
        />
        <button className="btn-primary" type="submit" disabled={adding || !newText.trim()} style={{ padding: '6px 12px', fontSize: 13, flexShrink: 0 }}>+</button>
      </form>
      {tasks.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center', padding: '10px 0' }}>Tot al dia! 🎉</div>}
      {tasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: task.is_urgent ? 'var(--red-dim)' : 'var(--surface)', border: `1px solid ${task.is_urgent ? '#FF446630' : 'var(--border)'}`, marginBottom: 5 }}>
          <div onClick={() => toggleDone(task)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${task.is_urgent ? 'var(--red)' : 'var(--border)'}`, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {task.is_urgent && <span style={{ fontSize: 11 }}>⚡</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: task.is_urgent ? 600 : 500, color: task.is_urgent ? 'var(--red)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.text}</div>
            {task.amount && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{task.amount}€</div>}
          </div>
          {task.family_members && <Avatar member={task.family_members} size={24} />}
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
function TabletCalendar({ familyId, members, sessionUserId, paneId }) {
  const [events,  setEvents]  = useState([])
  const [month,   setMonth]   = useState(new Date())
  const [selDay,  setSelDay]  = useState(null)
  const [modal,   setModal]   = useState(null)

  const load = useCallback(async () => {
    const y = month.getFullYear(), m = String(month.getMonth()+1).padStart(2,'0')
    const lastDay = new Date(y, month.getMonth()+1, 0).getDate()
    const { data } = await supabase.from('events')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', familyId)
      .gte('event_date', `${y}-${m}-01`)
      .lte('event_date', `${y}-${m}-${String(lastDay).padStart(2,'0')}`)
      .order('event_date').order('event_time', { nullsFirst: true })
    setEvents(data || [])
  }, [familyId, month])

  useEffect(() => {
    load()
    const ch = supabase.channel(`hub-cal-${paneId}`)
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
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>

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
          return (
            <div
              key={d}
              onClick={() => setSelDay(d)}
              style={{
                textAlign: 'center', padding: '4px 2px 3px', borderRadius: 8, fontSize: 12,
                fontWeight: isToday ? 700 : 400, cursor: 'pointer',
                background: isToday ? 'var(--accent-dim)' : 'transparent',
                color: isToday ? 'var(--accent)' : 'var(--text)',
                transition: 'background .12s',
              }}
            >
              <div>{d}</div>
              {evts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {evts.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: e.family_members?.avatar_color || e.color || 'var(--accent)' }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Day popup */}
      {selDay !== null && (
        <div onClick={() => setSelDay(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, width: 420, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, textTransform: 'capitalize' }}>{selLabel}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => { setSelDay(null); setModal({ type: 'add', defaultDate: selDateStr }) }}>+ Afegir</button>
                <button className="btn-icon" onClick={() => setSelDay(null)}>✕</button>
              </div>
            </div>
            {selEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--dim)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Sense events per aquest dia</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
                {selEvents.map(e => (
                  <div
                    key={e.id}
                    onClick={() => { setSelDay(null); setModal({ type: 'edit', data: e }) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    <div style={{ width: 4, borderRadius: 2, background: e.family_members?.avatar_color || e.color || 'var(--accent)', alignSelf: 'stretch', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.is_urgent && '⚡ '}{e.title}
                      </div>
                      {e.event_time && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{e.event_time.slice(0,5)}</div>}
                    </div>
                    {e.family_members && <Avatar member={e.family_members} size={26} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

// ── Pane navigation ────────────────────────────────────────────────────────────
const PANE_SECTIONS = [
  { id: 'calendar', icon: '📅', label: 'Calendari' },
  { id: 'menu',     icon: '🍽️', label: 'Menú'      },
  { id: 'shopping', icon: '🛒', label: 'Compra'    },
  { id: 'tasks',    icon: '✅', label: 'Tasques'   },
  { id: 'events',   icon: '📋', label: 'Events'    },
]

function PaneNav({ current, onChange, side }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 4, gap: 2, flexShrink: 0, width: 62,
    }}>
      {PANE_SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: current === s.id ? 'var(--accent)' : 'transparent',
            color: current === s.id ? '#fff' : 'var(--muted)',
            transition: 'background .15s, color .15s',
          }}
        >
          <span style={{ fontSize: 18 }}>{s.icon}</span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.03em', textAlign: 'center' }}>{s.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Pane: independent navigable half ──────────────────────────────────────────
function TabletPane({ familyId, members, sessionUserId, defaultSection, side }) {
  const [section, setSection] = useState(defaultSection)
  const paneId = useRef(`p-${Math.random().toString(36).slice(2, 7)}`).current

  const content = (
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {section === 'calendar' && <TabletCalendar familyId={familyId} members={members} sessionUserId={sessionUserId} paneId={paneId} />}
      {section === 'menu'     && <MenuPanel     familyId={familyId} paneId={paneId} />}
      {section === 'shopping' && <ShoppingPanel familyId={familyId} paneId={paneId} />}
      {section === 'tasks'    && <TasksPanel    familyId={familyId} paneId={paneId} />}
      {section === 'events'   && <EventsPanel   familyId={familyId} members={members} paneId={paneId} />}
    </div>
  )

  const nav = <PaneNav current={section} onChange={setSection} side={side} />

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 8, height: '100%', overflow: 'hidden', minHeight: 0 }}>
      {side === 'left' ? <>{nav}{content}</> : <>{content}{nav}</>}
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
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px 16px', boxSizing: 'border-box', gap: 10 }}>

      {showOverlay && <KioskOverlay onActivate={enterFullscreen} />}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 28 }}>🏡</div>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>
              Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
            </h1>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{family.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Avatar member={m} size={28} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

      {/* Two independent panes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <TabletPane
          familyId={family.id}
          members={members}
          sessionUserId={session?.user?.id}
          defaultSection="calendar"
          side="left"
        />
        <TabletPane
          familyId={family.id}
          members={members}
          sessionUserId={session?.user?.id}
          defaultSection="tasks"
          side="right"
        />
      </div>
    </div>
  )
}

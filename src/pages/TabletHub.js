// src/pages/TabletHub.js
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getWeekStart, mergeIngredients, groupBy, catColor, DAYS_FULL, DAYS_SHORT } from '../lib/constants'
import { Avatar, Spinner } from '../components/ui'
import { useKioskMode } from '../hooks/useKioskMode'
import QuickAddModal from '../components/QuickAddModal'

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
function Panel({ title, accent, icon, children, style = {}, noScroll = false }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700 }}>{title}</span>
        {accent && <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontStyle: 'italic' }}>{accent}</span>}
      </div>
      <div style={{ flex: 1, overflowY: noScroll ? 'hidden' : 'auto', minHeight: 0 }}>{children}</div>
    </div>
  )
}

// ── Tablet meal modal ──────────────────────────────────────────────────────────
function TabletMealModal({ existing, mealType, familyId, dayName, weekStart, saveToLibrary, onSaved, onClose }) {
  const { session } = useAuth()
  const [name,   setName]   = useState(existing?.name  || '')
  const [emoji,  setEmoji]  = useState(existing?.emoji || '🍽️')
  const [time,   setTime]   = useState(existing?.time_minutes || '')
  const [diff,   setDiff]   = useState(existing?.difficulty  || 'Fàcil')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (existing) {
        await supabase.from('meals').update({ name: name.trim(), emoji, time_minutes: time, difficulty: diff }).eq('id', existing.id)
      } else {
        await supabase.from('meals').insert({
          family_id: familyId, meal_type: mealType, day_of_week: dayName, week_start: weekStart,
          name: name.trim(), emoji, time_minutes: time, difficulty: diff,
          created_by: session?.user?.id,
        })
        if (saveToLibrary) {
          await supabase.from('dishes').insert({
            family_id: familyId, name: name.trim(), emoji, time_minutes: time, difficulty: diff,
          })
        }
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    await supabase.from('meals').delete().eq('id', existing.id)
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 400, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700 }}>{existing ? 'Editar' : 'Nou'} {mealType}</h3>
          {existing && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input className="inp" placeholder="🍝" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width: 64, textAlign: 'center', fontSize: 22 }} />
          <input className="inp" placeholder="Nom del plat *" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <input className="inp" placeholder="Temps (30 min)" value={time} onChange={e => setTime(e.target.value)} />
          <select className="inp" value={diff} onChange={e => setDiff(e.target.value)}>
            {['Fàcil','Mitjana','Difícil'].map(d => <option key={d}>{d}</option>)}
          </select>
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

// ── Tablet dish picker modal ───────────────────────────────────────────────────
function TabletDishPickerModal({ mealType, familyId, dayName, weekStart, onSaved, onClose }) {
  const { session } = useAuth()
  const [dishes,   setDishes]   = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    supabase.from('dishes').select('*, dish_ingredients(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDishes(data || []); setLoading(false) })
  }, [familyId])

  const filtered = search
    ? dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : dishes

  async function selectDish(dish) {
    setSaving(dish.id)
    try {
      const { data, error } = await supabase.from('meals').insert({
        family_id: familyId, name: dish.name, emoji: dish.emoji,
        time_minutes: dish.time_minutes, difficulty: dish.difficulty,
        meal_type: mealType, day_of_week: dayName, week_start: weekStart,
        created_by: session?.user?.id,
      }).select().single()
      if (error) throw error
      if (dish.dish_ingredients?.length > 0) {
        await supabase.from('meal_ingredients').insert(
          dish.dish_ingredients.map(({ name, qty, unit, category }) => ({
            meal_id: data.id, name, qty, unit, category,
          }))
        )
      }
      onSaved(); onClose()
    } catch {
      setSaving(null)
    }
  }

  if (creating) {
    return (
      <TabletMealModal
        mealType={mealType} familyId={familyId}
        dayName={dayName} weekStart={weekStart}
        saveToLibrary
        onSaved={onSaved} onClose={onClose}
      />
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {mealType === 'Dinar' ? '☀️' : '🌙'} {mealType} · {dayName}
          </h3>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Escull un plat de la biblioteca</div>
        </div>

        <input
          className="inp"
          placeholder="Buscar plat..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
          autoFocus
        />

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}><Spinner size={24} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--dim)', fontSize: 13 }}>
              {search ? 'Sense resultats' : 'Encara no hi ha plats guardats'}
            </div>
          ) : (
            filtered.map(dish => (
              <div
                key={dish.id}
                onClick={() => !saving && selectDish(dish)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  marginBottom: 8, cursor: saving ? 'default' : 'pointer',
                  opacity: saving && saving !== dish.id ? 0.4 : 1,
                  transition: 'border-color .15s',
                }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>{dish.emoji || '🍽️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{dish.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                    {dish.time_minutes && <span>⏱ {dish.time_minutes}</span>}
                    {dish.difficulty && <span>{dish.difficulty}</span>}
                    {dish.dish_ingredients?.length > 0 && <span>{dish.dish_ingredients.length} ing.</span>}
                  </div>
                </div>
                {saving === dish.id ? <Spinner size={20} /> : <span style={{ color: 'var(--accent)', fontSize: 20 }}>→</span>}
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setCreating(true)} style={{ flex: 1, justifyContent: 'center' }}>
            ✨ Crear nou plat
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

// ── Menu panel ─────────────────────────────────────────────────────────────────
function MenuPanel({ familyId, paneId }) {
  const [meals, setMeals] = useState([])
  const [modal, setModal] = useState(null)

  const threeDays = useMemo(() => [0, 1, 2].map(offset => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const jsDay = d.getDay()
    return {
      dayName:   DAYS_FULL[jsDay === 0 ? 6 : jsDay - 1],
      weekStart: getWeekStart(d),
      label:     offset === 0 ? 'Avui' : offset === 1 ? 'Demà' : DAYS_FULL[jsDay === 0 ? 6 : jsDay - 1],
      isToday:   offset === 0,
    }
  }), [])

  const weekStarts = useMemo(() => [...new Set(threeDays.map(d => d.weekStart))], [threeDays])

  const load = useCallback(async () => {
    const { data } = await supabase.from('meals').select('*, meal_ingredients(*)')
      .eq('family_id', familyId).in('week_start', weekStarts)
    setMeals(data || [])
  }, [familyId, weekStarts])

  useEffect(() => {
    load()
    const ch = supabase.channel(`hub-meals-${paneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  return (
    <>
      <Panel title="Menú" accent="pròxims dies" icon="🍽️" noScroll style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 8, height: '100%' }}>
          {threeDays.map(({ dayName, weekStart, label, isToday }) => {
            const dayMeals = meals.filter(m => m.day_of_week === dayName && m.week_start === weekStart)
            const dinar = dayMeals.find(m => m.meal_type === 'Dinar')
            const sopar = dayMeals.find(m => m.meal_type === 'Sopar')
            return (
              <div key={dayName + weekStart} style={{ display: 'flex', flexDirection: 'column', gap: 5, background: isToday ? 'var(--accent-dim)' : 'var(--surface)', borderRadius: 14, padding: '8px 12px', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>
                  {label}{!isToday && ` · ${dayName}`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1, minHeight: 0 }}>
                  {[['☀️', 'Dinar', dinar], ['🌙', 'Sopar', sopar]].map(([ico, mealType, meal]) => (
                    <div
                      key={mealType}
                      onClick={() => setModal({ type: meal ? 'edit' : 'pick', mealType, existing: meal || null, dayName, weekStart })}
                      style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}
                    >
                      <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{ico} {mealType}</div>
                      {meal ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span>{meal.emoji}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {meal.meal_ingredients?.slice(0, 3).map((ing, i) => {
                              const c = catColor(ing.category)
                              return <span key={i} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: c + '18', color: c, fontWeight: 600 }}>{ing.name}</span>
                            })}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>+ Afegir</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {modal?.type === 'pick' && (
        <TabletDishPickerModal
          mealType={modal.mealType}
          familyId={familyId}
          dayName={modal.dayName}
          weekStart={modal.weekStart}
          onSaved={() => { load(); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <TabletMealModal
          existing={modal.existing}
          mealType={modal.mealType}
          familyId={familyId}
          dayName={modal.dayName}
          weekStart={modal.weekStart}
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
  const [showQuickAdd, setShowQuickAdd] = useState(false)
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

  return (
    <>
    <Panel title="Llista de" accent="compra" icon="🛒" style={{ height: '100%' }}>
      <button
        className="btn-primary"
        onClick={() => setShowQuickAdd(true)}
        style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginBottom: 8 }}
      >
        🛒 Afegir productes
      </button>
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
      {Object.entries(grouped).map(([cat, items]) => (
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
    {showQuickAdd && (
      <QuickAddModal
        familyId={familyId}
        weekStart={weekStart}
        existingNames={allItems.map(i => i.name)}
        onAdded={load}
        onClose={() => setShowQuickAdd(false)}
      />
    )}
    </>
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

// ── Tablet task modal ──────────────────────────────────────────────────────────
function TabletTaskModal({ existing, defaultDay, familyId, members, sessionUserId, onSaved, onClose }) {
  const weekStart = getWeekStart()
  const [text,     setText]     = useState(existing?.text || '')
  const [day,      setDay]      = useState(existing ? (existing.day_of_week ?? null) : (defaultDay !== undefined ? defaultDay : DAYS_FULL[0]))
  const [memberId, setMemberId] = useState(existing?.assigned_to || '')
  const [isUrgent, setIsUrgent] = useState(existing?.is_urgent || false)
  const [amount,   setAmount]   = useState(existing?.amount || '')
  const [saving,   setSaving]   = useState(false)

  async function save() {
    if (!text.trim()) return
    setSaving(true)
    const payload = {
      family_id: familyId,
      text: text.trim(),
      day_of_week: day,
      week_start: weekStart,
      assigned_to: memberId || null,
      is_urgent: isUrgent,
      amount: amount ? parseFloat(amount) : null,
      is_done: false,
      created_by: sessionUserId,
    }
    existing
      ? await supabase.from('tasks').update(payload).eq('id', existing.id)
      : await supabase.from('tasks').insert(payload)
    onSaved()
  }

  async function del() {
    await supabase.from('tasks').delete().eq('id', existing.id)
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 460, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700 }}>{existing ? 'Editar' : 'Nova'} tasca</h3>
          {existing && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>

        {/* Day selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {DAYS_FULL.map((d, i) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: day === d ? 'var(--accent)' : 'var(--surface)',
                color: day === d ? '#fff' : 'var(--text)',
              }}
            >{DAYS_SHORT[i]}</button>
          ))}
          <button
            onClick={() => setDay(null)}
            style={{
              padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px dashed var(--accent)', cursor: 'pointer',
              background: day === null ? 'var(--accent)' : 'transparent',
              color: day === null ? '#fff' : 'var(--accent)',
            }}
          >🎲 Imprevistos</button>
        </div>

        <input className="inp" placeholder="Descripció de la tasca *" value={text} onChange={e => setText(e.target.value)} style={{ marginBottom: 10 }} />

        <input className="inp" type="number" placeholder="Import (opcional)" value={amount} onChange={e => setAmount(e.target.value)} style={{ marginBottom: 10 }} />

        {/* Member picker */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div
            onClick={() => setMemberId('')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: !memberId ? 'var(--accent)' : 'var(--surface)', border: `2px solid ${!memberId ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}
          >👨‍👩‍👧</div>
          {members.map(m => (
            <div
              key={m.id}
              onClick={() => setMemberId(m.id)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: memberId === m.id ? m.avatar_color : 'var(--surface)', border: `2px solid ${memberId === m.id ? m.avatar_color : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', transition: 'all .15s' }}
              title={m.name}
            >{m.name[0].toUpperCase()}</div>
          ))}
        </div>

        <div onClick={() => setIsUrgent(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid #FF446630', marginBottom: 16, cursor: 'pointer' }}>
          <div className={`checkbox ${isUrgent ? 'red' : ''}`}>
            {isUrgent && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>⚡ Urgent</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !text.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? '💾 Guardar' : '+ Crear'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

// ── Tasks panel ────────────────────────────────────────────────────────────────
function TasksPanel({ familyId, members, sessionUserId, paneId }) {
  const weekStart = getWeekStart()
  const [tasks,  setTasks]  = useState([])
  const [modal,  setModal]  = useState(null) // { day } | { existing }

  const load = useCallback(async () => {
    const { data } = await supabase.from('tasks')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', familyId)
      .eq('week_start', weekStart)
      .order('is_urgent', { ascending: false })
    setTasks(data || [])
  }, [familyId, weekStart])

  useEffect(() => {
    load()
    const ch = supabase.channel(`hub-tasks-${paneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, familyId])

  async function toggleDone(task) {
    await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    load()
  }

  const FAMILY_COLOR = '#FF6B35'
  const ALL_ROWS = [
    ...DAYS_FULL.map((d, i) => ({ key: d, label: DAYS_SHORT[i], isExtra: false })),
    { key: null, label: '?', isExtra: true },
  ]

  const byDay = ALL_ROWS.reduce((acc, { key }) => {
    acc[key] = tasks.filter(t => (key === null ? !t.day_of_week : t.day_of_week === key))
    return acc
  }, {})

  function cardBg(task) {
    if (task.is_done) return '#00C9A722'
    const color = task.family_members?.avatar_color || FAMILY_COLOR
    return color + '28'
  }
  function cardBorder(task) {
    if (task.is_done) return '#00C9A750'
    const color = task.family_members?.avatar_color || FAMILY_COLOR
    return color + '70'
  }

  return (
    <Panel title="Tasques" accent="setmanals" icon="✅" noScroll style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 8-row layout: 7 days + imprevistos */}
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(8, minmax(80px, 1fr))', gap: 6, height: '100%', overflowY: 'auto' }}>
        {ALL_ROWS.map(({ key, label, isExtra }) => {
          const dayTasks = byDay[key] || []
          const pending  = dayTasks.filter(t => !t.is_done).length
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isExtra ? 'var(--accent-dim)' : 'var(--surface)', borderRadius: 14, padding: '0 18px', overflow: 'hidden', border: isExtra ? '1px dashed var(--accent)' : 'none' }}>
              {/* Day label */}
              <div style={{ width: 56, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: isExtra ? 14 : 18, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1.2 }}>
                  {isExtra ? '🎲 Impre­vistos' : label}
                </div>
                {pending > 0 && (
                  <div style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: 13, fontWeight: 700, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}>{pending}</div>
                )}
              </div>

              {/* Separator */}
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '10px 0', flexShrink: 0 }} />

              {/* Horizontal task chips — flex, no scroll, always fit */}
              <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'stretch', minWidth: 0, padding: '8px 0', overflow: 'hidden' }}>
                {dayTasks.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', alignSelf: 'center' }}>Cap tasca</div>
                )}
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleDone(task)}
                    style={{
                      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 12,
                      background: cardBg(task),
                      border: `1.5px solid ${cardBorder(task)}`,
                      cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    {/* Edit button */}
                    <button
                      onClick={e => { e.stopPropagation(); setModal({ existing: task }) }}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', padding: 2, lineHeight: 1 }}
                    >✏️</button>

                    {/* Urgent badge */}
                    {task.is_urgent && <div style={{ fontSize: 14, lineHeight: 1, marginBottom: 4 }}>⚡</div>}

                    {/* Task text */}
                    <div style={{ fontSize: 14, fontWeight: task.is_urgent ? 700 : 600, color: task.is_urgent ? 'var(--red)' : 'var(--text)', textDecoration: task.is_done ? 'line-through' : 'none', paddingRight: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.text}
                    </div>

                    {/* Bottom row: amount + avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      {task.amount
                        ? <div style={{ fontSize: 14, color: 'var(--muted)' }}>{task.amount}€</div>
                        : <div />
                      }
                      {task.family_members
                        ? <div style={{ width: 32, height: 32, borderRadius: '50%', background: task.family_members.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                            {task.family_members.name[0].toUpperCase()}
                          </div>
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: FAMILY_COLOR + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👨‍👩‍👧</div>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button
                className="btn-ghost"
                onClick={() => setModal({ day: key })}
                style={{ padding: '8px 16px', fontSize: 22, fontWeight: 700, borderRadius: 12, flexShrink: 0 }}
              >+</button>
            </div>
          )
        })}
      </div>

      {modal && (
        <TabletTaskModal
          existing={modal.existing}
          defaultDay={modal.day}
          familyId={familyId}
          members={members}
          sessionUserId={sessionUserId}
          onSaved={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
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
      {section === 'tasks'    && <TasksPanel    familyId={familyId} members={members} sessionUserId={sessionUserId} paneId={paneId} />}
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
      <h1 translate="no" style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>
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
            <h1 translate="no" style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1 }}>
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

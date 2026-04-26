// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getWeekStart, formatDate } from '../lib/constants'
import { Avatar } from '../components/ui'
import { useTranslation } from '../lib/i18n'

function QuickAddEventModal({ defaultDate, familyId, memberId, onClose, onSaved }) {
  const [title,  setTitle]  = useState('')
  const [date,   setDate]   = useState(defaultDate)
  const [time,   setTime]   = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    await supabase.from('events').insert({
      family_id:        familyId,
      family_member_id: memberId || null,
      title:            title.trim(),
      event_date:       date,
      event_time:       time || null,
      color:            '#FF6B35',
      is_urgent:        false,
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#00000080', zIndex:300, display:'flex', alignItems:'flex-end' }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:480, margin:'0 auto', background:'var(--card)', borderRadius:'20px 20px 0 0', padding:20 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Nou esdeveniment</div>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Títol…"
          onKeyDown={e => e.key === 'Enter' && save()}
          style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', fontSize:14, color:'var(--text)', marginBottom:10, boxSizing:'border-box' }}
        />
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ flex:1, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', fontSize:14, color:'var(--text)' }}
          />
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{ flex:1, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', fontSize:14, color:'var(--text)' }}
          />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex:1 }}>Cancel·lar</button>
          <button onClick={save} disabled={saving || !title.trim()} className="btn-primary" style={{ flex:2 }}>
            {saving ? '…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ members, onNavigate }) {
  const { family, member } = useAuth()
  const { t } = useTranslation()
  const [todayMeals,   setTodayMeals]   = useState([])
  const [events,       setEvents]       = useState([])
  const [tasks,        setTasks]        = useState([])
  const [shopCount,    setShopCount]    = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [addEventDate, setAddEventDate] = useState(null)

  const today   = new Date()
  const dayName = ['Diumenge','Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte'][today.getDay()]
  const todayStr = today.toISOString().split('T')[0]

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  useEffect(() => {
    if (!family) return
    loadData()
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events',         filter: `family_id=eq.${family.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',          filter: `family_id=eq.${family.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals',          filter: `family_id=eq.${family.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `family_id=eq.${family.id}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [family])

  async function loadData() {
    try {
      const weekStart = getWeekStart()

      const [mealsRes, eventsRes, tasksRes, shopRes] = await Promise.all([
        supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', family.id).eq('day_of_week', dayName).eq('week_start', weekStart),
        supabase.from('events').select('*, family_members(name,avatar_color)').eq('family_id', family.id).gte('event_date', todayStr).order('event_date').order('event_time', { ascending: true, nullsFirst: false }),
        supabase.from('tasks').select('*, family_members(name,avatar_color)').eq('family_id', family.id).eq('is_done', false).order('is_urgent', { ascending: false }).limit(5),
        supabase.from('shopping_items').select('id', { count: 'exact' }).eq('family_id', family.id).eq('week_start', weekStart).eq('is_checked', false),
      ])

      setTodayMeals(mealsRes.data || [])
      setEvents(eventsRes.data || [])
      setTasks(tasksRes.data || [])
      setShopCount(shopRes.count || 0)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <div className="spin" style={{ width:32, height:32, borderRadius:'50%', border:'3px solid var(--accent)30', borderTopColor:'var(--accent)' }} />
    </div>
  )

  const dinar = todayMeals.find(m => m.meal_type === 'Dinar')
  const sopar = todayMeals.find(m => m.meal_type === 'Sopar')

  const urgentEvents  = events.filter(e => e.is_urgent)
  const sevenDayEvents = events.filter(e => next7Days.includes(e.event_date) && !e.is_urgent)

  const eventsByDay = {}
  next7Days.forEach(d => { eventsByDay[d] = [] })
  sevenDayEvents.forEach(e => { if (eventsByDay[e.event_date]) eventsByDay[e.event_date].push(e) })

  const hour = today.getHours()
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 20 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening')

  function getDayLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((d - new Date(todayStr + 'T00:00:00')) / 86400000)
    if (diff === 0) return 'Avui'
    if (diff === 1) return 'Demà'
    return d.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }} className="fu">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:2 }}>
            {dayName}, {today.toLocaleDateString('ca-ES', { day:'numeric', month:'long', year:'numeric' })}
          </div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:28, fontWeight:700, letterSpacing:'-.03em', lineHeight:1.1 }}>
            {greeting},<br /><span style={{ color:'var(--accent)', fontStyle:'italic' }}>Família! 🏡</span>
          </h1>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {members.slice(0, 4).map(m => <Avatar key={m.id} member={m} size={34} />)}
        </div>
      </div>

      {/* Urgent alerts */}
      {urgentEvents.map(e => (
        <div key={e.id} style={{ background:'#FF446612', border:'1px solid #FF446635', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:20 }}>⚡</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#FF6680' }}>{e.title}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{formatDate(e.event_date)}</div>
          </div>
          <button className="btn-ghost" style={{ fontSize:11, padding:'5px 10px' }} onClick={() => onNavigate('calendar')}>›</button>
        </div>
      ))}

      {/* Urgent tasks */}
      {tasks.filter(task => task.is_urgent).map(task => (
        <div key={task.id} style={{ background:'#FF446612', border:'1px solid #FF446635', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:20 }}>⚡</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#FF6680' }}>{task.text}</div>
            {task.amount && <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{task.amount}€</div>}
          </div>
          <button className="btn-ghost" style={{ fontSize:11, padding:'5px 10px' }} onClick={() => onNavigate('tasks')}>›</button>
        </div>
      ))}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {[
          { label: t('nav.calendar'), val: sevenDayEvents.length, icon:'📅', color:'var(--purple)', action:'calendar' },
          { label: t('nav.tasks'),    val: tasks.length,          icon:'✅', color:'var(--yellow)', action:'tasks'    },
          { label: t('nav.shopping'), val: shopCount,             icon:'🛒', color:'var(--teal)',   action:'shopping' },
        ].map(s => (
          <div key={s.label} onClick={() => onNavigate(s.action)} className="card" style={{ cursor:'pointer', textAlign:'center', background: s.color.replace(')', '') + '12)'.replace('var(--',''), borderColor: s.color.replace(')', '30)'), padding:'14px 8px' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:700, color:s.color, fontFamily:'Fraunces, serif' }}>{s.val}</div>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:2, lineHeight:1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's menu */}
      <div className="card" style={{ background:'var(--accent-dim)', borderColor:'#FF6B3540', cursor:'pointer' }} onClick={() => onNavigate('menu')}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.08em' }}>🍽️ {t('dashboard.today_menu')}</div>
          <span style={{ fontSize:11, color:'var(--muted)' }}>editar →</span>
        </div>
        {dinar || sopar ? (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[[`☀️ ${t('dashboard.lunch')}`, dinar], [`🌙 ${t('dashboard.dinner')}`, sopar]].map(([label, meal]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontSize:12, color:'var(--muted)', width:72, flexShrink:0 }}>{label}</div>
                {meal
                  ? <div style={{ fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}><span>{meal.emoji}</span>{meal.name}</div>
                  : <div style={{ fontSize:13, color:'var(--dim)', fontStyle:'italic' }}>{t('dashboard.no_meal')}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize:13, color:'var(--dim)', textAlign:'center', padding:'8px 0' }}>
            {t('dashboard.no_meal')} · <span style={{ color:'var(--accent)', fontWeight:600 }}>{t('dashboard.plan_menu')} →</span>
          </div>
        )}
      </div>

      {/* Next 7 days */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>Propers 7 dies</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button
              onClick={() => setAddEventDate(todayStr)}
              style={{ background:'var(--accent)', border:'none', color:'#fff', borderRadius:8, width:28, height:28, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, flexShrink:0 }}
            >+</button>
            <button onClick={() => onNavigate('calendar')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--muted)' }}>veure tot →</button>
          </div>
        </div>

        {next7Days.map(dateStr => {
          const dayEvents = eventsByDay[dateStr] || []
          const isToday   = dateStr === todayStr

          return (
            <div key={dateStr} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:11, fontWeight:700, color: isToday ? 'var(--accent)' : 'var(--muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>
                  {getDayLabel(dateStr)}
                </div>
                <button
                  onClick={() => setAddEventDate(dateStr)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:18, padding:'0 4px', lineHeight:1 }}
                  title="Afegir esdeveniment"
                >+</button>
              </div>

              {dayEvents.length === 0 ? (
                <div style={{ fontSize:12, color:'var(--dim)', paddingBottom:8, borderBottom:'1px solid var(--border)', opacity:.6 }}>
                  Sense esdeveniments
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {dayEvents.map(e => (
                    <div key={e.id} className="card" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px' }}>
                      <div style={{ width:4, height:32, background: e.color || 'var(--accent)', borderRadius:2, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</div>
                        {e.event_time && <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{e.event_time.slice(0,5)}</div>}
                      </div>
                      {e.family_members && <Avatar member={e.family_members} size={24} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {addEventDate && (
        <QuickAddEventModal
          defaultDate={addEventDate}
          familyId={family.id}
          memberId={member?.id}
          onClose={() => setAddEventDate(null)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}

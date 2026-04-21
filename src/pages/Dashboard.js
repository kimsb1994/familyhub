// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getWeekStart, formatDate } from '../lib/constants'
import { Avatar } from '../components/ui'

export default function Dashboard({ members, onNavigate }) {
  const { family } = useAuth()
  const [todayMeals,  setTodayMeals]  = useState([])
  const [events,      setEvents]      = useState([])
  const [tasks,       setTasks]       = useState([])
  const [shopCount,   setShopCount]   = useState(0)
  const [loading,     setLoading]     = useState(true)

  const today   = new Date()
  const dayName = ['Diumenge','Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte'][today.getDay()]

  useEffect(() => {
    if (!family) return
    loadData()
    // Realtime subscriptions
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events',        filter: `family_id=eq.${family.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',         filter: `family_id=eq.${family.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals',         filter: `family_id=eq.${family.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items',filter: `family_id=eq.${family.id}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [family])

  async function loadData() {
    const weekStart = getWeekStart()
    const todayStr  = today.toISOString().split('T')[0]

    const [mealsRes, eventsRes, tasksRes, shopRes] = await Promise.all([
      supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', family.id).eq('day_of_week', dayName).eq('week_start', weekStart),
      supabase.from('events').select('*, family_members(name,avatar_color)').eq('family_id', family.id).gte('event_date', todayStr).order('event_date').limit(5),
      supabase.from('tasks').select('*, family_members(name,avatar_color)').eq('family_id', family.id).eq('is_done', false).order('is_urgent', { ascending: false }).limit(5),
      supabase.from('shopping_items').select('id', { count: 'exact' }).eq('family_id', family.id).eq('week_start', weekStart).eq('is_checked', false),
    ])

    setTodayMeals(mealsRes.data || [])
    setEvents(eventsRes.data || [])
    setTasks(tasksRes.data || [])
    setShopCount(shopRes.count || 0)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--accent)30', borderTopColor: 'var(--accent)' }} />
    </div>
  )

  const dinar = todayMeals.find(m => m.meal_type === 'Dinar')
  const sopar = todayMeals.find(m => m.meal_type === 'Sopar')
  const urgentEvents = events.filter(e => e.is_urgent)
  const nextEvents   = events.filter(e => !e.is_urgent).slice(0, 3)
  const mealsThisWeek = 0 // could compute

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }} className="fu">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
            {dayName}, {today.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1 }}>
            Bon dia,<br /><span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Família! 🏡</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {members.slice(0, 4).map(m => <Avatar key={m.id} member={m} size={34} />)}
        </div>
      </div>

      {/* Urgent alerts */}
      {urgentEvents.map(e => (
        <div key={e.id} style={{ background: '#FF446612', border: '1px solid #FF446635', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FF6680' }}>{e.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{formatDate(e.event_date)} · {e.description || 'Pendent de gestionar'}</div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => onNavigate('calendar')}>Veure</button>
        </div>
      ))}

      {/* Urgent tasks */}
      {tasks.filter(t => t.is_urgent).map(t => (
        <div key={t.id} style={{ background: '#FF446612', border: '1px solid #FF446635', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FF6680' }}>{t.text}</div>
            {t.amount && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{t.amount}€ · Pendent</div>}
          </div>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => onNavigate('tasks')}>Veure</button>
        </div>
      ))}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Events',  val: nextEvents.length, icon: '📅', color: 'var(--purple)', action: 'calendar' },
          { label: 'Tasques', val: tasks.length,       icon: '✅', color: 'var(--yellow)', action: 'tasks'    },
          { label: 'Compra',  val: shopCount,          icon: '🛒', color: 'var(--teal)',   action: 'shopping' },
        ].map(s => (
          <div key={s.label} onClick={() => onNavigate(s.action)} className="card" style={{ cursor: 'pointer', textAlign: 'center', background: s.color.replace(')', '') + '12)'.replace('var(--',''), borderColor: s.color.replace(')', '30)'), padding: '14px 8px' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'Fraunces, serif' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's menu */}
      <div className="card" style={{ background: 'var(--accent-dim)', borderColor: '#FF6B3540', cursor: 'pointer' }} onClick={() => onNavigate('menu')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.08em' }}>🍽️ Menú d'avui</div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>editar →</span>
        </div>
        {dinar || sopar ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[['☀️ Dinar', dinar], ['🌙 Sopar', sopar]].map(([label, meal]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', width: 64, flexShrink: 0 }}>{label}</div>
                {meal
                  ? <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><span>{meal.emoji}</span>{meal.name}</div>
                  : <div style={{ fontSize: 13, color: 'var(--dim)', fontStyle: 'italic' }}>Sense planificar</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center', padding: '8px 0' }}>
            Cap plat per avui · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Afegeix-ne →</span>
          </div>
        )}
      </div>

      {/* Next events */}
      {nextEvents.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Pròxims events</div>
            <button onClick={() => onNavigate('calendar')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)' }}>veure tot →</button>
          </div>
          {nextEvents.map(e => (
            <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ width: 4, height: 36, background: e.color || 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {formatDate(e.event_date)}{e.event_time ? ` · ${e.event_time.slice(0,5)}` : ''}
                </div>
              </div>
              {e.family_members && <Avatar member={e.family_members} size={26} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

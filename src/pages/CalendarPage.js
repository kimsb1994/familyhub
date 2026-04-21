// src/pages/CalendarPage.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDate } from '../lib/constants'
import { Avatar, PageHeader, Spinner } from '../components/ui'

const EVENT_COLORS = ['#FF6B35','#00C9A7','#FFD166','#8B5CF6','#06B6D4','#F43F5E','#84CC16']

function EventModal({ existing, familyId, members, sessionUserId, onSaved, onDeleted, onClose }) {
  const [title,     setTitle]     = useState(existing?.title     || '')
  const [date,      setDate]      = useState(existing?.event_date || new Date().toISOString().split('T')[0])
  const [time,      setTime]      = useState(existing?.event_time?.slice(0,5) || '')
  const [color,     setColor]     = useState(existing?.color     || '#FF6B35')
  const [memberId,  setMemberId]  = useState(existing?.member_id || '')
  const [isUrgent,  setIsUrgent]  = useState(existing?.is_urgent || false)
  const [desc,      setDesc]      = useState(existing?.description || '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true); setError('')
    const payload = { family_id: familyId, title: title.trim(), event_date: date, event_time: time || null, color, member_id: memberId || null, is_urgent: isUrgent, description: desc, created_by: sessionUserId }
    const { error: e } = existing
      ? await supabase.from('events').update(payload).eq('id', existing.id)
      : await supabase.from('events').insert(payload)
    if (e) { setError(e.message); setSaving(false); return }
    onSaved(); onClose()
  }

  async function del() {
    await supabase.from('events').delete().eq('id', existing.id)
    onDeleted(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>{existing ? 'Editar' : 'Nou'} event</h3>
          {existing && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Títol *</label>
          <input className="inp" placeholder="Reunió escola, metge..." value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Data *</label>
            <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Hora</label>
            <input className="inp" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {EVENT_COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '3px solid transparent', transition: 'border .15s' }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Membre (opcional)</label>
          <select className="inp" value={memberId} onChange={e => setMemberId(e.target.value)}>
            <option value="">Tota la família</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Descripció (opcional)</label>
          <input className="inp" placeholder="Detalls addicionals..." value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid #FF446630', marginBottom: 14, cursor: 'pointer' }} onClick={() => setIsUrgent(p => !p)}>
          <div className={`checkbox ${isUrgent ? 'red' : ''}`}>
            {isUrgent && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>⚡ Marcar com a urgent</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Apareixerà destacat al dashboard</div>
          </div>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !title.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? '💾 Guardar' : '+ Crear event'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage({ members }) {
  const { family, session } = useAuth()
  const [events,  setEvents]  = useState([])
  const [selDay,  setSelDay]  = useState(new Date().getDate())
  const [modal,   setModal]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [month,   setMonth]   = useState(new Date())

  const load = useCallback(async () => {
    if (!family) return
    const y = month.getFullYear(), m = String(month.getMonth()+1).padStart(2,'0')
    const { data } = await supabase
      .from('events')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', family.id)
      .gte('event_date', `${y}-${m}-01`)
      .lte('event_date', `${y}-${m}-31`)
      .order('event_date')
    setEvents(data || [])
    setLoading(false)
  }, [family, month])

  useEffect(() => {
    load()
    if (!family) return
    const ch = supabase.channel('events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${family.id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, family])

  const daysInMonth   = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate()
  const firstWeekday  = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const offset        = firstWeekday === 0 ? 6 : firstWeekday - 1 // Monday-first
  const monthStr      = month.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })

  const evtByDay = events.reduce((a, e) => {
    const d = parseInt(e.event_date.split('-')[2])
    ;(a[d] = a[d] || []).push(e)
    return a
  }, {})

  const selEvents = evtByDay[selDay] || []
  const allUpcoming = events.filter(e => new Date(e.event_date) >= new Date())

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: '20px 16px' }} className="fu">
      <PageHeader title="Calendari" accent="Familiar" />

      {/* Mini calendar */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{monthStr}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
          {['Dl','Dt','Dc','Dj','Dv','Ds','Dg'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600, padding: '3px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {[...Array(offset)].map((_, i) => <div key={`e${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const d = i + 1
            const evts = evtByDay[d] || []
            const isToday = d === new Date().getDate() && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear()
            const isSel   = d === selDay && month.getMonth() === new Date().getMonth()
            return (
              <div key={d} onClick={() => setSelDay(d)} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 8, fontSize: 12, fontWeight: isToday ? 700 : 400, cursor: 'pointer', background: isSel ? 'var(--accent)' : isToday ? 'var(--accent-dim)' : 'transparent', color: isSel ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)', transition: 'all .15s' }}>
                {d}
                {evts.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                    {evts.slice(0,3).map((e,j) => <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: e.color || 'var(--accent)' }} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Member filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tots</div>
        {members.map(m => (
          <div key={m.id} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: (m.avatar_color || 'var(--accent)') + '20', color: m.avatar_color, cursor: 'pointer', border: `1px solid ${m.avatar_color}30`, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Avatar member={m} size={16} />{m.name}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allUpcoming.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', fontSize: 13 }}>Cap event proper</div>
        )}
        {allUpcoming.map(e => (
          <div key={e.id} className="card" style={{ display: 'flex', gap: 12, padding: '14px', cursor: 'pointer' }} onClick={() => setModal({ type: 'edit', data: e })}>
            <div style={{ width: 48, flexShrink: 0, textAlign: 'center', background: (e.color || 'var(--accent)') + '18', borderRadius: 10, padding: '6px 4px' }}>
              <div style={{ fontSize: 10, color: e.color, fontWeight: 700 }}>{e.event_date ? new Date(e.event_date+'T12:00').toLocaleDateString('ca-ES',{weekday:'short'}).toUpperCase() : ''}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: e.color, fontFamily: 'Fraunces, serif' }}>{e.event_date ? new Date(e.event_date+'T12:00').getDate() : ''}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{e.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {e.event_time ? e.event_time.slice(0,5) : ''}
                {e.description ? ` · ${e.description}` : ''}
              </div>
            </div>
            {e.family_members && <Avatar member={e.family_members} size={28} />}
            {e.is_urgent && <span className="tag" style={{ background: 'var(--red-dim)', color: 'var(--red)', alignSelf: 'center' }}>Urgent</span>}
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={() => setModal({ type: 'add' })}>
        + Afegir event
      </button>

      {modal && (
        <EventModal
          existing={modal.type === 'edit' ? modal.data : null}
          familyId={family.id}
          members={members}
          sessionUserId={session.user.id}
          onSaved={load} onDeleted={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

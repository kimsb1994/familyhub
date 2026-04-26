// src/pages/CalendarPage.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Avatar, PageHeader, Spinner } from '../components/ui'
import { useGoogleCalendarSync } from '../hooks/useGoogleCalendarSync'

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
const EVENT_COLORS = ['#FF6B35','#00C9A7','#FFD166','#8B5CF6','#06B6D4','#F43F5E','#84CC16']

// ── Event form modal ───────────────────────────────────────────────────────────
function EventModal({ existing, defaultDate, familyId, members, sessionUserId, onSaved, onDeleted, onClose, gcalPush }) {
  const [title,    setTitle]    = useState(existing?.title     || '')
  const [date,     setDate]     = useState(existing?.event_date || defaultDate || new Date().toISOString().split('T')[0])
  const [time,     setTime]     = useState(existing?.event_time?.slice(0,5) || '')
  const [color,    setColor]    = useState(existing?.color     || '#FF6B35')
  const [memberId, setMemberId] = useState(existing?.member_id || '')
  const [isUrgent, setIsUrgent] = useState(existing?.is_urgent || false)
  const [desc,     setDesc]     = useState(existing?.description || '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true); setError('')
    const payload = { family_id: familyId, title: title.trim(), event_date: date, event_time: time || null, color, member_id: memberId || null, is_urgent: isUrgent, description: desc, created_by: sessionUserId }

    if (existing) {
      const { error: e } = await supabase.from('events').update(payload).eq('id', existing.id)
      if (e) { setError(e.message); setSaving(false); return }
      // Sincronizar actualización con Google Calendar (fire-and-forget)
      if (gcalPush && existing.gcal_event_id) {
        gcalPush('update', { ...payload, id: existing.id }, existing.gcal_event_id)
      }
    } else {
      const { data: created, error: e } = await supabase.from('events').insert(payload).select().single()
      if (e) { setError(e.message); setSaving(false); return }
      // Crear en Google Calendar y guardar el gcal_event_id
      if (gcalPush && created) {
        gcalPush('create', created).then(result => {
          if (result?.gcal_id) {
            supabase.from('events').update({ gcal_event_id: result.gcal_id }).eq('id', created.id)
          }
        })
      }
    }
    onSaved(); onClose()
  }

  async function del() {
    // Borrar de Google Calendar antes de borrar de la BD
    if (gcalPush && existing.gcal_event_id) {
      gcalPush('delete', existing, existing.gcal_event_id)
    }
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

// ── Google icon ────────────────────────────────────────────────────────────────
function GoogleIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

// ── Day popup ──────────────────────────────────────────────────────────────────
function DayPopup({ dateStr, events, onClose, onEditEvent, onAddEvent }) {
  const d = new Date(dateStr + 'T12:00')
  const label = d.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, textTransform: 'capitalize' }}>
            {label}
          </h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            Sense events per aquest dia
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {events.map(e => {
              const dotColor = e._isGoogle ? '#4285F4' : (e.family_members?.avatar_color || e.color || 'var(--accent)')
              return (
                <div
                  key={e.id}
                  onClick={() => !e._isGoogle && onEditEvent(e)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: `1px solid var(--border)`, cursor: e._isGoogle ? 'default' : 'pointer' }}
                >
                  <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: dotColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {e.is_urgent && <span style={{ fontSize: 12 }}>⚡</span>}
                      {e._isGoogle && <GoogleIcon size={13} />}
                      {e.title}
                    </div>
                    {(e.event_time || e.description) && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                        {e.event_time ? e.event_time.slice(0, 5) : ''}
                        {e.event_time && e.description ? ' · ' : ''}
                        {e.description || ''}
                      </div>
                    )}
                  </div>
                  {!e._isGoogle && (e.family_members
                    ? <Avatar member={e.family_members} size={30} />
                    : <div style={{ fontSize: 16 }}>👨‍👩‍👧</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button className="btn-primary" onClick={onAddEvent} style={{ width: '100%', justifyContent: 'center' }}>
          + Afegir event
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CalendarPage({ members }) {
  const { family, session } = useAuth()
  const { connected, checking, gcalEvents, connect, disconnect, loadMonth, pushEvent } = useGoogleCalendarSync()
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [month,    setMonth]    = useState(new Date())
  const [dayPopup, setDayPopup] = useState(null)
  const [modal,    setModal]    = useState(null)

  const load = useCallback(async () => {
    if (!family) return
    const y = month.getFullYear(), m = String(month.getMonth()+1).padStart(2,'0')
    const lastDay = new Date(y, month.getMonth()+1, 0).getDate()
    const { data } = await supabase
      .from('events')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', family.id)
      .gte('event_date', `${y}-${m}-01`)
      .lte('event_date', `${y}-${m}-${String(lastDay).padStart(2,'0')}`)
      .order('event_date').order('event_time', { nullsFirst: true })
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

  // Notificar al hook cuándo cambia el mes para que actualice los eventos de Google
  useEffect(() => {
    loadMonth(month.getFullYear(), month.getMonth() + 1)
  }, [month, loadMonth])

  const allEvents    = [...events, ...gcalEvents]
  const daysInMonth  = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate()
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const offset       = firstWeekday === 0 ? 6 : firstWeekday - 1
  const monthStr     = month.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })

  const evtByDay = allEvents.reduce((a, e) => {
    if (!e.event_date) return a
    const d = parseInt(e.event_date.split('-')[2])
    ;(a[d] = a[d] || []).push(e)
    return a
  }, {})

  const today       = new Date()
  const todayStr    = today.toISOString().split('T')[0]
  const allUpcoming = allEvents
    .filter(e => e.event_date >= todayStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const popupEvents = dayPopup ? (evtByDay[parseInt(dayPopup.split('-')[2])] || []) : []

  function toDateStr(d) {
    const y = month.getFullYear(), m = String(month.getMonth()+1).padStart(2,'0')
    return `${y}-${m}-${String(d).padStart(2,'0')}`
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: '20px 16px', minHeight: '100%' }} className="fu">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <PageHeader title="Calendari" accent="Familiar" style={{ margin: 0 }} />
        {GOOGLE_CLIENT_ID && !checking && (
          connected ? (
            <button
              className="btn-ghost"
              onClick={disconnect}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px', flexShrink: 0 }}
            >
              <GoogleIcon size={14} /> Google ✓
            </button>
          ) : (
            <button
              className="btn-ghost"
              onClick={connect}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px', flexShrink: 0 }}
            >
              <GoogleIcon size={14} /> Connectar
            </button>
          )
        )}
      </div>

      {/* ── Mini calendar ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{monthStr}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
          </div>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {['Dl','Dt','Dc','Dj','Dv','Ds','Dg'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {[...Array(offset)].map((_, i) => <div key={`e${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const d = i + 1
            const evts = evtByDay[d] || []
            const isToday = d === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()
            return (
              <div
                key={d}
                onClick={() => setDayPopup(toDateStr(d))}
                style={{
                  textAlign: 'center', padding: '10px 0 8px', borderRadius: 10,
                  fontSize: 15, fontWeight: isToday ? 700 : 400, cursor: 'pointer',
                  background: isToday ? 'var(--accent-dim)' : 'transparent',
                  color: isToday ? 'var(--accent)' : 'var(--text)',
                  transition: 'background .12s',
                }}
              >
                <div>{d}</div>
                {evts.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3 }}>
                    {evts.slice(0, 3).map((e, j) => (
                      <div
                        key={j}
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: e._isGoogle ? '#4285F4' : (e.family_members?.avatar_color || e.color || 'var(--accent)'),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Member filter pills ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tots</div>
        {members.map(m => (
          <div key={m.id} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: (m.avatar_color || 'var(--accent)') + '20', color: m.avatar_color, cursor: 'pointer', border: `1px solid ${m.avatar_color}30`, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Avatar member={m} size={16} />{m.name}
          </div>
        ))}
      </div>

      {/* ── Upcoming events list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allUpcoming.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', fontSize: 13 }}>Cap event proper</div>
        )}
        {allUpcoming.map(e => {
          const accentColor = e._isGoogle ? '#4285F4' : (e.family_members?.avatar_color || e.color || 'var(--accent)')
          return (
            <div
              key={e.id}
              className="card"
              style={{ display: 'flex', gap: 12, padding: '14px', cursor: e._isGoogle ? 'default' : 'pointer' }}
              onClick={() => !e._isGoogle && setModal({ type: 'edit', data: e })}
            >
              <div style={{ width: 48, flexShrink: 0, textAlign: 'center', background: accentColor + '18', borderRadius: 10, padding: '6px 4px' }}>
                <div style={{ fontSize: 10, color: accentColor, fontWeight: 700 }}>
                  {new Date(e.event_date+'T12:00').toLocaleDateString('ca-ES',{weekday:'short'}).toUpperCase()}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: accentColor, fontFamily: 'Fraunces, serif' }}>
                  {new Date(e.event_date+'T12:00').getDate()}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {e._isGoogle && <GoogleIcon size={13} />}
                  {e.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {e.event_time ? e.event_time.slice(0,5) : ''}
                  {e.description ? ` · ${e.description}` : ''}
                </div>
              </div>
              {!e._isGoogle && e.family_members && <Avatar member={e.family_members} size={28} />}
              {e.is_urgent && <span className="tag" style={{ background: 'var(--red-dim)', color: 'var(--red)', alignSelf: 'center' }}>Urgent</span>}
            </div>
          )
        })}
      </div>

      <button className="btn-primary" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={() => setModal({ type: 'add' })}>
        + Afegir event
      </button>

      {/* ── Day popup ── */}
      {dayPopup && !modal && (
        <DayPopup
          dateStr={dayPopup}
          events={popupEvents}
          onClose={() => setDayPopup(null)}
          onEditEvent={e => { setDayPopup(null); setModal({ type: 'edit', data: e }) }}
          onAddEvent={() => { setDayPopup(null); setModal({ type: 'add', defaultDate: dayPopup }) }}
        />
      )}

      {/* ── Event form modal ── */}
      {modal && (
        <EventModal
          existing={modal.type === 'edit' ? modal.data : null}
          defaultDate={modal.defaultDate}
          familyId={family.id}
          members={members}
          sessionUserId={session.user.id}
          onSaved={load} onDeleted={load}
          onClose={() => setModal(null)}
          gcalPush={pushEvent}
        />
      )}
    </div>
  )
}

// src/pages/TasksPage.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Avatar, PageHeader, Spinner } from '../components/ui'
import { useTranslation } from '../lib/i18n'

function TaskModal({ existing, defaultMember, familyId, members, sessionUserId, onSaved, onDeleted, onClose }) {
  const { t } = useTranslation()
  const [text,      setText]      = useState(existing?.text      || '')
  const [isUrgent,  setIsUrgent]  = useState(existing?.is_urgent || false)
  const [dueDate,   setDueDate]   = useState(existing?.due_date  || '')
  const [amount,    setAmount]    = useState(existing?.amount    || '')
  const [assignedTo,setAssignedTo]= useState(existing?.assigned_to || defaultMember || '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function save() {
    if (!text.trim()) return
    setSaving(true); setError('')
    const payload = {
      family_id: familyId, text: text.trim(), is_urgent: isUrgent,
      due_date: dueDate || null, amount: amount ? parseFloat(amount) : null,
      assigned_to: assignedTo || null, created_by: sessionUserId,
    }
    const { error: e } = existing
      ? await supabase.from('tasks').update(payload).eq('id', existing.id)
      : await supabase.from('tasks').insert(payload)
    if (e) { setError(e.message); setSaving(false); return }
    onSaved(); onClose()
  }

  async function del() {
    await supabase.from('tasks').delete().eq('id', existing.id)
    onDeleted(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>{existing ? t('tasks.edit_task') : t('tasks.new_task')}</h3>
          {existing && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>*</label>
          <input className="inp" placeholder={t('tasks.task_desc')} value={text} onChange={e => setText(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('tasks.due_date')}</label>
            <input className="inp" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('tasks.amount')}</label>
            <input className="inp" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('tasks.assigned')}</label>
          <select className="inp" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">{t('common.all_family')}</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid #FF446630', marginBottom: 14, cursor: 'pointer' }} onClick={() => setIsUrgent(p => !p)}>
          <div className={`checkbox ${isUrgent ? 'red' : ''}`}>
            {isUrgent && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>{t('tasks.urgent_label')}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('tasks.urgent_desc')}</div>
          </div>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !text.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? `💾 ${t('common.save')}` : t('tasks.create')}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage({ members }) {
  const { family, session } = useAuth()
  const { t } = useTranslation()
  const [tasks,        setTasks]        = useState([])
  const [modal,        setModal]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [filterMember, setFilterMember] = useState(null)

  const load = useCallback(async () => {
    if (!family) return
    const { data } = await supabase
      .from('tasks')
      .select('*, family_members(name,avatar_color)')
      .eq('family_id', family.id)
      .order('is_urgent', { ascending: false })
      .order('created_at')
    setTasks(data || [])
    setLoading(false)
  }, [family])

  useEffect(() => {
    load()
    if (!family) return
    const ch = supabase.channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${family.id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, family])

  async function toggleDone(task) {
    await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    setTasks(p => p.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
  }

  const pending = tasks.filter(t => !t.is_done)
  const done    = tasks.filter(t => t.is_done)

  const visiblePending = filterMember ? pending.filter(t => t.assigned_to === filterMember) : pending
  const urgent  = visiblePending.filter(t => t.is_urgent)
  const normal  = visiblePending.filter(t => !t.is_urgent)
  const visibleDone = filterMember ? done.filter(t => t.assigned_to === filterMember) : done

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: '20px 16px', paddingBottom: members.length > 0 ? 100 : 20 }} className="fu">
      <PageHeader
        title={t('tasks.title')} accent={t('tasks.accent')}
        action={
          <button className="btn-primary" onClick={() => setModal({ type: 'add' })} style={{ fontSize: 12, padding: '9px 14px' }}>
            {t('tasks.new')}
          </button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { val: pending.length, label: t('tasks.pending'), color: 'var(--accent)' },
          { val: done.length,    label: t('tasks.done'),    color: 'var(--teal)'   },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'Fraunces, serif' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent */}
      {urgent.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>⚡ {t('tasks.urgent_section')}</div>
          {urgent.map(task => (
            <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px', marginBottom: 8, background: 'var(--red-dim)', borderColor: '#FF446630', cursor: 'pointer' }} onClick={() => setModal({ type: 'edit', data: task })}>
              <div className="checkbox red" onClick={e => { e.stopPropagation(); toggleDone(task) }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>⚡</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>{task.text}</div>
                {(task.due_date || task.amount) && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {task.due_date && `${t('tasks.due')} ${new Date(task.due_date+'T12:00').toLocaleDateString()}`}
                    {task.amount && ` · ${task.amount}€`}
                  </div>
                )}
              </div>
              {task.family_members && <Avatar member={task.family_members} size={26} />}
            </div>
          ))}
        </>
      )}

      {/* Normal pending */}
      {normal.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, marginTop: urgent.length ? 16 : 0 }}>{t('tasks.pending')}</div>
          {normal.map(task => (
            <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px', marginBottom: 8, cursor: 'pointer' }} onClick={() => setModal({ type: 'edit', data: task })}>
              <div className="checkbox" onClick={e => { e.stopPropagation(); toggleDone(task) }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{task.text}</div>
                {(task.due_date || task.amount) && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {task.due_date && `${t('tasks.due')} ${new Date(task.due_date+'T12:00').toLocaleDateString()}`}
                    {task.amount && ` · ${task.amount}€`}
                  </div>
                )}
              </div>
              {task.family_members && <Avatar member={task.family_members} size={26} />}
            </div>
          ))}
        </>
      )}

      {/* Done */}
      {visibleDone.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, marginTop: 16 }}>{t('tasks.done')} ✓</div>
          {visibleDone.map(task => (
            <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px', marginBottom: 6, opacity: .5, cursor: 'pointer' }} onClick={() => setModal({ type: 'edit', data: task })}>
              <div className="checkbox teal" onClick={e => { e.stopPropagation(); toggleDone(task) }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
              </div>
              <div style={{ flex: 1, fontSize: 13, textDecoration: 'line-through', color: 'var(--muted)' }}>{task.text}</div>
              {task.family_members && <Avatar member={task.family_members} size={22} />}
            </div>
          ))}
        </>
      )}

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t('tasks.empty_title')}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('tasks.empty_desc')}</div>
        </div>
      )}

      {/* Members filter bar — fixed just above BottomNav */}
      {members.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 62,
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          padding: '8px 16px',
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            <div
              onClick={() => setFilterMember(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 20, cursor: 'pointer', flexShrink: 0,
                background: filterMember === null ? 'var(--accent-dim)' : 'var(--surface)',
                border: `1.5px solid ${filterMember === null ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 20 }}>👨‍👩‍👧</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: filterMember === null ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap' }}>{t('common.all_family')}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pending.length}</div>
              </div>
            </div>
            {members.map(m => {
              const count = pending.filter(tk => tk.assigned_to === m.id).length
              const isSelected = filterMember === m.id
              return (
                <div
                  key={m.id}
                  onClick={() => setFilterMember(isSelected ? null : m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 20, cursor: 'pointer', flexShrink: 0,
                    background: isSelected ? (m.avatar_color + '22') : 'var(--surface)',
                    border: `1.5px solid ${isSelected ? m.avatar_color : 'var(--border)'}`,
                    transition: 'all .15s',
                  }}
                >
                  <Avatar member={m} size={24} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? m.avatar_color : 'var(--text)', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{count}</div>
                  </div>
                </div>
              )
            })}
          </div>
          {filterMember && (
            <button
              className="btn-ghost"
              onClick={() => setModal({ type: 'add', defaultMember: filterMember })}
              style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 13 }}
            >
              + {t('tasks.new')} → {members.find(m => m.id === filterMember)?.name}
            </button>
          )}
        </div>
      )}

      {modal && (
        <TaskModal
          existing={modal.type === 'edit' ? modal.data : null}
          defaultMember={modal.defaultMember || null}
          familyId={family.id} members={members} sessionUserId={session.user.id}
          onSaved={load} onDeleted={load} onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

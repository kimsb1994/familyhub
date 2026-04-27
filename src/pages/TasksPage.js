// src/pages/TasksPage.js
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Avatar, PageHeader, Spinner } from '../components/ui'
import { useTranslation } from '../lib/i18n'
import { DAYS_SHORT, DAYS_FULL, getWeekStart } from '../lib/constants'

// ── Task modal ────────────────────────────────────────────────────────────────
function TaskModal({ existing, existingMonthly, defaultDay, weekStart, familyId, members, sessionUserId, onSaved, onDeleted, onClose }) {
  const { t } = useTranslation()
  const isEdit = !!(existing || existingMonthly)

  const [frequency,  setFrequency]  = useState(existingMonthly ? 'monthly' : 'weekly')
  const [text,       setText]       = useState(existing?.text || existingMonthly?.text || '')
  const [dayOfWeek,  setDayOfWeek]  = useState(existing?.day_of_week || defaultDay || DAYS_FULL[0])
  const [dayOfMonth, setDayOfMonth] = useState(existingMonthly?.day_of_month || new Date().getDate())
  const [assignedTo, setAssignedTo] = useState(existing?.assigned_to || existingMonthly?.assigned_to || '')
  const [isUrgent,   setIsUrgent]   = useState(existing?.is_urgent || existingMonthly?.is_urgent || false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  async function save() {
    if (!text.trim()) return
    setSaving(true); setError('')
    if (frequency === 'monthly') {
      const payload = { family_id: familyId, text: text.trim(), day_of_month: parseInt(dayOfMonth), assigned_to: assignedTo || null, is_urgent: isUrgent, is_active: true }
      const { error: e } = existingMonthly
        ? await supabase.from('monthly_tasks').update(payload).eq('id', existingMonthly.id)
        : await supabase.from('monthly_tasks').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const payload = { family_id: familyId, text: text.trim(), is_urgent: isUrgent, assigned_to: assignedTo || null, day_of_week: dayOfWeek, week_start: weekStart, is_done: false, created_by: sessionUserId }
      const { error: e } = existing
        ? await supabase.from('tasks').update(payload).eq('id', existing.id)
        : await supabase.from('tasks').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    onSaved(); onClose()
  }

  async function del() {
    existingMonthly
      ? await supabase.from('monthly_tasks').delete().eq('id', existingMonthly.id)
      : await supabase.from('tasks').delete().eq('id', existing.id)
    onDeleted(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>
            {isEdit ? t('tasks.edit_task') : t('tasks.new_task')}
          </h3>
          {isEdit && <button className="btn-icon" onClick={del} style={{ color: 'var(--red)' }}>🗑</button>}
        </div>

        {/* Frequency toggle – only when creating */}
        {!isEdit ? (
          <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: 'var(--surface)', borderRadius: 10, padding: 3 }}>
            {[['weekly', `📅 ${t('tasks.freq_weekly')}`], ['monthly', `🔄 ${t('tasks.freq_monthly')}`]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFrequency(val)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: frequency === val ? 'var(--accent)' : 'transparent', color: frequency === val ? '#fff' : 'var(--muted)', transition: 'all .15s' }}
              >{label}</button>
            ))}
          </div>
        ) : existingMonthly ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent-dim)', borderRadius: 8, padding: '4px 10px', marginBottom: 14, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
            🔄 {t('tasks.monthly_badge')}
          </div>
        ) : null}

        {/* Day selector – weekly */}
        {frequency === 'weekly' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{t('tasks.day')}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {DAYS_FULL.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDayOfWeek(d)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                    background: dayOfWeek === d ? 'var(--accent)' : 'var(--border)',
                    color: dayOfWeek === d ? '#fff' : 'var(--muted)',
                    transition: 'all .15s',
                  }}
                >
                  {DAYS_SHORT[i]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day-of-month selector – monthly */}
        {frequency === 'monthly' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{t('tasks.day_of_month')}</div>
            <input className="inp" type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} style={{ width: 100 }} />
          </div>
        )}

        {/* Task text */}
        <div style={{ marginBottom: 12 }}>
          <input className="inp" placeholder={t('tasks.task_desc')} value={text} onChange={e => setText(e.target.value)} autoFocus />
        </div>

        {/* Assignee */}
        {members.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{t('tasks.assigned')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div
                onClick={() => setAssignedTo('')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
                  background: !assignedTo ? 'var(--accent-dim)' : 'var(--surface)',
                  border: `1.5px solid ${!assignedTo ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 20 }}>👥</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: !assignedTo ? 'var(--accent)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{t('common.all_family')}</span>
              </div>
              {members.map(m => (
                <div
                  key={m.id}
                  onClick={() => setAssignedTo(m.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
                    background: assignedTo === m.id ? m.avatar_color + '22' : 'var(--surface)',
                    border: `1.5px solid ${assignedTo === m.id ? m.avatar_color : 'var(--border)'}`,
                    transition: 'all .15s',
                  }}
                >
                  <Avatar member={m} size={28} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: assignedTo === m.id ? m.avatar_color : 'var(--muted)', whiteSpace: 'nowrap' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Urgent */}
        <div
          onClick={() => setIsUrgent(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--red-dim)', border: '1px solid #FF446630', cursor: 'pointer', marginBottom: 14 }}
        >
          <div className={`checkbox ${isUrgent ? 'red' : ''}`}>
            {isUrgent && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>⚡ {t('tasks.urgent_label')}</span>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !text.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : isEdit ? `💾 ${t('common.save')}` : t('tasks.create')}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Tasks Page ───────────────────────────────────────────────────────────
export default function TasksPage({ members }) {
  const { family, session } = useAuth()
  const { t } = useTranslation()
  const [tasks,              setTasks]              = useState([])
  const [monthlyTasks,       setMonthlyTasks]       = useState([])
  const [monthlyCompletions, setMonthlyCompletions] = useState([])
  const [modal,              setModal]              = useState(null)
  const [loading,            setLoading]            = useState(true)
  const [activeDay,          setActiveDay]          = useState(
    DAYS_FULL[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  )

  const weekStart = getWeekStart()

  const currentYearMonth = useMemo(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d
  }), [weekStart])

  const load = useCallback(async () => {
    if (!family) return
    const [weeklyRes, monthlyRes, completionsRes] = await Promise.all([
      supabase.from('tasks').select('*, family_members(name,avatar_color)').eq('family_id', family.id).eq('week_start', weekStart).order('created_at'),
      supabase.from('monthly_tasks').select('*, family_members(name,avatar_color)').eq('family_id', family.id).eq('is_active', true),
      supabase.from('monthly_task_completions').select('*').eq('year_month', currentYearMonth),
    ])
    const myIds = new Set((monthlyRes.data || []).map(t => t.id))
    setTasks(weeklyRes.data || [])
    setMonthlyTasks(monthlyRes.data || [])
    setMonthlyCompletions((completionsRes.data || []).filter(c => myIds.has(c.task_id)))
    setLoading(false)
  }, [family, weekStart, currentYearMonth])

  useEffect(() => {
    load()
    if (!family) return
    const ch = supabase.channel('tasks-weekly-mobile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',                    filter: `family_id=eq.${family.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_tasks',             filter: `family_id=eq.${family.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_task_completions'                                       }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, family])

  const monthlyThisWeek = useMemo(() =>
    monthlyTasks.flatMap(mt => {
      for (let i = 0; i < 7; i++) {
        if (weekDates[i].getDate() === mt.day_of_month) {
          const completion = monthlyCompletions.find(c => c.task_id === mt.id)
          return [{ ...mt, id: `monthly_${mt.id}`, _realId: mt.id, _template: mt, _isMonthly: true, _completionId: completion?.id || null, is_done: !!completion, day_of_week: DAYS_FULL[i] }]
        }
      }
      return []
    }), [monthlyTasks, monthlyCompletions, weekDates])

  async function toggleDone(task) {
    if (task._isMonthly) {
      task._completionId
        ? await supabase.from('monthly_task_completions').delete().eq('id', task._completionId)
        : await supabase.from('monthly_task_completions').insert({ task_id: task._realId, year_month: currentYearMonth })
      load()
    } else {
      await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
      setTasks(p => p.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
    }
  }

  function getTasksForDay(day) {
    const weekly  = tasks.filter(t => t.day_of_week === day)
    const monthly = monthlyThisWeek.filter(t => t.day_of_week === day)
    return [...weekly, ...monthly]
  }

  const activeTasks = getTasksForDay(activeDay)
  const allTasksThisWeek = [...tasks, ...monthlyThisWeek]
  const totalWeek = allTasksThisWeek.length
  const doneWeek  = allTasksThisWeek.filter(t => t.is_done).length

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: '20px 16px 24px' }} className="fu">
      <PageHeader
        title={t('tasks.title')} accent={t('tasks.accent')}
        action={
          <button className="btn-primary" onClick={() => setModal({ type: 'add' })} style={{ fontSize: 12, padding: '9px 14px' }}>
            {t('tasks.new')}
          </button>
        }
      />

      {/* Week progress */}
      {totalWeek > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
            <span>{totalWeek - doneWeek} {t('tasks.pending')}</span>
            <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{doneWeek}/{totalWeek}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2, transition: 'width .4s',
              background: 'linear-gradient(90deg, var(--teal), var(--accent))',
              width: `${Math.round((doneWeek / totalWeek) * 100)}%`,
            }} />
          </div>
        </div>
      )}

      {/* Day pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {DAYS_FULL.map((d, i) => {
          const dayTasks = getTasksForDay(d)
          const pending  = dayTasks.filter(t => !t.is_done).length
          const isActive = d === activeDay
          const dateNum  = weekDates[i].getDate()
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              style={{
                flexShrink: 0, minWidth: 40, padding: '7px 9px', borderRadius: 10,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11, fontWeight: 700, transition: 'all .15s', position: 'relative',
                background: isActive ? 'var(--accent)' : 'var(--card)',
                color: isActive ? '#fff' : 'var(--muted)',
              }}
            >
              {DAYS_SHORT[i]}
              <div style={{ fontSize: 9, opacity: 0.7, lineHeight: 1 }}>{dateNum}</div>
              {pending > 0 && (
                <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? '#fff8' : 'var(--accent)' }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Active day */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontFamily: 'Fraunces, serif', fontWeight: 700, marginBottom: 10 }}>{activeDay}</div>

        {activeTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--dim)', fontSize: 13 }}>
            {t('tasks.empty_day')}
          </div>
        )}

        {activeTasks.map(task => {
          const assignee = task.family_members
          return (
            <div
              key={task.id}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', marginBottom: 8,
                background: task.is_urgent ? 'var(--red-dim)' : task._isMonthly ? '#FF6B3518' : 'var(--card)',
                borderColor: task.is_urgent ? '#FF446630' : task._isMonthly ? '#FF6B3560' : 'var(--border)',
                opacity: task.is_done ? 0.5 : 1,
                cursor: 'pointer',
              }}
              onClick={() => task._isMonthly ? setModal({ type: 'edit', existingMonthly: task._template }) : setModal({ type: 'edit', data: task })}
            >
              <div
                className={`checkbox ${task.is_done ? 'teal' : task.is_urgent ? 'red' : ''}`}
                onClick={e => { e.stopPropagation(); toggleDone(task) }}
              >
                {task.is_done && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                {!task.is_done && task.is_urgent && <span style={{ color: '#fff', fontSize: 10 }}>⚡</span>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  textDecoration: task.is_done ? 'line-through' : 'none',
                  color: task.is_urgent && !task.is_done ? 'var(--red)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {task._isMonthly && <span style={{ fontSize: 11, marginRight: 4 }}>🔄</span>}
                  {task.text}
                </div>
              </div>

              {assignee
                ? <Avatar member={assignee} size={28} />
                : <span style={{ fontSize: 18, opacity: .3 }}>👥</span>}
            </div>
          )
        })}

        <button
          className="btn-ghost"
          onClick={() => setModal({ type: 'add', defaultDay: activeDay })}
          style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginTop: 4 }}
        >
          + {t('tasks.add_to_day')} {activeDay}
        </button>
      </div>

      {/* Week summary */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
        {t('tasks.week_summary')}
      </div>
      {DAYS_FULL.map((d, i) => {
        const dayTasks = getTasksForDay(d)
        const done     = dayTasks.filter(t => t.is_done).length
        const total    = dayTasks.length
        const isAct    = d === activeDay
        return (
          <div
            key={d}
            onClick={() => setActiveDay(d)}
            className="card"
            style={{
              padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
              background: isAct ? 'var(--accent-dim)' : 'var(--card)',
              borderColor: isAct ? '#FF6B3550' : 'var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, fontSize: 10, fontWeight: 700, color: isAct ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>
                {DAYS_SHORT[i]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {total === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>{t('tasks.no_tasks_day')}</div>
                ) : (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {dayTasks.slice(0, 3).map(task => (
                      <span
                        key={task.id}
                        style={{
                          fontSize: 11, fontWeight: 500,
                          color: task.is_done ? 'var(--dim)' : task.is_urgent ? 'var(--red)' : 'var(--text)',
                          textDecoration: task.is_done ? 'line-through' : 'none',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120,
                        }}
                      >
                        {task.is_urgent && '⚡ '}{task._isMonthly && '🔄 '}{task.text}
                      </span>
                    ))}
                    {total > 3 && <span style={{ fontSize: 11, color: 'var(--dim)' }}>+{total - 3}</span>}
                  </div>
                )}
              </div>
              {total > 0 && (
                <div style={{ fontSize: 11, color: done === total ? 'var(--teal)' : 'var(--dim)', fontWeight: 600, flexShrink: 0 }}>
                  {done}/{total}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {modal && (
        <TaskModal
          existing={modal.type === 'edit' && !modal.existingMonthly ? modal.data : null}
          existingMonthly={modal.existingMonthly || null}
          defaultDay={modal.defaultDay || activeDay}
          weekStart={weekStart}
          familyId={family.id}
          members={members}
          sessionUserId={session.user.id}
          onSaved={load}
          onDeleted={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

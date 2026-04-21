// src/pages/MenuPage.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { DAYS_SHORT, DAYS_FULL, MEAL_TYPES, CATEGORIES, getWeekStart, catColor } from '../lib/constants'
import { PageHeader, IngredientList, Spinner } from '../components/ui'

// ── Ingredient form ───────────────────────────────────────────────────────────
function IngredientForm({ ingredients, setIngredients }) {
  const [name, setName] = useState('')
  const [qty,  setQty]  = useState('')
  const [unit, setUnit] = useState('g')
  const [cat,  setCat]  = useState('Verdures')

  const add = () => {
    if (!name.trim()) return
    setIngredients(p => [...p, { name: name.trim(), qty: qty || '1', unit, category: cat, _id: Date.now() }])
    setName(''); setQty('')
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Ingredients</div>
      <div style={{ marginBottom: 8 }}>
        {ingredients.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '8px 0' }}>Cap ingredient afegit</div>
          : ingredients.map((ing, i) => {
              const c = catColor(ing.category)
              return (
                <div key={ing._id || ing.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{ing.name}</span>
                  <span className="chip" style={{ background: c + '20', color: c }}>{ing.qty} {ing.unit}</span>
                  <button className="btn-icon" onClick={() => setIngredients(p => p.filter((_, j) => j !== i))}>✕</button>
                </div>
              )
            })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 58px', gap: 6, marginBottom: 6 }}>
        <input className="inp" placeholder="Nom ingredient" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <input className="inp" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} style={{ textAlign: 'center' }} />
        <input className="inp" placeholder="u." value={unit} onChange={e => setUnit(e.target.value)} style={{ textAlign: 'center' }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select className="inp" value={cat} onChange={e => setCat(e.target.value)} style={{ flex: 1 }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary" type="button" onClick={add} style={{ padding: '9px 16px', flexShrink: 0 }}>+ Afegir</button>
      </div>
    </div>
  )
}

// ── Meal modal (create / edit) ────────────────────────────────────────────────
function MealModal({ day, mealType, existing, familyId, weekStart, onSaved, onDeleted, onClose }) {
  const { session } = useAuth()
  const [name,  setName]  = useState(existing?.name  || '')
  const [emoji, setEmoji] = useState(existing?.emoji || '🍽️')
  const [time,  setTime]  = useState(existing?.time_minutes || '')
  const [diff,  setDiff]  = useState(existing?.difficulty || 'Fàcil')
  const [ings,  setIngs]  = useState(
    existing?.meal_ingredients
      ? existing.meal_ingredients.map((i, idx) => ({ ...i, _id: idx }))
      : []
  )
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState('')

  async function save() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      let mealId = existing?.id
      if (existing) {
        // Update meal
        await supabase.from('meals').update({ name: name.trim(), emoji, time_minutes: time, difficulty: diff }).eq('id', existing.id)
        // Replace ingredients
        await supabase.from('meal_ingredients').delete().eq('meal_id', existing.id)
      } else {
        // Insert meal
        const { data, error: mealErr } = await supabase.from('meals').insert({
          family_id: familyId, name: name.trim(), emoji, time_minutes: time, difficulty: diff,
          meal_type: mealType, day_of_week: day, week_start: weekStart,
          created_by: session.user.id
        }).select().single()
        if (mealErr) throw mealErr
        mealId = data.id
      }
      // Insert ingredients
      if (ings.length > 0) {
        await supabase.from('meal_ingredients').insert(
          ings.map(({ name, qty, unit, category }) => ({ meal_id: mealId, name, qty, unit, category }))
        )
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteMeal() {
    if (!existing) return
    setDeleting(true)
    await supabase.from('meals').delete().eq('id', existing.id)
    onDeleted()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>
            {existing ? 'Editar' : 'Nou'} {mealType} · {day}
          </h3>
          {existing && (
            <button className="btn-icon" onClick={deleteMeal} disabled={deleting} style={{ color: 'var(--red)' }}>
              {deleting ? '...' : '🗑'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input className="inp" style={{ width: 52, textAlign: 'center', fontSize: 22, padding: '7px 4px', flexShrink: 0 }} value={emoji} onChange={e => setEmoji(e.target.value)} />
          <input className="inp" placeholder="Nom del plat..." value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Temps</div>
            <input className="inp" placeholder="30 min" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Dificultat</div>
            <select className="inp" value={diff} onChange={e => setDiff(e.target.value)}>
              {['Fàcil', 'Mitjana', 'Difícil'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <IngredientForm ingredients={ings} setIngredients={setIngs} />

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? '💾 Guardar' : '✓ Crear plat'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

// ── Meal detail (view) ────────────────────────────────────────────────────────
function MealDetail({ meal, day, onEdit, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ fontSize: 44 }}>{meal.emoji || '🍽️'}</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{meal.name}</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {meal.time_minutes && <span className="chip" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>⏱ {meal.time_minutes}</span>}
              {meal.difficulty && (
                <span className="chip" style={{
                  background: meal.difficulty === 'Fàcil' ? 'var(--teal-dim)' : meal.difficulty === 'Difícil' ? 'var(--red-dim)' : 'var(--yellow-dim)',
                  color: meal.difficulty === 'Fàcil' ? 'var(--teal)' : meal.difficulty === 'Difícil' ? 'var(--red)' : 'var(--yellow)'
                }}>{meal.difficulty}</span>
              )}
              <span className="chip" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>{day}</span>
            </div>
          </div>
        </div>

        {meal.meal_ingredients?.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              Ingredients · 3 persones
            </div>
            <IngredientList ingredients={meal.meal_ingredients} />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn-primary" onClick={onEdit} style={{ flex: 1, justifyContent: 'center' }}>✎ Editar plat</button>
          <button className="btn-ghost" onClick={onClose}>Tancar</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Menu Page ────────────────────────────────────────────────────────────
export default function MenuPage() {
  const { family } = useAuth()
  const [meals,     setMeals]     = useState([])
  const [activeDay, setActiveDay] = useState(DAYS_FULL[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1])
  const [modal,     setModal]     = useState(null)
  const [loading,   setLoading]   = useState(true)

  const weekStart = getWeekStart()

  const load = useCallback(async () => {
    if (!family) return
    const { data } = await supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .eq('family_id', family.id)
      .eq('week_start', weekStart)
    setMeals(data || [])
    setLoading(false)
  }, [family, weekStart])

  useEffect(() => {
    load()
    if (!family) return
    const ch = supabase.channel('meals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `family_id=eq.${family.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_ingredients' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, family])

  function getMeal(day, type) {
    return meals.find(m => m.day_of_week === day && m.meal_type === type)
  }

  const mealsCount = meals.length

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: '20px 16px' }} className="fu">
      <PageHeader title="Menú" accent="Setmanal" subtitle={`${mealsCount} plats planificats`} />

      {/* Day pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {DAYS_FULL.map((d, i) => {
          const filled = [getMeal(d, 'Dinar'), getMeal(d, 'Sopar')].filter(Boolean).length
          return (
            <button key={d} onClick={() => setActiveDay(d)} style={{
              flexShrink: 0, minWidth: 40, padding: '7px 9px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeDay === d ? 'var(--accent)' : 'var(--card)',
              color: activeDay === d ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 700, transition: 'all .15s', position: 'relative',
            }}>
              {DAYS_SHORT[i]}
              {filled > 0 && (
                <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2 }}>
                  {[...Array(filled)].map((_, j) => <div key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: activeDay === d ? '#fff8' : 'var(--teal)' }} />)}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Active day slots */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontFamily: 'Fraunces, serif', fontWeight: 700, marginBottom: 10 }}>{activeDay}</div>
        {MEAL_TYPES.map(meal => {
          const data = getMeal(activeDay, meal)
          return (
            <div key={meal} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                {meal === 'Dinar' ? '☀️' : '🌙'} {meal}
              </div>
              {data ? (
                <>
                  <div className="meal-slot filled" onClick={() => setModal({ type: 'view', day: activeDay, mealType: meal, data })}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{data.emoji || '🍽️'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                        {data.time_minutes && <span>{data.time_minutes}</span>}
                        {data.difficulty && <span style={{ color: data.difficulty === 'Fàcil' ? 'var(--teal)' : data.difficulty === 'Difícil' ? 'var(--red)' : 'var(--yellow)' }}>{data.difficulty}</span>}
                        {data.meal_ingredients?.length > 0 && <span>{data.meal_ingredients.length} ing.</span>}
                      </div>
                    </div>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); setModal({ type: 'edit', day: activeDay, mealType: meal, data }) }}>✎</button>
                  </div>
                  {data.meal_ingredients?.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {data.meal_ingredients.slice(0, 4).map((ing, i) => {
                        const c = catColor(ing.category)
                        return <span key={i} className="chip" style={{ background: c + '18', color: c }}>{ing.name}</span>
                      })}
                      {data.meal_ingredients.length > 4 && <span className="chip" style={{ background: 'var(--border)', color: 'var(--muted)' }}>+{data.meal_ingredients.length - 4} més</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="meal-slot empty" onClick={() => setModal({ type: 'add', day: activeDay, mealType: meal })} style={{ justifyContent: 'center', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 20, opacity: .35 }}>+</span>
                  <span style={{ fontSize: 10, color: 'var(--dim)' }}>Toca per afegir {meal.toLowerCase()}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Week summary */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Resum setmana</div>
      {DAYS_FULL.map((d, i) => {
        const dn = getMeal(d, 'Dinar'), sp = getMeal(d, 'Sopar'), isAct = d === activeDay
        return (
          <div key={d} className="card" onClick={() => setActiveDay(d)} style={{ padding: '10px 14px', marginBottom: 6, cursor: 'pointer', borderColor: isAct ? '#FF6B3550' : 'var(--border)', background: isAct ? 'var(--accent-dim)' : 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, fontSize: 10, fontWeight: 700, color: isAct ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>{DAYS_SHORT[i].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {dn ? <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', gap: 5, alignItems: 'center' }}><span>{dn.emoji}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dn.name}</span></div>
                    : <div style={{ fontSize: 11, color: 'var(--dim)' }}>☀️ Dinar pendent</div>}
                {sp ? <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}><span>{sp.emoji}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</span></div>
                    : <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>🌙 Sopar pendent</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>{[dn, sp].filter(Boolean).length}/2</div>
            </div>
          </div>
        )
      })}

      {/* Modals */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <MealModal
          day={modal.day} mealType={modal.mealType}
          existing={modal.type === 'edit' ? modal.data : null}
          familyId={family.id} weekStart={weekStart}
          onSaved={load} onDeleted={load} onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'view' && (
        <MealDetail
          meal={modal.data} day={modal.day}
          onEdit={() => setModal({ ...modal, type: 'edit' })}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

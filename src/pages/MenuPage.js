// src/pages/MenuPage.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { DAYS_SHORT, DAYS_FULL, MEAL_TYPES, CATEGORIES, getWeekStart, catColor } from '../lib/constants'
import { PageHeader, IngredientList, Spinner } from '../components/ui'
import QuickAddModal from '../components/QuickAddModal'
import { useTranslation } from '../lib/i18n'

// ── Ingredient form ───────────────────────────────────────────────────────────
function IngredientForm({ ingredients, setIngredients }) {
  const { t } = useTranslation()
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
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{t('menu.ingredients_for')}</div>
      <div style={{ marginBottom: 8 }}>
        {ingredients.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '8px 0' }}>{t('menu.no_ingredients')}</div>
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
        <input className="inp" placeholder={t('menu.ingredient_name')} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <input className="inp" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} style={{ textAlign: 'center' }} />
        <input className="inp" placeholder="u." value={unit} onChange={e => setUnit(e.target.value)} style={{ textAlign: 'center' }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select className="inp" value={cat} onChange={e => setCat(e.target.value)} style={{ flex: 1 }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary" type="button" onClick={add} style={{ padding: '9px 16px', flexShrink: 0 }}>+ {t('common.add')}</button>
      </div>
    </div>
  )
}

// ── Dish picker modal ─────────────────────────────────────────────────────────
function DishPickerModal({ day, mealType, familyId, weekStart, memberId, onSaved, onClose }) {
  const { session } = useAuth()
  const { t } = useTranslation()
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
        meal_type: mealType, day_of_week: day, week_start: weekStart,
        member_id: memberId || null,
        created_by: session.user.id,
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
      <MealModal
        day={day} mealType={mealType}
        familyId={familyId} weekStart={weekStart}
        memberId={memberId}
        saveToLibrary
        onSaved={onSaved} onDeleted={onSaved} onClose={onClose}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
            {mealType === 'Dinar' ? '☀️' : '🌙'} {mealType} · {day}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('menu.pick_dish')}</div>
        </div>

        <input
          className="inp"
          placeholder={t('menu.search_dish')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 10 }}
          autoFocus
        />

        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
              <Spinner size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--dim)', fontSize: 13 }}>
              {search ? t('menu.no_results') : t('menu.no_dishes_yet')}
            </div>
          ) : (
            filtered.map(dish => (
              <div
                key={dish.id}
                onClick={() => !saving && selectDish(dish)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 13px', borderRadius: 12,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  marginBottom: 8, cursor: saving ? 'default' : 'pointer',
                  opacity: saving && saving !== dish.id ? 0.4 : 1,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>{dish.emoji || '🍽️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dish.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                    {dish.time_minutes && <span>⏱ {dish.time_minutes}</span>}
                    {dish.difficulty && <span>{dish.difficulty}</span>}
                    {dish.dish_ingredients?.length > 0 && <span>{dish.dish_ingredients.length} ing.</span>}
                  </div>
                </div>
                {saving === dish.id
                  ? <Spinner size={18} />
                  : <span style={{ color: 'var(--accent)', fontSize: 18 }}>→</span>}
              </div>
            ))
          )}
        </div>

        <button
          className="btn-primary"
          onClick={() => setCreating(true)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          ✨ {t('menu.create_new_dish')}
        </button>
      </div>
    </div>
  )
}

// ── Meal modal (create / edit) ────────────────────────────────────────────────
function MealModal({ day, mealType, existing, familyId, weekStart, memberId, saveToLibrary, onSaved, onDeleted, onClose }) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const [name,  setName]  = useState(existing?.name  || '')
  const [emoji, setEmoji] = useState(existing?.emoji || '🍽️')
  const [time,  setTime]  = useState(existing?.time_minutes || '')
  const [diff,  setDiff]  = useState(existing?.difficulty || 'Fàcil')
  const [ings,  setIngs]  = useState(
    existing?.meal_ingredients
      ? existing.meal_ingredients.map((i, idx) => ({ ...i, _id: idx }))
      : []
  )
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [error,       setError]       = useState('')
  const [showIngPicker, setShowIngPicker] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      let mealId = existing?.id
      if (existing) {
        await supabase.from('meals').update({ name: name.trim(), emoji, time_minutes: time, difficulty: diff }).eq('id', existing.id)
        await supabase.from('meal_ingredients').delete().eq('meal_id', existing.id)
      } else {
        const { data, error: mealErr } = await supabase.from('meals').insert({
          family_id: familyId, name: name.trim(), emoji, time_minutes: time, difficulty: diff,
          meal_type: mealType, day_of_week: day, week_start: weekStart,
          member_id: memberId || null,
          created_by: session.user.id,
        }).select().single()
        if (mealErr) throw mealErr
        mealId = data.id

        // Save to dishes library when creating new
        if (saveToLibrary) {
          const { data: dish } = await supabase.from('dishes').insert({
            family_id: familyId, name: name.trim(), emoji, time_minutes: time, difficulty: diff,
          }).select().single()
          if (dish && ings.length > 0) {
            await supabase.from('dish_ingredients').insert(
              ings.map(({ name, qty, unit, category }) => ({ dish_id: dish.id, name, qty, unit, category }))
            )
          }
        }
      }
      if (ings.length > 0) {
        await supabase.from('meal_ingredients').insert(
          ings.map(({ name, qty, unit, category }) => ({ meal_id: mealId, name, qty, unit, category }))
        )
      }
      onSaved(); onClose()
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
    onDeleted(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700 }}>
            {existing ? t('menu.edit_meal') : t('menu.new_meal')} · {day}
          </h3>
          {existing && (
            <button className="btn-icon" onClick={deleteMeal} disabled={deleting} style={{ color: 'var(--red)' }}>
              {deleting ? '...' : '🗑'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input className="inp" style={{ width: 52, textAlign: 'center', fontSize: 22, padding: '7px 4px', flexShrink: 0 }} value={emoji} onChange={e => setEmoji(e.target.value)} />
          <input className="inp" placeholder={t('menu.meal_name')} value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
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

        <button
          className="btn-ghost"
          type="button"
          onClick={() => setShowIngPicker(true)}
          style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }}
        >
          🛒 Escull ingredients del catàleg
        </button>

        {showIngPicker && (
          <QuickAddModal
            existingNames={ings.map(i => i.name)}
            onAddIngredient={(name, category) =>
              setIngs(p => [...p, { name, qty: '1', unit: 'u.', category, _id: Date.now() }])
            }
            onClose={() => setShowIngPicker(false)}
          />
        )}

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? <Spinner size={16} color="#fff" /> : existing ? `💾 ${t('common.save')}` : `✓ ${t('common.add')}`}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Meal detail (view) ────────────────────────────────────────────────────────
function MealDetail({ meal, day, onEdit, onClose }) {
  const { t } = useTranslation()
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
          <button className="btn-primary" onClick={onEdit} style={{ flex: 1, justifyContent: 'center' }}>✎ {t('menu.edit_meal')}</button>
          <button className="btn-ghost" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Menu Page ────────────────────────────────────────────────────────────
export default function MenuPage() {
  const { family, members } = useAuth()
  const { t } = useTranslation()
  const [meals,          setMeals]          = useState([])
  const [activeDay,      setActiveDay]      = useState(DAYS_FULL[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1])
  const [modal,          setModal]          = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [selectedMember, setSelectedMember] = useState(null) // null = menú familiar

  const weekStart = getWeekStart()

  const load = useCallback(async () => {
    if (!family) return
    let query = supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .eq('family_id', family.id)
      .eq('week_start', weekStart)
    if (selectedMember) {
      query = query.eq('member_id', selectedMember.id)
    } else {
      query = query.is('member_id', null)
    }
    const { data } = await query
    setMeals(data || [])
    setLoading(false)
  }, [family, weekStart, selectedMember])

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
      <PageHeader title={t('menu.title')} accent={t('menu.accent')} subtitle={`${mealsCount} plats`} />

      {/* Member selector */}
      {members.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            onClick={() => setSelectedMember(null)}
            style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: !selectedMember ? 'var(--accent)' : 'var(--card)',
              color: !selectedMember ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .15s',
            }}
          >
            👨‍👩‍👧 Família
          </button>
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m)}
              style={{
                flexShrink: 0, padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: selectedMember?.id === m.id ? m.avatar_color : 'var(--card)',
                color: selectedMember?.id === m.id ? '#fff' : 'var(--muted)',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .15s',
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

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
                <div className="meal-slot empty" onClick={() => setModal({ type: 'pick', day: activeDay, mealType: meal })} style={{ justifyContent: 'center', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 20, opacity: .35 }}>+</span>
                  <span style={{ fontSize: 10, color: 'var(--dim)' }}>{t('menu.new_day')}</span>
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
                    : <div style={{ fontSize: 11, color: 'var(--dim)' }}>☀️ {t('menu.lunch')}</div>}
                {sp ? <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}><span>{sp.emoji}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</span></div>
                    : <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>🌙 {t('menu.dinner')}</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>{[dn, sp].filter(Boolean).length}/2</div>
            </div>
          </div>
        )
      })}

      {/* Modals */}
      {modal?.type === 'pick' && (
        <DishPickerModal
          day={modal.day} mealType={modal.mealType}
          familyId={family.id} weekStart={weekStart}
          memberId={selectedMember?.id || null}
          onSaved={load} onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <MealModal
          day={modal.day} mealType={modal.mealType}
          existing={modal.data}
          familyId={family.id} weekStart={weekStart}
          memberId={selectedMember?.id || null}
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

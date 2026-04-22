// src/pages/ShoppingPage.js
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { CATEGORIES, getWeekStart, catColor, mergeIngredients, groupBy } from '../lib/constants'
import { CatDot, PageHeader, Spinner } from '../components/ui'
import QuickAddModal from '../components/QuickAddModal'
import { useTranslation } from '../lib/i18n'

export default function ShoppingPage({ onNavigate }) {
  const { family, session } = useAuth()
  const { t } = useTranslation()
  const [meals,        setMeals]        = useState([])
  const [manualItems,  setManualItems]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [newName,      setNewName]      = useState('')
  const [newQty,       setNewQty]       = useState('')
  const [newUnit,      setNewUnit]      = useState('u.')
  const [newCat,       setNewCat]       = useState('Altres')
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const weekStart = getWeekStart()

  const load = useCallback(async () => {
    if (!family) return
    const [mealsRes, shopRes] = await Promise.all([
      supabase.from('meals').select('*, meal_ingredients(*)').eq('family_id', family.id).eq('week_start', weekStart),
      supabase.from('shopping_items').select('*').eq('family_id', family.id).eq('week_start', weekStart),
    ])
    setMeals(mealsRes.data || [])
    setManualItems(shopRes.data || [])
    setLoading(false)
  }, [family, weekStart])

  useEffect(() => {
    load()
    if (!family) return
    const ch = supabase.channel('shopping')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `family_id=eq.${family.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_ingredients' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load, family])

  async function toggleManual(item) {
    await supabase.from('shopping_items').update({ is_checked: !item.is_checked }).eq('id', item.id)
    setManualItems(p => p.map(i => i.id === item.id ? { ...i, is_checked: !i.is_checked } : i))
  }

  async function deleteManual(id) {
    await supabase.from('shopping_items').delete().eq('id', id)
    setManualItems(p => p.filter(i => i.id !== id))
  }

  async function addManual() {
    if (!newName.trim()) return
    const item = { family_id: family.id, name: newName.trim(), qty: newQty || '1', unit: newUnit, category: newCat, week_start: weekStart, created_by: session.user.id }
    const { data } = await supabase.from('shopping_items').insert(item).select().single()
    if (data) setManualItems(p => [...p, data])
    setNewName(''); setNewQty(''); setShowAddForm(false)
  }

  // Merge auto-ingredients from meals
  const [checkedAI, setCheckedAI] = useState({})
  const aiIngredients = mergeIngredients(meals).map(ing => ({
    ...ing,
    _isAI: true,
    is_checked: !!checkedAI[ing.name.toLowerCase()],
  }))

  const allItems = [
    ...aiIngredients,
    ...manualItems.map(i => ({ ...i, _isAI: false })),
  ]
  const grouped  = groupBy(allItems, 'category')
  const total    = allItems.length
  const done     = allItems.filter(i => i.is_checked || checkedAI[i.name?.toLowerCase()]).length

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>

  return (
    <div style={{ padding: '20px 16px' }} className="fu">
      <PageHeader
        title={t('shopping.title')} accent={t('shopping.accent')}
        subtitle={meals.length > 0 ? `${meals.length} ${t('shopping.n_dishes')}` : ''}
        action={meals.length === 0 ? (
          <button className="btn-primary" onClick={() => onNavigate('menu')} style={{ fontSize: 12, padding: '9px 14px' }}>🍽️ {t('nav.menu')}</button>
        ) : null}
      />

      {/* Progress */}
      {total > 0 && (
        <div className="card" style={{ padding: '13px 15px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t('shopping.progress')}</span>
            <span style={{ fontSize: 14, color: 'var(--teal)', fontWeight: 700, fontFamily: 'Fraunces, serif' }}>{done}/{total}</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,var(--teal),var(--accent))', width: `${total ? (done / total) * 100 : 0}%`, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
            {total - done} {t('shopping.pending')} · {aiIngredients.length} {t('shopping.from_menu')} · {manualItems.length} {t('shopping.manual_items')}
          </div>
        </div>
      )}

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn-primary" onClick={() => setShowQuickAdd(true)} style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>
          {t('shopping.add_products')}
        </button>
        <button className="btn-ghost" onClick={() => setShowAddForm(p => !p)} style={{ fontSize: 13, padding: '9px 14px' }}>
          {t('shopping.manual')}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px', gap: 6, marginBottom: 6 }}>
            <input className="inp" placeholder={t('shopping.product_name')} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManual()} />
            <input className="inp" placeholder="Qty" value={newQty} onChange={e => setNewQty(e.target.value)} style={{ textAlign: 'center' }} />
            <input className="inp" placeholder="u." value={newUnit} onChange={e => setNewUnit(e.target.value)} style={{ textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="inp" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ flex: 1 }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button className="btn-primary" onClick={addManual} disabled={!newName.trim()} style={{ padding: '9px 16px', flexShrink: 0 }}>{t('common.add')}</button>
          </div>
        </div>
      )}

      {showQuickAdd && (
        <QuickAddModal
          familyId={family.id}
          weekStart={weekStart}
          sessionUserId={session?.user?.id}
          existingNames={allItems.map(i => i.name)}
          onAdded={load}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {/* Empty */}
      {total === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t('shopping.empty_title')}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('shopping.empty_desc')}</div>
        </div>
      )}

      {/* Grouped items */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, padding: '0 3px' }}>
            <CatDot cat={cat} />
            <span style={{ fontSize: 10, fontWeight: 700, color: catColor(cat), textTransform: 'uppercase', letterSpacing: '.07em' }}>{cat}</span>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>({items.length})</span>
          </div>
          <div className="card" style={{ padding: '3px 0', overflow: 'hidden' }}>
            {items.map((item, i) => {
              const isDone  = item._isAI ? !!checkedAI[item.name.toLowerCase()] : item.is_checked
              const toggle  = () => {
                if (item._isAI) setCheckedAI(p => ({ ...p, [item.name.toLowerCase()]: !p[item.name.toLowerCase()] }))
                else toggleManual(item)
              }
              return (
                <div key={i} className="shop-row" onClick={toggle}>
                  <div className={`checkbox ${isDone ? 'teal' : ''}`} style={{ flexShrink: 0 }}>
                    {isDone && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--dim)' : 'var(--text)' }}>
                      {item.name}
                    </span>
                    {item.mealNames?.length > 1 && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>×{item.mealNames.length} {t('shopping.n_dishes')}</span>}
                    {!item._isAI && <span className="tag" style={{ background: 'var(--purple-dim)', color: 'var(--purple)', marginLeft: 6 }}>{t('shopping.manual_tag')}</span>}
                  </div>
                  <span style={{ fontSize: 13, color: isDone ? 'var(--dim)' : 'var(--muted)', fontWeight: 500 }}>{item.qty} {item.unit}</span>
                  {!item._isAI && (
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); deleteManual(item.id) }}>✕</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

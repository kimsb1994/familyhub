// src/components/QuickAddModal.js
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { catColor } from '../lib/constants'
import { useTranslation } from '../lib/i18n'

const QUICK_PRODUCTS = {
  'Verdures': [
    'Tomàquets','Ceba','All','Pebrot vermell','Pebrot verd','Pastanaga',
    'Enciam','Espinacs','Carbassó','Albergínia','Bròquil','Coliflor',
    'Mongeta verda','Patates','Porro','Cogombre','Remolatxa','Api',
    'Xampinyons','Espàrrecs','Pebrots del piquillo','Ceba tendra',
  ],
  'Fruita': [
    'Pomes','Peres','Plàtans','Taronges','Maduixes','Raïm',
    'Meló','Síndria','Préssecs','Mandarines','Llimones','Kiwi',
    'Mango','Pinya','Cireres','Prunes','Nectarines','Figues',
  ],
  'Carn/Peix': [
    'Pit de pollastre','Cuixes de pollastre','Carn picada de vedella',
    'Llom de porc','Bistec de vedella','Costelles','Botifarra',
    'Salmó','Lluç','Gambes','Tonyina fresca','Bacallà','Rap',
    'Musclos','Calamars','Pernil dolç','Pernil salat','Fuet','Llonganissa',
  ],
  'Làctics': [
    'Llet sencera','Llet semi','Iogurts naturals','Iogurts fruita',
    'Mantequilla','Formatge tallat','Mozzarella','Formatge feta',
    'Nata per cuinar','Nata muntada','Ous','Formatge ratllat',
    'Formatge fresc','Quark',
  ],
  'Pasta/Arròs': [
    'Arròs rodó','Arròs llarg','Espaguetis','Macarrons','Penne',
    'Tallarines','Lasanya','Fideus','Cuscús','Quinoa','Orzo',
  ],
  'Llegums': [
    'Cigrons cuits','Llenties cuites','Mongetes blanques','Mongetes negres',
    'Faves','Pèsols congelats','Edamame','Soja texturitzada',
  ],
  'Pa/Farina': [
    'Pa de pagès','Pa de motlle','Baguette','Pa integral',
    'Farina de blat','Farina integral','Galetes','Torrades',
    'Croissants','Panets','Biscotes',
  ],
  'Condiments': [
    'Sal','Pebre negre','Pebre vermell dolç','Pebre vermell picant',
    'Cúrcuma','Comí','Orenga','Timó','Farigola','Llorer',
    'Maionesa','Mostassa','Ketchup','Salsa de soja','Vinagre',
    'Salsa Worcester','Tabasco','Salsa de tomat','Brou de pollastre',
  ],
  'Oli/Greixos': [
    'Oli d\'oliva verge extra','Oli de girasol','Mantega','Margarina',
  ],
  'Llar i neteja': [
    'Paper de vàter','Paper de cuina','Tovalloles de paper',
    'Pastilles rentavaixelles','Detergent rentavaixelles líquid',
    'Detergent rentadora','Suavitzant','Lleixiu','Netejador multiús',
    'Netejador bany','Netejador vidres','Fregall','Esponja',
    'Bosses escombraries petites','Bosses escombraries grans',
    'Film transparent','Paper d\'alumini','Bossetes zip',
    'Piles AA','Piles AAA','Bombetes','Veles',
  ],
  'Higiene personal': [
    'Gel de dutxa','Xampú','Condicionador','Sabó de mans',
    'Pasta de dents','Raspall de dents','Fil dental','Enjuagatori bucal',
    'Desodorant','Crema hidratant','Crema solar','Maquinetes d\'afaitar',
    'Compreses','Tampons','Paper higiènic humit','Cotó fluix',
  ],
  'Altres': [
    'Sucre','Sucre morè','Mel','Xocolata negra','Xocolata amb llet',
    'Cola cao','Cafè mòlt','Cafè soluble','Te','Infusions',
    'Suc de taronja','Suc de poma','Aigua mineral','Cervesa',
    'Vi negre','Vi blanc','Refresc','Patates fregides','Fruits secs',
    'Melmelada','Mantequilla de cacauet','Conserva de tomat','Tonyina en llauna',
  ],
}

export default function QuickAddModal({ familyId, weekStart, sessionUserId, existingNames, onAdded, onClose }) {
  const { t } = useTranslation()
  const [search,     setSearch]     = useState('')
  const [added,      setAdded]      = useState({})
  const [loading,    setLoading]    = useState({})
  const [customText, setCustomText] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

  const existingSet = new Set((existingNames || []).map(n => n.toLowerCase()))

  async function addProduct(name, category) {
    if (loading[name]) return
    setLoading(p => ({ ...p, [name]: true }))
    await supabase.from('shopping_items').insert({
      family_id: familyId, name, qty: '1', unit: 'u.',
      category, week_start: weekStart, is_checked: false,
      created_by: sessionUserId || null,
    })
    setAdded(p => ({ ...p, [name]: true }))
    setLoading(p => ({ ...p, [name]: false }))
    if (onAdded) onAdded()
  }

  async function addCustom(e) {
    e.preventDefault()
    if (!customText.trim()) return
    setCustomLoading(true)
    await supabase.from('shopping_items').insert({
      family_id: familyId, name: customText.trim(), qty: '1', unit: 'u.',
      category: 'Altres', week_start: weekStart, is_checked: false,
      created_by: sessionUserId || null,
    })
    setAdded(p => ({ ...p, [customText.trim()]: true }))
    setCustomText('')
    setCustomLoading(false)
    if (onAdded) onAdded()
  }

  const q = search.toLowerCase()
  const filteredCats = Object.entries(QUICK_PRODUCTS).map(([cat, items]) => ({
    cat,
    items: items.filter(item => !q || item.toLowerCase().includes(q)),
  })).filter(({ items }) => items.length > 0)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {t('shopping.modal_title')} 🛒 <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{t('shopping.modal_accent')}</span>
            </h3>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <input
            className="inp"
            placeholder={t('shopping.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 14 }}
          />
        </div>

        {/* Product list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px 8px' }}>
          {filteredCats.map(({ cat, items }) => {
            const color = catColor(cat) || '#7A7A9A'
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  {cat}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(item => {
                    const isAdded   = added[item] || existingSet.has(item.toLowerCase())
                    const isLoading = loading[item]
                    return (
                      <button
                        key={item}
                        onClick={() => !isAdded && addProduct(item, cat)}
                        style={{
                          padding: '6px 12px', borderRadius: 20,
                          border: `1.5px solid ${isAdded ? color : 'var(--border)'}`,
                          background: isAdded ? color + '25' : 'var(--surface)',
                          color: isAdded ? color : 'var(--text)',
                          fontSize: 12, fontWeight: isAdded ? 700 : 400,
                          cursor: isAdded ? 'default' : 'pointer',
                          transition: 'all .15s',
                          opacity: isLoading ? 0.5 : 1,
                        }}
                      >
                        {isAdded ? '✓ ' : ''}{item}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {q && filteredCats.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
              No s'ha trobat "{search}"
            </div>
          )}
        </div>

        {/* Custom product + footer */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <form onSubmit={addCustom} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              className="inp"
              placeholder={t('shopping.custom_placeholder')}
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              className="btn-ghost"
              type="submit"
              disabled={customLoading || !customText.trim()}
              style={{ flexShrink: 0, padding: '9px 14px', fontSize: 13 }}
            >
              + {t('common.add')}
            </button>
          </form>
          <button className="btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            {t('common.done')} ✓
          </button>
        </div>
      </div>
    </div>
  )
}

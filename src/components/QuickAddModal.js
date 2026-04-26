// src/components/QuickAddModal.js
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { catColor } from '../lib/constants'
import { useTranslation } from '../lib/i18n'

// Category keys are always Catalan (used for DB storage + color mapping)
const CAT_LABELS = {
  ca: { 'Verdures':'Verdures','Fruita':'Fruita','Carn/Peix':'Carn/Peix','Làctics':'Làctics','Pasta/Arròs':'Pasta/Arròs','Llegums':'Llegums','Pa/Farina':'Pa/Farina','Condiments':'Condiments','Oli/Greixos':'Oli/Greixos','Llar i neteja':'Llar i neteja','Higiene personal':'Higiene personal','Altres':'Altres' },
  es: { 'Verdures':'Verduras','Fruita':'Fruta','Carn/Peix':'Carne/Pescado','Làctics':'Lácteos','Pasta/Arròs':'Pasta/Arroz','Llegums':'Legumbres','Pa/Farina':'Pan/Harina','Condiments':'Condimentos','Oli/Greixos':'Aceite/Grasas','Llar i neteja':'Hogar y limpieza','Higiene personal':'Higiene personal','Altres':'Otros' },
  en: { 'Verdures':'Vegetables','Fruita':'Fruit','Carn/Peix':'Meat/Fish','Làctics':'Dairy','Pasta/Arròs':'Pasta/Rice','Llegums':'Legumes','Pa/Farina':'Bread/Flour','Condiments':'Condiments','Oli/Greixos':'Oils/Fats','Llar i neteja':'Home & Cleaning','Higiene personal':'Personal Hygiene','Altres':'Other' },
}

const QUICK_PRODUCTS = {
  ca: {
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
  },
  es: {
    'Verdures': [
      'Tomates','Cebolla','Ajo','Pimiento rojo','Pimiento verde','Zanahoria',
      'Lechuga','Espinacas','Calabacín','Berenjena','Brócoli','Coliflor',
      'Judías verdes','Patatas','Puerro','Pepino','Remolacha','Apio',
      'Champiñones','Espárragos','Pimientos del piquillo','Cebolleta',
    ],
    'Fruita': [
      'Manzanas','Peras','Plátanos','Naranjas','Fresas','Uvas',
      'Melón','Sandía','Melocotones','Mandarinas','Limones','Kiwi',
      'Mango','Piña','Cerezas','Ciruelas','Nectarinas','Higos',
    ],
    'Carn/Peix': [
      'Pechuga de pollo','Muslos de pollo','Carne picada de ternera',
      'Lomo de cerdo','Filete de ternera','Costillas','Salchicha',
      'Salmón','Merluza','Gambas','Atún fresco','Bacalao','Rape',
      'Mejillones','Calamares','Jamón cocido','Jamón serrano','Fuet','Longaniza',
    ],
    'Làctics': [
      'Leche entera','Leche semi','Yogures naturales','Yogures con fruta',
      'Mantequilla','Queso en lonchas','Mozzarella','Queso feta',
      'Nata para cocinar','Nata montada','Huevos','Queso rallado',
      'Queso fresco','Quark',
    ],
    'Pasta/Arròs': [
      'Arroz redondo','Arroz largo','Espaguetis','Macarrones','Penne',
      'Tallarines','Lasaña','Fideos','Cuscús','Quinoa','Orzo',
    ],
    'Llegums': [
      'Garbanzos cocidos','Lentejas cocidas','Judías blancas','Judías negras',
      'Habas','Guisantes congelados','Edamame','Soja texturizada',
    ],
    'Pa/Farina': [
      'Pan de pueblo','Pan de molde','Baguette','Pan integral',
      'Harina de trigo','Harina integral','Galletas','Tostadas',
      'Croissants','Panecillos','Biscotes',
    ],
    'Condiments': [
      'Sal','Pimienta negra','Pimentón dulce','Pimentón picante',
      'Cúrcuma','Comino','Orégano','Tomillo','Romero','Laurel',
      'Mayonesa','Mostaza','Ketchup','Salsa de soja','Vinagre',
      'Salsa Worcester','Tabasco','Salsa de tomate','Caldo de pollo',
    ],
    'Oli/Greixos': [
      'Aceite de oliva virgen extra','Aceite de girasol','Mantequilla','Margarina',
    ],
    'Llar i neteja': [
      'Papel higiénico','Papel de cocina','Servilletas de papel',
      'Pastillas lavavajillas','Lavavajillas líquido',
      'Detergente lavadora','Suavizante','Lejía','Limpiador multiusos',
      'Limpiador baño','Limpiacristales','Estropajo','Esponja',
      'Bolsas basura pequeñas','Bolsas basura grandes',
      'Film transparente','Papel de aluminio','Bolsas zip',
      'Pilas AA','Pilas AAA','Bombillas','Velas',
    ],
    'Higiene personal': [
      'Gel de ducha','Champú','Acondicionador','Jabón de manos',
      'Pasta de dientes','Cepillo de dientes','Hilo dental','Enjuague bucal',
      'Desodorante','Crema hidratante','Crema solar','Maquinillas de afeitar',
      'Compresas','Tampones','Toallitas húmedas','Algodón',
    ],
    'Altres': [
      'Azúcar','Azúcar moreno','Miel','Chocolate negro','Chocolate con leche',
      'Cola Cao','Café molido','Café soluble','Té','Infusiones',
      'Zumo de naranja','Zumo de manzana','Agua mineral','Cerveza',
      'Vino tinto','Vino blanco','Refresco','Patatas fritas','Frutos secos',
      'Mermelada','Mantequilla de cacahuete','Conserva de tomate','Atún en lata',
    ],
  },
  en: {
    'Verdures': [
      'Tomatoes','Onion','Garlic','Red pepper','Green pepper','Carrot',
      'Lettuce','Spinach','Courgette','Aubergine','Broccoli','Cauliflower',
      'Green beans','Potatoes','Leek','Cucumber','Beetroot','Celery',
      'Mushrooms','Asparagus','Piquillo peppers','Spring onion',
    ],
    'Fruita': [
      'Apples','Pears','Bananas','Oranges','Strawberries','Grapes',
      'Melon','Watermelon','Peaches','Mandarins','Lemons','Kiwi',
      'Mango','Pineapple','Cherries','Plums','Nectarines','Figs',
    ],
    'Carn/Peix': [
      'Chicken breast','Chicken thighs','Minced beef',
      'Pork loin','Beef steak','Ribs','Sausage',
      'Salmon','Hake','Prawns','Fresh tuna','Cod','Monkfish',
      'Mussels','Squid','Cooked ham','Cured ham','Fuet','Chorizo',
    ],
    'Làctics': [
      'Whole milk','Semi-skimmed milk','Natural yoghurts','Fruit yoghurts',
      'Butter','Sliced cheese','Mozzarella','Feta cheese',
      'Cooking cream','Whipped cream','Eggs','Grated cheese',
      'Fresh cheese','Quark',
    ],
    'Pasta/Arròs': [
      'Round rice','Long grain rice','Spaghetti','Macaroni','Penne',
      'Tagliatelle','Lasagne','Noodles','Couscous','Quinoa','Orzo',
    ],
    'Llegums': [
      'Cooked chickpeas','Cooked lentils','White beans','Black beans',
      'Broad beans','Frozen peas','Edamame','Textured soy',
    ],
    'Pa/Farina': [
      'Rustic bread','Sliced bread','Baguette','Wholemeal bread',
      'Plain flour','Wholemeal flour','Biscuits','Toast',
      'Croissants','Bread rolls','Crispbread',
    ],
    'Condiments': [
      'Salt','Black pepper','Sweet paprika','Hot paprika',
      'Turmeric','Cumin','Oregano','Thyme','Rosemary','Bay leaf',
      'Mayonnaise','Mustard','Ketchup','Soy sauce','Vinegar',
      'Worcester sauce','Tabasco','Tomato sauce','Chicken stock',
    ],
    'Oli/Greixos': [
      'Extra virgin olive oil','Sunflower oil','Butter','Margarine',
    ],
    'Llar i neteja': [
      'Toilet paper','Kitchen paper','Paper towels',
      'Dishwasher tablets','Dishwasher liquid',
      'Laundry detergent','Fabric softener','Bleach','Multi-purpose cleaner',
      'Bathroom cleaner','Glass cleaner','Scouring pad','Sponge',
      'Small bin bags','Large bin bags',
      'Cling film','Aluminium foil','Zip bags',
      'AA batteries','AAA batteries','Light bulbs','Candles',
    ],
    'Higiene personal': [
      'Shower gel','Shampoo','Conditioner','Hand soap',
      'Toothpaste','Toothbrush','Dental floss','Mouthwash',
      'Deodorant','Moisturiser','Sun cream','Razors',
      'Sanitary pads','Tampons','Wet wipes','Cotton wool',
    ],
    'Altres': [
      'Sugar','Brown sugar','Honey','Dark chocolate','Milk chocolate',
      'Chocolate powder','Ground coffee','Instant coffee','Tea','Herbal tea',
      'Orange juice','Apple juice','Mineral water','Beer',
      'Red wine','White wine','Fizzy drink','Crisps','Nuts',
      'Jam','Peanut butter','Canned tomatoes','Canned tuna',
    ],
  },
}

export default function QuickAddModal({ familyId, weekStart, sessionUserId, existingNames, onAdded, onClose }) {
  const { t, lang } = useTranslation()
  const [search,     setSearch]     = useState('')
  const [added,      setAdded]      = useState({})
  const [loading,    setLoading]    = useState({})
  const [customText, setCustomText] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

  const products  = QUICK_PRODUCTS[lang] || QUICK_PRODUCTS.ca
  const catLabels = CAT_LABELS[lang]     || CAT_LABELS.ca
  const existingSet = new Set((existingNames || []).map(n => n.toLowerCase()))

  async function addProduct(name, category) {
    if (loading[name]) return
    setLoading(p => ({ ...p, [name]: true }))
    const { error } = await supabase.from('shopping_items').insert({
      family_id: familyId, name, qty: '1', unit: 'u.',
      category, week_start: weekStart, is_checked: false,
      created_by: sessionUserId || null,
    })
    if (!error) {
      setAdded(p => ({ ...p, [name]: true }))
      if (onAdded) onAdded()
    }
    setLoading(p => ({ ...p, [name]: false }))
  }

  async function addCustom(e) {
    e.preventDefault()
    const trimmed = customText.trim()
    if (!trimmed) return
    setCustomLoading(true)
    const { error } = await supabase.from('shopping_items').insert({
      family_id: familyId, name: trimmed, qty: '1', unit: 'u.',
      category: 'Altres', week_start: weekStart, is_checked: false,
      created_by: sessionUserId || null,
    })
    if (!error) {
      setAdded(p => ({ ...p, [trimmed]: true }))
      setCustomText('')
      if (onAdded) onAdded()
    }
    setCustomLoading(false)
  }

  const q = search.toLowerCase()
  const filteredCats = Object.entries(products).map(([cat, items]) => ({
    cat,
    items: items.filter(item => !q || item.toLowerCase().includes(q)),
  })).filter(({ items }) => items.length > 0)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 500, padding: 16, overflowY: 'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignSelf: 'stretch' }}
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
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '12px 20px 8px' }}>
          {filteredCats.map(({ cat, items }) => {
            const color = catColor(cat) || '#7A7A9A'
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  {catLabels[cat] || cat}
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
              {t('shopping.not_found')} "{search}"
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

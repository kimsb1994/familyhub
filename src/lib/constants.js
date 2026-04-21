// src/lib/constants.js

export const DAYS_SHORT = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg']
export const DAYS_FULL  = ['Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte','Diumenge']
export const MEAL_TYPES = ['Dinar','Sopar']
export const CATEGORIES = [
  'Verdures','Fruita','Carn/Peix','Làctics',
  'Pasta/Arròs','Llegums','Pa/Farina',
  'Condiments','Oli/Greixos','Altres'
]

export const MEMBER_COLORS = [
  '#FF6B35','#00C9A7','#FFD166','#8B5CF6',
  '#06B6D4','#F43F5E','#84CC16','#F97316'
]

export const CAT_COLORS = {
  'Verdures':   '#00C9A7',
  'Fruita':     '#66CC88',
  'Carn/Peix':  '#FF6B35',
  'Làctics':    '#FFD166',
  'Pasta/Arròs':'#A78BFA',
  'Llegums':    '#FB923C',
  'Pa/Farina':  '#FCD34D',
  'Condiments': '#7A7A9A',
  'Oli/Greixos':'#F59E0B',
  'Altres':     '#4A4A6A',
}

export function catColor(cat) {
  return CAT_COLORS[cat] || '#4A4A6A'
}

// Get Monday of the current week
export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0,0,0,0)
  return d.toISOString().split('T')[0] // 'YYYY-MM-DD'
}

// Merge ingredients from multiple meals, summing duplicates
export function mergeIngredients(meals) {
  const map = {}
  meals.forEach(meal => {
    (meal.meal_ingredients || []).forEach(ing => {
      const key = ing.name.toLowerCase().trim()
      if (!map[key]) {
        map[key] = { ...ing, mealNames: [meal.name] }
      } else {
        map[key].mealNames.push(meal.name)
        const a = parseFloat(map[key].qty)
        const b = parseFloat(ing.qty)
        if (!isNaN(a) && !isNaN(b) && map[key].unit === ing.unit) {
          map[key].qty = String(Math.round((a + b) * 10) / 10)
        }
      }
    })
  })
  return Object.values(map)
}

export function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] || 'Altres'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('ca-ES', { weekday:'short', day:'numeric', month:'short' })
}

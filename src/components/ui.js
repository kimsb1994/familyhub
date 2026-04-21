// src/components/ui.js  — shared atoms
import React from 'react'

export function Avatar({ member, size = 32 }) {
  const color = member?.avatar_color || '#FF6B35'
  const letter = (member?.name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '30', border: `2px solid ${color}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * .38, fontWeight: 700, color, flexShrink: 0,
      userSelect: 'none',
    }}>
      {letter}
    </div>
  )
}

export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <div className="spin" style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}30`,
      borderTopColor: color,
    }} />
  )
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: action ? 20 : 0 }}>{subtitle}</div>}
      {action}
    </div>
  )
}

export function CatDot({ cat }) {
  const colors = {
    'Verdures':'#00C9A7','Fruita':'#66CC88','Carn/Peix':'#FF6B35','Làctics':'#FFD166',
    'Pasta/Arròs':'#A78BFA','Llegums':'#FB923C','Pa/Farina':'#FCD34D',
    'Condiments':'#7A7A9A','Oli/Greixos':'#F59E0B','Altres':'#4A4A6A',
  }
  const c = colors[cat] || '#4A4A6A'
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
}

export function PageHeader({ title, accent, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <h2 className="section-title" style={{ marginBottom: subtitle ? 2 : 0 }}>
          {title} <span>{accent}</span>
        </h2>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

export function IngredientList({ ingredients }) {
  const colors = {
    'Verdures':'#00C9A7','Fruita':'#66CC88','Carn/Peix':'#FF6B35','Làctics':'#FFD166',
    'Pasta/Arròs':'#A78BFA','Llegums':'#FB923C','Pa/Farina':'#FCD34D',
    'Condiments':'#7A7A9A','Oli/Greixos':'#F59E0B','Altres':'#4A4A6A',
  }
  return (
    <>
      {ingredients.map((ing, i) => {
        const c = colors[ing.category] || '#4A4A6A'
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:9, background:'var(--bg)', border:'1px solid var(--border)', marginBottom:5 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }} />
            <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{ing.name}</span>
            <span className="chip" style={{ background: c+'20', color: c }}>{ing.qty} {ing.unit}</span>
          </div>
        )
      })}
    </>
  )
}

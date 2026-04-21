// src/components/BottomNav.js
import React from 'react'

const ICONS = {
  home: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'var(--accent)' : 'none'} stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  calendar: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  menu: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  shopping: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57L23 6H6"/>
    </svg>
  ),
  tasks: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  profile: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
}

const NAV_ITEMS = [
  { id: 'home',     label: 'Inici'     },
  { id: 'calendar', label: 'Calendari' },
  { id: 'menu',     label: 'Menú'      },
  { id: 'shopping', label: 'Compra'    },
  { id: 'tasks',    label: 'Tasques'   },
  { id: 'profile',  label: 'Família'   },
]

export default function BottomNav({ current, onChange, badges = {} }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'var(--surface)EE', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      padding: '8px 2px 16px',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(n => {
        const active = current === n.id
        const badge  = badges[n.id]
        return (
          <button key={n.id} className={`nav-btn ${active ? 'active' : ''}`} onClick={() => onChange(n.id)}>
            {ICONS[n.id](active)}
            <span>{n.label}</span>
            {badge > 0 && (
              <div style={{ position:'absolute', top:4, right:4, background:'var(--accent)', color:'#fff', borderRadius:10, fontSize:8, fontWeight:700, padding:'1px 4px', lineHeight:1.6 }}>
                {badge}
              </div>
            )}
          </button>
        )
      })}
    </nav>
  )
}

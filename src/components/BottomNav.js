// src/components/BottomNav.js
import React from 'react'
import { useTranslation } from '../lib/i18n'

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
  dishes: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
  shopping: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57L23 6H6"/>
    </svg>
  ),
  expenses: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ),
  tasks: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  events: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  profile: (a) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
}

const NAV_IDS = ['home', 'calendar', 'menu', 'dishes', 'shopping', 'expenses', 'tasks', 'events', 'profile']

export default function BottomNav({ current, onChange, badges = {} }) {
  const { t } = useTranslation()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'rgba(22, 22, 30, 0.92)',
      WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      paddingTop: 8, paddingLeft: 4, paddingRight: 4,
      paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
      overflowX: 'auto', overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      zIndex: 100,
    }}>
      <style>{`.bottom-nav-inner::-webkit-scrollbar { display: none; }`}</style>
      {NAV_IDS.map(id => {
        const active = current === id
        const badge  = badges[id]
        const label  = {
          home: t('nav.home'), calendar: t('nav.calendar'), menu: t('nav.menu'),
          dishes: t('nav.dishes'), shopping: t('nav.shopping'), expenses: t('nav.expenses'),
          tasks: t('nav.tasks'), events: t('nav.events'), profile: t('nav.profile'),
        }[id] || id
        return (
          <button key={id} className={`nav-btn ${active ? 'active' : ''}`} onClick={() => onChange(id)}
            style={{ flexShrink: 0, minWidth: 52 }}>
            {ICONS[id](active)}
            <span>{label}</span>
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

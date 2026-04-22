// src/pages/ProfilePage.js
import React, { useState } from 'react'
import { supabase, signOut } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { MEMBER_COLORS } from '../lib/constants'
import { Avatar } from '../components/ui'
import { useTranslation } from '../lib/i18n'

// ── Generic settings sheet wrapper ────────────────────────────────────────────
function SettingsSheet({ title, icon, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, flex: 1 }}>{title}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      {right}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
        background: value ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background .2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 4px #0004',
      }} />
    </div>
  )
}

// ── Idioma ────────────────────────────────────────────────────────────────────
function LanguageSheet({ onClose }) {
  const { lang, setLanguage, t } = useTranslation()
  const LANGS = [
    { id: 'ca', flag: '🇪🇸', name: 'Català' },
    { id: 'es', flag: '🇪🇸', name: 'Castellano' },
    { id: 'en', flag: '🇬🇧', name: 'English' },
  ]
  return (
    <SettingsSheet title={t('lang.title')} icon="🌐" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LANGS.map(l => (
          <div key={l.id} onClick={() => { setLanguage(l.id); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${lang === l.id ? 'var(--accent)' : 'var(--border)'}`, background: lang === l.id ? 'var(--accent-dim)' : 'var(--surface)', transition: 'all .15s' }}>
            <span style={{ fontSize: 26 }}>{l.flag}</span>
            <span style={{ fontSize: 15, fontWeight: lang === l.id ? 700 : 400, flex: 1 }}>{l.name}</span>
            {lang === l.id && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
          </div>
        ))}
      </div>
    </SettingsSheet>
  )
}

// ── Notificacions ─────────────────────────────────────────────────────────────
function NotificationsSheet({ onClose }) {
  const { t } = useTranslation()
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif-prefs') || '{}') } catch { return {} }
  })

  function savePref(key, val) {
    const next = { ...prefs, [key]: val }
    setPrefs(next)
    localStorage.setItem('notif-prefs', JSON.stringify(next))
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  function testNotif() {
    if (permission !== 'granted') return
    new Notification('FamilyHub 🏡', {
      body: t('notif.test_msg'),
      icon: '/icons/icon-192.png',
    })
  }

  const granted = permission === 'granted'

  return (
    <SettingsSheet title={t('settings.notif')} icon="🔔" onClose={onClose}>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: granted ? 'var(--teal-dim)' : 'var(--red-dim)', border: `1px solid ${granted ? '#00C9A730' : '#FF446630'}`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{granted ? '✅' : permission === 'denied' ? '🚫' : '⚠️'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: granted ? 'var(--teal)' : 'var(--red)' }}>
            {granted ? t('notif.granted') : permission === 'denied' ? t('notif.denied') : t('notif.not_set')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            {granted ? t('notif.granted_desc') : permission === 'denied' ? t('notif.denied_desc') : t('notif.not_set_desc')}
          </div>
        </div>
        {!granted && permission !== 'denied' && (
          <button className="btn-primary" onClick={requestPermission} style={{ fontSize: 12, padding: '7px 12px', flexShrink: 0 }}>{t('notif.enable')}</button>
        )}
      </div>

      <Row label={t('notif.events')} desc={t('notif.events_desc')}
        right={<Toggle value={!!prefs.events} onChange={v => savePref('events', v)} />} />
      <Row label={t('notif.tasks')} desc={t('notif.tasks_desc')}
        right={<Toggle value={!!prefs.tasks} onChange={v => savePref('tasks', v)} />} />
      <Row label={t('notif.shopping')} desc={t('notif.shopping_desc')}
        right={<Toggle value={!!prefs.shopping} onChange={v => savePref('shopping', v)} />} />
      <Row label={t('notif.menu')} desc={t('notif.menu_desc')}
        right={<Toggle value={!!prefs.menu} onChange={v => savePref('menu', v)} />} />

      {granted && (
        <button className="btn-ghost" onClick={testNotif} style={{ width: '100%', justifyContent: 'center', marginTop: 16, fontSize: 13 }}>
          {t('notif.test')}
        </button>
      )}
    </SettingsSheet>
  )
}

// ── Aparença ──────────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { name: 'Taronja',  value: '#FF6B35' },
  { name: 'Blau',     value: '#3B82F6' },
  { name: 'Verd',     value: '#10B981' },
  { name: 'Lila',     value: '#8B5CF6' },
  { name: 'Rosa',     value: '#EC4899' },
  { name: 'Groc',     value: '#F59E0B' },
]

function AppearanceSheet({ onClose }) {
  const { t } = useTranslation()
  const [isDark, setIsDark] = useState(!document.body.classList.contains('light'))
  const [accent, setAccent] = useState(
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FF6B35'
  )

  function toggleTheme() {
    const nowLight = !document.body.classList.contains('light')
    document.body.classList.toggle('light')
    localStorage.setItem('theme', nowLight ? 'light' : 'dark')
    setIsDark(!nowLight)
  }

  function changeAccent(color) {
    document.documentElement.style.setProperty('--accent', color)
    document.documentElement.style.setProperty('--accent-dim', color + '20')
    document.documentElement.style.setProperty('--accent-glow', color + '40')
    localStorage.setItem('accent-color', color)
    setAccent(color)
  }

  return (
    <SettingsSheet title={t('settings.appear')} icon="🎨" onClose={onClose}>
      <Row
        label={t('appear.dark_mode')}
        desc={isDark ? t('appear.dark_on') : t('appear.dark_off')}
        right={<Toggle value={isDark} onChange={toggleTheme} />}
      />

      <div style={{ paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
          {t('appear.accent')}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ACCENT_COLORS.map(c => (
            <div
              key={c.value}
              onClick={() => changeAccent(c.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: c.value,
                border: accent === c.value ? '3px solid var(--text)' : '3px solid transparent',
                transition: 'border .15s', boxShadow: accent === c.value ? `0 0 0 2px ${c.value}` : 'none',
              }} />
              <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: accent === c.value ? 700 : 400 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </SettingsSheet>
  )
}

// ── Dispositius ───────────────────────────────────────────────────────────────
function DevicesSheet({ onClose }) {
  const { t } = useTranslation()
  const isTablet = window.innerWidth >= 768 && window.innerWidth > window.innerHeight
  const isPWA    = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  const w = window.screen.width, h = window.screen.height

  const browser = (() => {
    const ua = navigator.userAgent
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Edg')) return 'Edge'
    return '—'
  })()

  const os = (() => {
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS'
    if (/Android/.test(ua)) return 'Android'
    if (/Windows/.test(ua)) return 'Windows'
    if (/Mac/.test(ua)) return 'macOS'
    if (/Linux/.test(ua)) return 'Linux'
    return '—'
  })()

  return (
    <SettingsSheet title={t('settings.devices')} icon="📱" onClose={onClose}>
      <Row label={t('devices.mode')}    desc={isTablet ? t('devices.tablet') : t('devices.mobile')}         right={<span style={{ fontSize: 18 }}>{isTablet ? '🖥️' : '📱'}</span>} />
      <Row label={t('devices.pwa')}     desc={isPWA ? t('devices.pwa_yes') : t('devices.pwa_no')}            right={<span style={{ fontSize: 18 }}>{isPWA ? '✅' : '🌐'}</span>} />
      <Row label={t('devices.resolution')} desc={`${w} × ${h} px`}                                          right={<span style={{ fontSize: 11, color: 'var(--muted)' }}>{w}×{h}</span>} />
      <Row label={t('devices.browser')} desc={browser}                                                       right={<span style={{ fontSize: 14 }}>🌐</span>} />
      <Row label={t('devices.os')}      desc={os}                                                             right={<span style={{ fontSize: 14 }}>💻</span>} />
      <Row label={t('devices.notif')}   desc={typeof Notification !== 'undefined' ? Notification.permission : '—'} right={<span style={{ fontSize: 14 }}>{typeof Notification !== 'undefined' && Notification.permission === 'granted' ? '✅' : '⚠️'}</span>} />

      {!isPWA && (
        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>{t('devices.install_tip')}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('devices.install_desc')}</div>
        </div>
      )}
    </SettingsSheet>
  )
}

// ── Privacitat ────────────────────────────────────────────────────────────────
function PrivacySheet({ onClose }) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const [resetSent,   setResetSent]   = useState(false)
  const [resetting,   setResetting]   = useState(false)
  const [deletePhase, setDeletePhase] = useState(0)
  const [deleting,    setDeleting]    = useState(false)
  const email = session?.user?.email

  async function sendReset() {
    if (!email) return
    setResetting(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setResetSent(true)
    setResetting(false)
  }

  async function deleteAccount() {
    setDeleting(true)
    await supabase.from('family_members').delete().eq('user_id', session.user.id)
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <SettingsSheet title={t('settings.privacy')} icon="🔒" onClose={onClose}>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{t('privacy.account')}</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{email || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          ID: {session?.user?.id?.slice(0, 16)}...
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t('privacy.change_pass')}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{t('privacy.change_desc')}</div>
        {resetSent ? (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--teal-dim)', border: '1px solid #00C9A730', fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
            ✅ {t('privacy.reset_sent')} {email}
          </div>
        ) : (
          <button className="btn-ghost" onClick={sendReset} disabled={resetting || !email} style={{ width: '100%', justifyContent: 'center' }}>
            {resetting ? t('privacy.sending') : t('privacy.send_reset')}
          </button>
        )}
      </div>

      <Row
        label={t('privacy.data')}
        desc={t('privacy.data_desc')}
        right={<span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('privacy.data_location')}</span>}
      />

      <div style={{ marginTop: 20 }}>
        {deletePhase === 0 && (
          <button
            onClick={() => setDeletePhase(1)}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #FF446640', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('privacy.delete')}
          </button>
        )}
        {deletePhase === 1 && (
          <div style={{ padding: '14px', borderRadius: 12, background: 'var(--red-dim)', border: '1px solid #FF446640' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>{t('privacy.delete_confirm')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{t('privacy.delete_desc')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={deleteAccount} disabled={deleting} style={{ flex: 1, padding: '9px', borderRadius: 8, background: 'var(--red)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {deleting ? t('privacy.deleting') : t('privacy.delete_yes')}
              </button>
              <button onClick={() => setDeletePhase(0)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSheet>
  )
}

// ── Invite & Edit member modals ───────────────────────────────────────────────
function InviteModal({ family, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t('profile.invite_title')}</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{t('profile.invite_desc')}</p>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{t('profile.family_code')}</div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.05em', color: 'var(--accent)', wordBreak: 'break-all' }}>{family?.id}</div>
        </div>
        <button className="btn-primary" onClick={() => { navigator.clipboard?.writeText(family?.id); onClose() }} style={{ width: '100%', justifyContent: 'center' }}>
          {t('profile.copy_code')}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>{t('common.close')}</button>
      </div>
    </div>
  )
}

function EditMemberModal({ member, onSaved, onClose }) {
  const { t } = useTranslation()
  const [name,   setName]   = useState(member.name)
  const [color,  setColor]  = useState(member.avatar_color || MEMBER_COLORS[0])
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('family_members').update({ name: name.trim(), avatar_color: color }).eq('id', member.id)
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t('profile.edit_profile')}</h3>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('profile.name')}</label>
        <input className="inp" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('profile.color')}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {MEMBER_COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '3px solid transparent', transition: 'border .15s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? t('common.saving') : `💾 ${t('common.save')}`}
          </button>
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage({ members, onMembersChange }) {
  const { family, member, reload } = useAuth()
  const { t } = useTranslation()
  const [showInvite,  setShowInvite]  = useState(false)
  const [editMember,  setEditMember]  = useState(null)
  const [signingOut,  setSigningOut]  = useState(false)
  const [activeSheet, setActiveSheet] = useState(null)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  const SETTINGS = [
    { id: 'notif',    icon: '🔔', label: t('settings.notif'),    desc: t('settings.notif_desc')    },
    { id: 'appear',   icon: '🎨', label: t('settings.appear'),   desc: t('settings.appear_desc')   },
    { id: 'devices',  icon: '📱', label: t('settings.devices'),  desc: t('settings.devices_desc')  },
    { id: 'privacy',  icon: '🔒', label: t('settings.privacy'),  desc: t('settings.privacy_desc')  },
    { id: 'language', icon: '🌐', label: t('settings.language'), desc: t('settings.language_desc') },
  ]

  return (
    <div style={{ padding: '20px 16px' }} className="fu">
      <h2 className="section-title">{t('profile.title').split(' ')[0]} <span>{t('profile.title').split(' ').slice(1).join(' ')}</span></h2>

      {family && (
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🏡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{family.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{members.length} {t('profile.members')}</div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => setShowInvite(true)}>
            {t('profile.invite')}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {members.map(m => (
          <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: m.id === member?.id ? 'pointer' : 'default' }}
            onClick={() => m.id === member?.id && setEditMember(m)}>
            <Avatar member={m} size={46} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{m.role}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {m.id === member?.id && (
                <span className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{t('profile.me')}</span>
              )}
              <span className="tag" style={{ background: (m.avatar_color || 'var(--accent)') + '20', color: m.avatar_color }}>{m.role}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{t('profile.settings')}</div>
      {SETTINGS.map(s => (
        <div key={s.id} className="card" onClick={() => setActiveSheet(s.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 16 }}>›</span>
        </div>
      ))}

      <button className="btn-ghost" onClick={handleSignOut} disabled={signingOut}
        style={{ width: '100%', marginTop: 10, justifyContent: 'center', color: 'var(--red)' }}>
        {signingOut ? t('profile.signing_out') : t('profile.sign_out')}
      </button>

      {/* Modals */}
      {showInvite   && <InviteModal family={family} onClose={() => setShowInvite(false)} />}
      {editMember   && <EditMemberModal member={editMember} onSaved={() => { reload(); onMembersChange() }} onClose={() => setEditMember(null)} />}
      {activeSheet === 'notif'    && <NotificationsSheet onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'appear'   && <AppearanceSheet    onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'devices'  && <DevicesSheet       onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'privacy'  && <PrivacySheet       onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'language' && <LanguageSheet      onClose={() => setActiveSheet(null)} />}
    </div>
  )
}

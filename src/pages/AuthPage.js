// src/pages/AuthPage.js
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEMBER_COLORS } from '../lib/constants'
import { useTranslation } from '../lib/i18n'

function GoogleButton({ onClick, loading, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', transition: 'background .15s',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      {label}
    </button>
  )
}

export default function AuthPage({ onAuth, existingUserId }) {
  const { t } = useTranslation()
  const [mode,     setMode]     = useState(existingUserId ? 'create-family' : 'login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [famName,  setFamName]  = useState('')
  const [famCode,  setFamCode]  = useState('')
  const [color,    setColor]    = useState(MEMBER_COLORS[0])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [userId,   setUserId]   = useState(existingUserId || null)

  const err = (msg) => { setError(msg); setLoading(false) }

  // ── Google OAuth ─────────────────────────────────────────
  async function handleGoogleAuth() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) err(error.message)
    // si no hay error el navegador redirige a Google — el código no continúa
  }

  // ── Step 1: authenticate ─────────────────────────────────
  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return err(error.message)
      onAuth(data.session)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return err(error.message)
      setUserId(data.user.id)
      setMode('create-family')
      setLoading(false)
    }
  }

  // ── Step 2a: create new family ───────────────────────────
  async function handleCreateFamily(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: fam, error: famErr } = await supabase.from('families').insert({ name: famName }).select().single()
    if (famErr) return err(famErr.message)
    const { error: memErr } = await supabase.from('family_members').insert({
      family_id: fam.id, user_id: userId,
      name, avatar_color: color, role: 'admin'
    })
    if (memErr) return err(memErr.message)
    const { data: session } = await supabase.auth.getSession()
    onAuth(session.session)
  }

  // ── Step 2b: join existing family ───────────────────────
  async function handleJoinFamily(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: fam, error: famErr } = await supabase.from('families').select().eq('id', famCode.trim()).single()
    if (famErr || !fam) return err('Codi de família no trobat')
    const { error: memErr } = await supabase.from('family_members').insert({
      family_id: fam.id, user_id: userId,
      name, avatar_color: color, role: 'member'
    })
    if (memErr) return err(memErr.message)
    const { data: session } = await supabase.auth.getSession()
    onAuth(session.session)
  }

  const inp = (value, onChange, placeholder, type = 'text') => (
    <input className="inp" type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required style={{ marginBottom: 10 }} />
  )

  const Divider = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, color: 'var(--dim)' }}>{t('auth.or_email')}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏡</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, letterSpacing: '-.03em' }}>
            Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{t('auth.subtitle')}</p>
        </div>

        {/* ── Login ── */}
        {mode === 'login' && (
          <form onSubmit={handleAuth}>
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 18 }}>{t('auth.login')}</h2>
              <GoogleButton onClick={handleGoogleAuth} loading={loading} label={t('auth.google')} />
              <Divider />
              {inp(email, setEmail, t('auth.email'), 'email')}
              {inp(password, setPassword, t('auth.password'), 'password')}
              {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? t('auth.entering') : t('auth.enter')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMode('register')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                {t('auth.new_account')}
              </button>
            </div>
          </form>
        )}

        {/* ── Register ── */}
        {mode === 'register' && (
          <form onSubmit={handleAuth}>
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 18 }}>{t('auth.register')}</h2>
              <GoogleButton onClick={handleGoogleAuth} loading={loading} label={t('auth.google')} />
              <Divider />
              {inp(email, setEmail, t('auth.email'), 'email')}
              {inp(password, setPassword, t('auth.password_hint'), 'password')}
              {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? t('auth.entering') : t('auth.continue')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMode('login')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                {t('auth.have_account')}
              </button>
            </div>
          </form>
        )}

        {/* ── Create family ── */}
        {mode === 'create-family' && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t('auth.setup_family')}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>{t('auth.setup_desc')}</p>

            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('auth.your_name')}</label>
            <input className="inp" placeholder={t('auth.name_placeholder')} value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />

            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('auth.avatar_color')}</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {MEMBER_COLORS.map(c => (
                <div key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '3px solid transparent', transition: 'border .15s' }} />
              ))}
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <form onSubmit={handleCreateFamily}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('auth.family_name')}</label>
              <input className="inp" placeholder={t('auth.family_placeholder')} value={famName} onChange={e => setFamName(e.target.value)} style={{ marginBottom: 12 }} />
              <button className="btn-primary" type="submit" disabled={loading || !name || !famName} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? t('auth.entering') : t('auth.create_family')}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>o</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleJoinFamily}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('auth.join_family')}</label>
              <input className="inp" placeholder={t('auth.family_code')} value={famCode} onChange={e => setFamCode(e.target.value)} style={{ marginBottom: 8 }} />
              <button className="btn-ghost" type="submit" disabled={loading || !name || !famCode} style={{ width: '100%', justifyContent: 'center' }}>
                {t('auth.join')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

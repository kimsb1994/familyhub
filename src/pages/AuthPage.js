// src/pages/AuthPage.js
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEMBER_COLORS } from '../lib/constants'

export default function AuthPage({ onAuth }) {
  const [mode,     setMode]     = useState('login') // 'login' | 'register' | 'create-family' | 'join-family'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [famName,  setFamName]  = useState('')
  const [famCode,  setFamCode]  = useState('')
  const [color,    setColor]    = useState(MEMBER_COLORS[0])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [userId,   setUserId]   = useState(null)

  const err = (msg) => { setError(msg); setLoading(false) }

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

  const input = (value, onChange, placeholder, type = 'text') => (
    <input className="inp" type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required style={{ marginBottom: 10 }} />
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🏡</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, letterSpacing: '-.03em' }}>
            Family<span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Hub</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Gestiona la vida familiar fàcilment</p>
        </div>

        {/* ── Login ── */}
        {mode === 'login' && (
          <form onSubmit={handleAuth}>
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Iniciar sessió</h2>
              {input(email, setEmail, 'Correu electrònic', 'email')}
              {input(password, setPassword, 'Contrasenya', 'password')}
              {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Entrant...' : 'Entrar'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMode('register')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                Crear compte nou
              </button>
            </div>
          </form>
        )}

        {/* ── Register ── */}
        {mode === 'register' && (
          <form onSubmit={handleAuth}>
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Crear compte</h2>
              {input(email, setEmail, 'Correu electrònic', 'email')}
              {input(password, setPassword, 'Contrasenya (mínim 6 car.)', 'password')}
              {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Creant compte...' : 'Continuar →'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMode('login')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                Ja tinc compte
              </button>
            </div>
          </form>
        )}

        {/* ── Create family ── */}
        {mode === 'create-family' && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Configurar família</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>Compte creat! Ara configura la teva família.</p>

            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>El teu nom</label>
            <input className="inp" placeholder="Ex: Quim" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />

            <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Color d'avatar</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {MEMBER_COLORS.map(c => (
                <div key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? `3px solid white` : '3px solid transparent', transition: 'border .15s' }} />
              ))}
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <form onSubmit={handleCreateFamily}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nom de la família</label>
              <input className="inp" placeholder="Ex: Família Puig" value={famName} onChange={e => setFamName(e.target.value)} style={{ marginBottom: 12 }} />
              <button className="btn-primary" type="submit" disabled={loading || !name || !famName} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Creant...' : '✓ Crear família'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>o</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleJoinFamily}>
              <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Unir-se a família existent</label>
              <input className="inp" placeholder="Codi de família (UUID)" value={famCode} onChange={e => setFamCode(e.target.value)} style={{ marginBottom: 8 }} />
              <button className="btn-ghost" type="submit" disabled={loading || !name || !famCode} style={{ width: '100%', justifyContent: 'center' }}>
                Unir-se
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

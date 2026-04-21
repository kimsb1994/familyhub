// src/pages/ProfilePage.js
import React, { useState } from 'react'
import { supabase, signOut } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { MEMBER_COLORS } from '../lib/constants'
import { Avatar } from '../components/ui'

function InviteModal({ family, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Convidar membre</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Comparteix aquest codi amb el membre que vols afegir. Ho haurà de posar al registrar-se.
        </p>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Codi de família</div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.05em', color: 'var(--accent)', wordBreak: 'break-all' }}>{family?.id}</div>
        </div>
        <button className="btn-primary" onClick={() => { navigator.clipboard?.writeText(family?.id); onClose() }} style={{ width: '100%', justifyContent: 'center' }}>
          📋 Copiar codi
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Tancar</button>
      </div>
    </div>
  )
}

function EditMemberModal({ member, onSaved, onClose }) {
  const [name,  setName]  = useState(member.name)
  const [color, setColor] = useState(member.avatar_color || MEMBER_COLORS[0])
  const [saving,setSaving]= useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('family_members').update({ name: name.trim(), avatar_color: color }).eq('id', member.id)
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-drag" />
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Editar perfil</h3>

        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nom</label>
        <input className="inp" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />

        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Color</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {MEMBER_COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid white' : '3px solid transparent', transition: 'border .15s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !name.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Guardant...' : '💾 Guardar'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage({ members, onMembersChange }) {
  const { family, member, reload } = useAuth()
  const [showInvite, setShowInvite] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  return (
    <div style={{ padding: '20px 16px' }} className="fu">
      <h2 className="section-title">La <span>Família</span></h2>

      {/* Family name */}
      {family && (
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🏡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{family.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{members.length} membres</div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => setShowInvite(true)}>
            + Convidar
          </button>
        </div>
      )}

      {/* Members list */}
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
                <span className="tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Jo</span>
              )}
              <span className="tag" style={{ background: (m.avatar_color || 'var(--accent)') + '20', color: m.avatar_color }}>{m.role}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Configuració</div>
      {[
        { icon: '🔔', label: 'Notificacions',  desc: 'Events, tasques, compra'  },
        { icon: '🎨', label: 'Aparença',        desc: 'Tema, colors per membre'  },
        { icon: '📱', label: 'Dispositius',     desc: `Tablet, mòbil (${members.length} actius)` },
        { icon: '🔒', label: 'Privacitat',      desc: 'Contrasenyes, permisos'   },
      ].map(s => (
        <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '14px', cursor: 'pointer' }}>
          <div style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 16 }}>›</span>
        </div>
      ))}

      <button className="btn-ghost" onClick={handleSignOut} disabled={signingOut} style={{ width: '100%', marginTop: 10, justifyContent: 'center', color: 'var(--red)' }}>
        {signingOut ? 'Sortint...' : 'Tancar sessió'}
      </button>

      {/* Modals */}
      {showInvite && <InviteModal family={family} onClose={() => setShowInvite(false)} />}
      {editMember && (
        <EditMemberModal
          member={editMember}
          onSaved={() => { reload(); onMembersChange(); }}
          onClose={() => setEditMember(null)}
        />
      )}
    </div>
  )
}

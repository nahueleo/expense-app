import { useState } from 'react'
import { createPortal } from 'react-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const EMOJIS = ['✈️','🏔️','🏖️','🎉','🏕️','🚗','🛳️','🎿','🏄','🎭','🍽️','🏠','⚽','🎸','💼','🌍']
const TYPES  = ['Viaje','Evento','Casa','Deporte','Trabajo','Otro']

export default function ActivitySwitcher({ activities, currentActivityId, onSelect, currentUserEmail, users, open: externalOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '✈️', type: 'Viaje', members: [] })
  const [inviteEmail, setInviteEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const current = activities.find(a => a.id === currentActivityId)

  function setOpen(val) {
    setInternalOpen(val)
    onOpenChange?.(val)
    if (!val) { setCreating(false); setInviteEmail('') }
  }

  // People I know = users who share at least one activity with me (excluding myself)
  const knownEmails = new Set()
  activities
    .filter(a => a.members?.includes(currentUserEmail))
    .forEach(a => a.members?.forEach(email => {
      if (email !== currentUserEmail) knownEmails.add(email)
    }))
  const knownUsers = users.filter(u => knownEmails.has(u.email))

  // Invited emails that aren't registered users yet
  const invitedUnknown = form.members.filter(
    email => email !== currentUserEmail && !users.find(u => u.email === email)
  )

  function toggleMember(email) {
    setForm(f => ({
      ...f,
      members: f.members.includes(email)
        ? f.members.filter(e => e !== email)
        : [...f.members, email],
    }))
  }

  function addInvite() {
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@') || form.members.includes(email)) return
    setForm(f => ({ ...f, members: [...f.members, email] }))
    setInviteEmail('')
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    // Always include self
    const creatorEmail = currentUserEmail?.toLowerCase()
    const members = Array.from(new Set([creatorEmail, ...form.members.map(e => e.toLowerCase())]))
    const ref = await addDoc(collection(db, 'activities'), {
      name: form.name.trim(),
      emoji: form.emoji,
      type: form.type,
      members,
      admins: [creatorEmail],
      createdBy: creatorEmail,
      createdAt: serverTimestamp(),
    })
    setSaving(false)
    setCreating(false)
    setForm({ name: '', emoji: '✈️', type: 'Viaje', members: [] })
    setInviteEmail('')
    onSelect(ref.id)
    setOpen(false)
  }

  return (
    <>
      <button className="activity-trigger" onClick={() => setOpen(true)}>
        <span className="activity-trigger-emoji">{current?.emoji ?? '🌍'}</span>
        <span className="activity-trigger-name">{current?.name ?? 'Mis actividades'}</span>
        <span className="activity-trigger-chevron">⌄</span>
      </button>

      {open && createPortal(
        <div className="sheet-overlay" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            {!creating ? (
              <>
                <h3 className="sheet-title">Actividades</h3>
                <div className="activity-list">
                  {activities.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>
                      No tenés actividades todavía.
                    </p>
                  )}
                  {activities.map(a => (
                    <button
                      key={a.id}
                      className={`activity-item ${currentActivityId === a.id ? 'active' : ''}`}
                      onClick={() => { onSelect(a.id); setOpen(false) }}
                    >
                      <span className="activity-item-emoji">{a.emoji}</span>
                      <div className="activity-item-info">
                        <span className="activity-item-name">{a.name}</span>
                        <span className="activity-item-type">{a.type}</span>
                      </div>
                      {currentActivityId === a.id && <span className="activity-check">✓</span>}
                    </button>
                  ))}
                </div>
                <button className="btn-new-activity" onClick={() => setCreating(true)}>
                  + Nueva actividad
                </button>
                {currentActivityId && (
                  <button
                    className="btn-all-activities"
                    onClick={() => { onSelect(null); setOpen(false) }}
                  >
                    Ver todas las actividades
                  </button>
                )}
              </>
            ) : (
              <>
                <h3 className="sheet-title">Nueva actividad</h3>
                <form onSubmit={handleCreate} className="activity-form">
                  <div className="emoji-picker">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        className={`emoji-btn ${form.emoji === e ? 'selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      >
                        {e}
                      </button>
                    ))}
                  </div>

                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Viaje Ushuaia 2027..."
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Known people from other activities */}
                  {knownUsers.length > 0 && (
                    <div className="form-group">
                      <label>Personas conocidas</label>
                      <div className="member-picker">
                        {knownUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            className={`member-btn ${form.members.includes(u.email) ? 'selected' : ''}`}
                            onClick={() => toggleMember(u.email)}
                          >
                            {u.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invite by email */}
                  <div className="form-group">
                    <label>Invitar por email</label>
                    <div className="invite-row">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInvite())}
                        placeholder="amigo@gmail.com"
                      />
                      <button type="button" className="btn-invite-add" onClick={addInvite}>+</button>
                    </div>

                    {/* Invited list */}
                    {invitedUnknown.length > 0 && (
                      <div className="invited-list">
                        {invitedUnknown.map(email => (
                          <div key={email} className="invited-chip">
                            <span>{email}</span>
                            <button type="button" onClick={() => toggleMember(email)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="member-hint">
                      Recibirán acceso cuando inicien sesión con ese email.
                    </p>
                  </div>

                  <div className="activity-form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setCreating(false)}>Cancelar</button>
                    <button type="submit" className="btn-save" disabled={saving || !form.name.trim()}>
                      {saving ? '...' : 'Crear'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

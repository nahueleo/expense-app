import { useState } from 'react'
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'

const emptyForm = { email: '', displayName: '', mpAlias: '', modoAlias: '' }

export default function UserManager({ users, currentUserDoc, currentActivity }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [addingGlobal, setAddingGlobal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isActivityAdmin = currentActivity?.admins?.includes(currentUserDoc?.email?.toLowerCase())
  const isAppAdmin = currentUserDoc?.isAdmin === true

  // Members of current activity — if no activity, show all users
  const memberEmails = currentActivity?.members ?? users.map(u => u.email)
  const activityMembers = users.filter(u => memberEmails.includes(u.email))
  // Invited but not yet registered (only relevant when an activity is selected)
  const pendingEmails = currentActivity
    ? memberEmails.filter(email => !users.find(u => u.email === email))
    : []

  // ── Activity member management ──
  async function addMemberToActivity(email) {
    if (!currentActivity || memberEmails.includes(email)) return
    await updateDoc(doc(db, 'activities', currentActivity.id), {
      members: [...memberEmails, email.toLowerCase().trim()],
    })
    setInviteEmail('')
  }

  async function removeMemberFromActivity(email) {
    if (!currentActivity) return
    if (!window.confirm(`Quitar a ${email} de esta actividad?`)) return
    const activityAdmins = currentActivity.admins ?? []
    await updateDoc(doc(db, 'activities', currentActivity.id), {
      members: memberEmails.filter(e => e !== email),
      admins: activityAdmins.filter(e => e !== email),
    })
  }

  async function toggleActivityAdmin(email) {
    if (!currentActivity) return
    const activityAdmins = currentActivity.admins ?? []
    const isCurrentlyAdmin = activityAdmins.includes(email)
    // Can't remove yourself as activity admin if you're the only one
    if (isCurrentlyAdmin && email === currentUserDoc?.email && activityAdmins.length === 1) return
    await updateDoc(doc(db, 'activities', currentActivity.id), {
      admins: isCurrentlyAdmin
        ? activityAdmins.filter(e => e !== email)
        : [...activityAdmins, email],
    })
  }

  // ── User profile editing (app admin only) ──
  function startEdit(u) {
    setEditingId(u.id)
    setEditForm({ displayName: u.displayName, mpAlias: u.mpAlias || '', modoAlias: u.modoAlias || '' })
  }

  async function handleSaveEdit(id) {
    await updateDoc(doc(db, 'users', id), {
      displayName: editForm.displayName.trim(),
      mpAlias: editForm.mpAlias.trim(),
      modoAlias: editForm.modoAlias.trim(),
    })
    setEditingId(null)
  }

  async function toggleAdmin(u) {
    if (u.id === currentUserDoc?.id && u.isAdmin) return
    await updateDoc(doc(db, 'users', u.id), { isAdmin: !u.isAdmin })
  }

  // ── Add new global user (app admin only) ──
  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleAddGlobal(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.displayName.trim()) { setError('Email y nombre son requeridos'); return }
    setLoading(true); setError('')
    try {
      const newEmail = form.email.trim().toLowerCase()
      await addDoc(collection(db, 'users'), {
        email: newEmail, displayName: form.displayName.trim(),
        mpAlias: form.mpAlias.trim(), modoAlias: form.modoAlias.trim(),
        addedAt: serverTimestamp(),
      })
      // Also add to current activity
      if (currentActivity && !memberEmails.includes(newEmail)) {
        await updateDoc(doc(db, 'activities', currentActivity.id), {
          members: [...memberEmails, newEmail],
        })
      }
      setForm(emptyForm); setAddingGlobal(false)
    } catch (err) { setError('Error: ' + err.message) }
    setLoading(false)
  }

  return (
    <div className="user-manager">
      <h2>{currentActivity ? `Miembros — ${currentActivity.name}` : 'Usuarios'}</h2>

      {/* Activity members */}
      <div className="users-list">
        {activityMembers.length === 0 && pendingEmails.length === 0 && (
          <div className="empty">No hay miembros en esta actividad.</div>
        )}

        {activityMembers.map(u => (
          <div key={u.id} className="user-row">
            {editingId === u.id ? (
              <>
                <input className="edit-input" value={editForm.displayName}
                  onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Nombre" style={{ width: 90 }} />
                <input className="edit-input" value={editForm.mpAlias}
                  onChange={e => setEditForm(f => ({ ...f, mpAlias: e.target.value }))}
                  placeholder="https://mpago.la/xxxxxx" style={{ flex: 1 }} />
                <input className="edit-input" value={editForm.modoAlias}
                  onChange={e => setEditForm(f => ({ ...f, modoAlias: e.target.value }))}
                  placeholder="alias MODO" style={{ flex: 1 }} />
                <button className="btn-save" onClick={() => handleSaveEdit(u.id)}>OK</button>
                <button className="btn-cancel" onClick={() => setEditingId(null)}>✕</button>
              </>
            ) : (
              <>
                <span className="badge" style={getBadgeStyle(u.displayName, activityMembers)}>{u.displayName}</span>
                <div className="user-details">
                  <span className="user-email">{u.email}</span>
                  <div className="user-roles">
                    {currentActivity?.admins?.includes(u.email) && (
                      <span className="role-badge role-activity-admin">Admin actividad</span>
                    )}
                    {u.isAdmin && (
                      <span className="role-badge role-app-admin">Admin app</span>
                    )}
                  </div>
                  <span className="user-mp-alias">
                    {u.mpAlias ? '✓ Link MP' : ''}
                    {u.mpAlias && u.modoAlias ? ' · ' : ''}
                    {u.modoAlias ? `✓ MODO: ${u.modoAlias}` : ''}
                    {!u.mpAlias && !u.modoAlias ? 'Sin medios de pago' : ''}
                  </span>
                </div>

                {/* Activity admin toggle — visible to activity admins and app admins */}
                {currentActivity && (isActivityAdmin || isAppAdmin) && (
                  <button
                    className={`btn-admin-toggle ${currentActivity.admins?.includes(u.email) ? 'is-admin' : ''}`}
                    onClick={() => toggleActivityAdmin(u.email)}
                    title={currentActivity.admins?.includes(u.email) ? 'Quitar admin de actividad' : 'Hacer admin de actividad'}
                    disabled={currentActivity.admins?.includes(u.email) && u.email === currentUserDoc?.email && (currentActivity.admins?.length ?? 0) <= 1}
                  >
                    {currentActivity.admins?.includes(u.email) ? '⚑' : '⚐'}
                  </button>
                )}

                {/* App admin toggle — only visible to app admins */}
                {isAppAdmin && (
                  <button
                    className={`btn-admin-toggle ${u.isAdmin ? 'is-admin' : ''}`}
                    onClick={() => toggleAdmin(u)}
                    title={u.isAdmin ? 'Quitar admin de app' : 'Hacer admin de app'}
                    disabled={u.id === currentUserDoc?.id && u.isAdmin}
                  >
                    {u.isAdmin ? '★' : '☆'}
                  </button>
                )}
                {isAppAdmin && (
                  <button className="btn-edit" onClick={() => startEdit(u)} title="Editar">✎</button>
                )}
                {(isActivityAdmin || isAppAdmin) && (
                  <button className="btn-delete" onClick={() => removeMemberFromActivity(u.email)} title="Quitar de actividad">x</button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Pending invites */}
        {pendingEmails.map(email => (
          <div key={email} className="user-row user-row-pending">
            <span className="pending-avatar">?</span>
            <div className="user-details">
              <span className="user-email">{email}</span>
              <span className="user-mp-alias pending-label">Invitado — aún no se registró</span>
            </div>
            {(isActivityAdmin || isAppAdmin) && (
              <button className="btn-delete" onClick={() => removeMemberFromActivity(email)} title="Quitar invitación">x</button>
            )}
          </div>
        ))}
      </div>

      {/* Add member to activity */}
      {(isActivityAdmin || isAppAdmin) && currentActivity && (
        <div className="user-add-form">
          <h4>Agregar miembro</h4>
          <div className="invite-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMemberToActivity(inviteEmail))}
              placeholder="email@gmail.com"
            />
            <button
              type="button"
              className="btn-invite-add"
              onClick={() => addMemberToActivity(inviteEmail)}
              disabled={!inviteEmail.trim()}
            >+</button>
          </div>
          <p className="member-hint">Si ya tiene cuenta, aparece arriba. Si no, queda pendiente hasta que se registre.</p>
        </div>
      )}

      {/* App admin: add new global user */}
      {isAppAdmin && (
        <div className="user-add-form" style={{ marginTop: 8 }}>
          {!addingGlobal ? (
            <button className="btn-new-activity" onClick={() => setAddingGlobal(true)}>
              + Crear usuario manualmente
            </button>
          ) : (
            <form onSubmit={handleAddGlobal}>
              <h4>Nuevo usuario</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@gmail.com" className="edit-input" />
                <input name="displayName" value={form.displayName} onChange={handleChange} placeholder="Nombre" className="edit-input" />
                <input name="mpAlias" value={form.mpAlias} onChange={handleChange} placeholder="Alias MP" className="edit-input" />
                <input name="modoAlias" value={form.modoAlias} onChange={handleChange} placeholder="Alias MODO" className="edit-input" />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-cancel" onClick={() => setAddingGlobal(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>{loading ? '...' : 'Crear'}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

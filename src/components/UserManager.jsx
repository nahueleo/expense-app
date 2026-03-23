import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'

export default function UserManager({ users, currentUserDoc, currentActivity }) {
  const [editingId, setEditingId]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [inviteEmail, setInviteEmail] = useState('')

  const currentEmail    = currentUserDoc?.email?.toLowerCase()
  const isActivityAdmin = currentActivity?.admins?.includes(currentEmail) ?? false

  const memberEmails    = currentActivity?.members ?? []
  const activityMembers = users.filter(u => memberEmails.map(e => e.toLowerCase()).includes(u.email))
  const pendingEmails   = memberEmails.filter(email => !users.find(u => u.email === email.toLowerCase()))

  // ── Member management ──
  async function addMember(email) {
    const normalized = email.trim().toLowerCase()
    if (!currentActivity || !normalized || memberEmails.map(e => e.toLowerCase()).includes(normalized)) return
    await updateDoc(doc(db, 'activities', currentActivity.id), {
      members: [...memberEmails, normalized],
    })
    setInviteEmail('')
  }

  async function removeMember(email) {
    if (!currentActivity) return
    if (!window.confirm(`Quitar a ${email} de esta actividad?`)) return
    const admins = (currentActivity.admins ?? []).filter(e => e !== email)
    await updateDoc(doc(db, 'activities', currentActivity.id), {
      members: memberEmails.filter(e => e !== email),
      admins,
    })
  }

  async function toggleActivityAdmin(email) {
    const admins = currentActivity.admins ?? []
    const isNow  = admins.includes(email)
    if (isNow && email === currentEmail && admins.length <= 1) return // last admin
    await updateDoc(doc(db, 'activities', currentActivity.id), {
      admins: isNow ? admins.filter(e => e !== email) : [...admins, email],
    })
  }

  // ── Profile editing (any activity admin can edit members' profiles) ──
  function startEdit(u) {
    setEditingId(u.id)
    setEditForm({ displayName: u.displayName, mpAlias: u.mpAlias || '', modoAlias: u.modoAlias || '' })
  }

  async function saveEdit(id) {
    await updateDoc(doc(db, 'users', id), {
      displayName: editForm.displayName.trim(),
      mpAlias: editForm.mpAlias.trim(),
      modoAlias: editForm.modoAlias.trim(),
    })
    setEditingId(null)
  }

  return (
    <div className="user-manager">
      <h2>Miembros — {currentActivity?.name}</h2>

      <div className="users-list">
        {activityMembers.length === 0 && pendingEmails.length === 0 && (
          <div className="empty">No hay miembros en esta actividad.</div>
        )}

        {activityMembers.map(u => {
          const uEmail   = u.email?.toLowerCase()
          const uIsAdmin = currentActivity?.admins?.includes(uEmail)

          return (
            <div key={u.id} className={editingId === u.id ? 'user-edit-card' : 'user-row'}>
              {editingId === u.id ? (
                <>
                  <div className="form-group">
                    <label>Nombre</label>
                    <input className="edit-input" value={editForm.displayName}
                      onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                      placeholder="Nombre" />
                  </div>
                  <div className="form-group">
                    <label>Link MP (mpago.la/...)</label>
                    <input className="edit-input" value={editForm.mpAlias}
                      onChange={e => setEditForm(f => ({ ...f, mpAlias: e.target.value }))}
                      placeholder="https://mpago.la/xxxxxx" />
                  </div>
                  <div className="form-group">
                    <label>Alias MODO</label>
                    <input className="edit-input" value={editForm.modoAlias}
                      onChange={e => setEditForm(f => ({ ...f, modoAlias: e.target.value }))}
                      placeholder="alias.modo" />
                  </div>
                  <div className="user-edit-actions">
                    <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button className="btn-save" onClick={() => saveEdit(u.id)}>Guardar</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="badge" style={getBadgeStyle(u.displayName, activityMembers)}>
                    {u.displayName}
                  </span>
                  <div className="user-details">
                    <span className="user-email">{u.email}</span>
                    {uIsAdmin && (
                      <div className="user-roles">
                        <span className="role-badge role-activity-admin">Admin</span>
                      </div>
                    )}
                    <span className="user-mp-alias">
                      {[u.mpAlias && '✓ Link MP', u.modoAlias && `✓ MODO: ${u.modoAlias}`]
                        .filter(Boolean).join(' · ') || 'Sin medios de pago'}
                    </span>
                  </div>

                  {isActivityAdmin && (
                    <>
                      <button
                        className={`btn-admin-toggle ${uIsAdmin ? 'is-admin' : ''}`}
                        onClick={() => toggleActivityAdmin(uEmail)}
                        title={uIsAdmin ? 'Quitar admin' : 'Hacer admin'}
                        disabled={uIsAdmin && uEmail === currentEmail && (currentActivity.admins?.length ?? 0) <= 1}
                      >
                        {uIsAdmin ? '⚑' : '⚐'}
                      </button>
                      <button className="btn-edit" onClick={() => startEdit(u)} title="Editar">✎</button>
                      <button className="btn-delete" onClick={() => removeMember(uEmail)} title="Quitar">x</button>
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}

        {pendingEmails.map(email => (
          <div key={email} className="user-row user-row-pending">
            <span className="pending-avatar">?</span>
            <div className="user-details">
              <span className="user-email">{email}</span>
              <span className="user-mp-alias pending-label">Invitado — aún no se registró</span>
            </div>
            {isActivityAdmin && (
              <button className="btn-delete" onClick={() => removeMember(email)} title="Quitar invitación">x</button>
            )}
          </div>
        ))}
      </div>

      {isActivityAdmin && (
        <div className="user-add-form">
          <h4>Agregar miembro</h4>
          <div className="invite-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember(inviteEmail))}
              placeholder="email@gmail.com"
            />
            <button type="button" className="btn-invite-add" onClick={() => addMember(inviteEmail)} disabled={!inviteEmail.trim()}>
              +
            </button>
          </div>
          <p className="member-hint">Si ya tiene cuenta aparece arriba. Si no, queda pendiente hasta que se registre.</p>
        </div>
      )}
    </div>
  )
}

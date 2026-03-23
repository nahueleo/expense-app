import { useState } from 'react'
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'

const emptyForm = { email: '', displayName: '', mpAlias: '', modoAlias: '' }

export default function UserManager({ users, currentUserDoc }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.displayName.trim()) {
      setError('Email y nombre son requeridos')
      return
    }
    setLoading(true)
    setError('')
    try {
      await addDoc(collection(db, 'users'), {
        email: form.email.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        mpAlias: form.mpAlias.trim(),
        modoAlias: form.modoAlias.trim(),
        addedAt: serverTimestamp(),
      })
      setForm(emptyForm)
    } catch (err) {
      setError('Error: ' + err.message)
    }
    setLoading(false)
  }

  async function handleRemove(id, name) {
    if (!window.confirm(`Eliminar usuario "${name}"?`)) return
    await deleteDoc(doc(db, 'users', id))
    if (editingId === id) setEditingId(null)
  }

  async function toggleAdmin(u) {
    // Can't remove your own admin
    if (u.id === currentUserDoc?.id && u.isAdmin) return
    await updateDoc(doc(db, 'users', u.id), { isAdmin: !u.isAdmin })
  }

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

  return (
    <div className="user-manager">
      <h2>Usuarios registrados</h2>

      <div className="users-list">
        {users.length === 0 && (
          <div className="empty">No hay usuarios registrados todavia.</div>
        )}
        {users.map(u => (
          <div key={u.id} className="user-row">
            {editingId === u.id ? (
              <>
                <input
                  className="edit-input"
                  value={editForm.displayName}
                  onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Nombre"
                  style={{ width: 100 }}
                />
                <input
                  className="edit-input"
                  value={editForm.mpAlias}
                  onChange={e => setEditForm(f => ({ ...f, mpAlias: e.target.value }))}
                  placeholder="alias.mp"
                  style={{ flex: 1 }}
                />
                <input
                  className="edit-input"
                  value={editForm.modoAlias}
                  onChange={e => setEditForm(f => ({ ...f, modoAlias: e.target.value }))}
                  placeholder="alias.modo"
                  style={{ flex: 1 }}
                />
                <span className="user-email" style={{ fontSize: 12 }}>{u.email}</span>
                <button className="btn-save" onClick={() => handleSaveEdit(u.id)}>OK</button>
                <button className="btn-cancel" onClick={() => setEditingId(null)}>✕</button>
              </>
            ) : (
              <>
                <span className="badge" style={getBadgeStyle(u.displayName, users)}>
                  {u.displayName}
                </span>
                <div className="user-details">
                  <span className="user-email">{u.email}</span>
                  {u.mpAlias
                    ? <span className="user-mp-alias">MP: {u.mpAlias}</span>
                    : <span className="user-mp-alias" style={{ color: '#aaa' }}>Sin alias MP</span>
                  }
                  {u.modoAlias
                    ? <span className="user-mp-alias">MODO: {u.modoAlias}</span>
                    : <span className="user-mp-alias" style={{ color: '#aaa' }}>Sin alias MODO</span>
                  }
                </div>
                <button
                  className={`btn-admin-toggle ${u.isAdmin ? 'is-admin' : ''}`}
                  onClick={() => toggleAdmin(u)}
                  title={u.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                  disabled={u.id === currentUserDoc?.id && u.isAdmin}
                >
                  {u.isAdmin ? '★' : '☆'}
                </button>
                <button className="btn-edit" onClick={() => startEdit(u)} title="Editar">✎</button>
                <button className="btn-delete" onClick={() => handleRemove(u.id, u.displayName)}>x</button>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="user-add-form">
        <h4>Agregar usuario</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Email (Gmail)</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="caro@gmail.com"
            />
          </div>
          <div className="form-group">
            <label>Nombre</label>
            <input
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              placeholder="Caro"
            />
          </div>
          <div className="form-group">
            <label>Alias MP</label>
            <input
              name="mpAlias"
              value={form.mpAlias}
              onChange={handleChange}
              placeholder="caro.mp"
            />
          </div>
          <div className="form-group">
            <label>Alias MODO</label>
            <input
              name="modoAlias"
              value={form.modoAlias}
              onChange={handleChange}
              placeholder="caro.modo"
            />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Agregando...' : 'Agregar usuario'}
        </button>
      </form>

    </div>
  )
}

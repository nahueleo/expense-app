import { useState } from 'react'
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'

const emptyForm = { email: '', displayName: '', mpAlias: '' }

export default function UserManager({ users }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
            <span className="badge" style={getBadgeStyle(u.displayName, users)}>
              {u.displayName}
            </span>
            <div className="user-details">
              <span className="user-email">{u.email}</span>
              {u.mpAlias && <span className="user-mp-alias">MP: {u.mpAlias}</span>}
            </div>
            <button className="btn-delete" onClick={() => handleRemove(u.id, u.displayName)}>x</button>
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
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Agregando...' : 'Agregar usuario'}
        </button>
      </form>
    </div>
  )
}

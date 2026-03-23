import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const EMOJIS = ['✈️','🏔️','🏖️','🎉','🏕️','🚗','🛳️','🎿','🏄','🎭','🍽️','🏠','⚽','🎸','💼','🌍']
const TYPES  = ['Viaje','Evento','Casa','Deporte','Trabajo','Otro']

export default function ActivitySwitcher({ activities, currentActivityId, onSelect, currentUserEmail, users }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '✈️', type: 'Viaje', members: [] })
  const [saving, setSaving] = useState(false)

  const current = activities.find(a => a.id === currentActivityId)

  function toggleMember(email) {
    setForm(f => ({
      ...f,
      members: f.members.includes(email)
        ? f.members.filter(e => e !== email)
        : [...f.members, email],
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const members = form.members.length > 0 ? form.members : users.map(u => u.email)
    const ref = await addDoc(collection(db, 'activities'), {
      name: form.name.trim(),
      emoji: form.emoji,
      type: form.type,
      members,
      admins: [currentUserEmail],
      createdBy: currentUserEmail,
      createdAt: serverTimestamp(),
    })
    setSaving(false)
    setCreating(false)
    setForm({ name: '', emoji: '✈️', type: 'Viaje', members: [] })
    onSelect(ref.id)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger in header */}
      <button className="activity-trigger" onClick={() => setOpen(true)}>
        <span className="activity-trigger-emoji">{current?.emoji ?? '🌍'}</span>
        <span className="activity-trigger-name">{current?.name ?? 'Todas las actividades'}</span>
        <span className="activity-trigger-chevron">⌄</span>
      </button>

      {/* Bottom sheet */}
      {open && (
        <div className="sheet-overlay" onClick={() => { setOpen(false); setCreating(false) }}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            {!creating ? (
              <>
                <h3 className="sheet-title">Actividades</h3>

                <div className="activity-list">
                  {/* All */}
                  <button
                    className={`activity-item ${!currentActivityId ? 'active' : ''}`}
                    onClick={() => { onSelect(null); setOpen(false) }}
                  >
                    <span className="activity-item-emoji">🌍</span>
                    <div className="activity-item-info">
                      <span className="activity-item-name">Todas las actividades</span>
                    </div>
                    {!currentActivityId && <span className="activity-check">✓</span>}
                  </button>

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
                      placeholder="Viaje Ushuaia 2026"
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Participantes</label>
                    <div className="member-picker">
                      {users.map(u => (
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
                    <p className="member-hint">Sin selección = todos</p>
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
        </div>
      )}
    </>
  )
}

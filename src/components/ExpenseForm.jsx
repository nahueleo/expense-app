import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const today = new Date()
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

const emptyForm = {
  name: '',
  payer: '',
  installments: 1,
  totalAmount: '',
  firstPaymentMonth: defaultMonth,
}

export default function ExpenseForm({ user, users, onAdded, activities, currentActivityId }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const installmentAmount = form.totalAmount && form.installments
    ? (parseFloat(form.totalAmount) / parseInt(form.installments)).toFixed(2)
    : 0

  const sharePerPerson = form.totalAmount && users.length > 0
    ? (parseFloat(form.totalAmount) / parseInt(form.installments) / users.length).toFixed(2)
    : 0

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.totalAmount || !form.payer) {
      setError('Completa todos los campos')
      return
    }
    setError('')
    setLoading(true)
    try {
      await addDoc(collection(db, 'expenses'), {
        name: form.name.trim(),
        payer: form.payer,
        installments: parseInt(form.installments),
        totalAmount: parseFloat(form.totalAmount),
        firstPaymentMonth: form.firstPaymentMonth,
        createdAt: serverTimestamp(),
        createdBy: user?.displayName || user?.email || 'desconocido',
        ...(currentActivityId ? { activityId: currentActivityId } : {}),
      })
      setForm(emptyForm)
      onAdded?.()
    } catch (err) {
      setError('Error al guardar: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <h2>Agregar Gasto</h2>

      <div className="form-row">
        <div className="form-group">
          <label>Descripcion</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="CR2026, Vuelos, Dpto..."
            required
          />
        </div>

        <div className="form-group">
          <label>Quien pago</label>
          <select name="payer" value={form.payer} onChange={handleChange} required>
            <option value="">Seleccionar...</option>
            {users.map(u => (
              <option key={u.id} value={u.email}>{u.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Importe total ($)</label>
          <input
            name="totalAmount"
            type="number"
            min="0"
            step="0.01"
            value={form.totalAmount}
            onChange={handleChange}
            placeholder="960000"
            required
          />
        </div>

        <div className="form-group">
          <label>Cuotas</label>
          <input
            name="installments"
            type="number"
            min="1"
            max="120"
            value={form.installments}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Primer mes de pago</label>
          <input
            name="firstPaymentMonth"
            type="month"
            value={form.firstPaymentMonth}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {form.totalAmount > 0 && (
        <div className="form-preview">
          <span>Cuota mensual: <strong>${parseFloat(installmentAmount).toLocaleString('es-AR')}</strong></span>
          {users.length > 0 && (
            <span>C/U ({users.length} personas): <strong>${parseFloat(sharePerPerson).toLocaleString('es-AR')}</strong></span>
          )}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Guardando...' : 'Agregar gasto'}
      </button>
    </form>
  )
}

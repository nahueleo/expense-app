import { useState } from 'react'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'
import { getPayerDisplay } from '../utils/users'

function formatMonth(ym) {
  const [year, month] = ym.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

function formatARS(n) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const today = new Date()
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

export default function ExpenseList({ expenses, users }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  async function handleDelete(id, name) {
    if (!window.confirm(`Eliminar "${name}"?`)) return
    await deleteDoc(doc(db, 'expenses', id))
  }

  function startEdit(exp) {
    setEditingId(exp.id)
    setEditForm({
      name: exp.name,
      payer: exp.payer,
      installments: exp.installments,
      totalAmount: exp.totalAmount,
      firstPaymentMonth: exp.firstPaymentMonth,
    })
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(f => ({ ...f, [name]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await updateDoc(doc(db, 'expenses', editingId), {
      name: editForm.name.trim(),
      payer: editForm.payer,
      installments: parseInt(editForm.installments),
      totalAmount: parseFloat(editForm.totalAmount),
      firstPaymentMonth: editForm.firstPaymentMonth,
    })
    setSaving(false)
    setEditingId(null)
  }

  if (expenses.length === 0) {
    return <div className="empty">No hay gastos cargados todavia.</div>
  }

  return (
    <div className="expense-list">
      <h2>Gastos ({expenses.length})</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Gasto</th>
              <th>Pago</th>
              <th>Cuotas</th>
              <th>Total</th>
              <th>Cuota/mes</th>
              <th>C/U</th>
              <th>Primer mes</th>
              <th>Cargado por</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => {
              const installmentAmt = exp.totalAmount / exp.installments
              const sharePerPerson = users.length > 0
                ? installmentAmt / users.length
                : installmentAmt / 3

              if (editingId === exp.id) {
                return (
                  <tr key={exp.id} className="editing-row">
                    <td>
                      <input
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="edit-input"
                      />
                    </td>
                    <td>
                      <select name="payer" value={editForm.payer} onChange={handleEditChange} className="edit-input">
                        {users.map(u => (
                          <option key={u.id} value={u.displayName}>{u.displayName}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        name="installments"
                        type="number"
                        min="1"
                        value={editForm.installments}
                        onChange={handleEditChange}
                        className="edit-input edit-input-sm"
                      />
                    </td>
                    <td>
                      <input
                        name="totalAmount"
                        type="number"
                        value={editForm.totalAmount}
                        onChange={handleEditChange}
                        className="edit-input"
                      />
                    </td>
                    <td className="right">—</td>
                    <td className="right">—</td>
                    <td>
                      <input
                        name="firstPaymentMonth"
                        type="month"
                        value={editForm.firstPaymentMonth}
                        onChange={handleEditChange}
                        className="edit-input"
                      />
                    </td>
                    <td></td>
                    <td className="edit-actions">
                      <button className="btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? '...' : 'OK'}
                      </button>
                      <button className="btn-cancel" onClick={() => setEditingId(null)}>✕</button>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={exp.id}>
                  <td>{exp.name}</td>
                  <td>
                    <span className="badge" style={getBadgeStyle(getPayerDisplay(exp.payer, users), users)}>
                      {getPayerDisplay(exp.payer, users)}
                    </span>
                  </td>
                  <td className="center">{exp.installments}</td>
                  <td className="right">${formatARS(exp.totalAmount)}</td>
                  <td className="right">${formatARS(installmentAmt)}</td>
                  <td className="right">${formatARS(sharePerPerson)}</td>
                  <td className="center">{formatMonth(exp.firstPaymentMonth)}</td>
                  <td className="text-muted">{exp.createdBy || '—'}</td>
                  <td className="row-actions">
                    <button className="btn-edit" onClick={() => startEdit(exp)} title="Editar">✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(exp.id, exp.name)} title="Eliminar">x</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

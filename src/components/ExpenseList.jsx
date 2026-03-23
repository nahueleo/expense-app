import { useState } from 'react'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'
import { getPayerDisplay } from '../utils/users'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthDiff(from, to) {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

function formatMonthLabel(ym) {
  const [year, month] = ym.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

function formatARS(n) {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getPaidInstallments(exp, currentMonth) {
  if (currentMonth < exp.firstPaymentMonth) return 0
  return Math.min(exp.installments, monthDiff(exp.firstPaymentMonth, currentMonth) + 1)
}

function getExpenseStatus(exp, currentMonth) {
  const lastMonth = addMonths(exp.firstPaymentMonth, exp.installments - 1)
  if (currentMonth > lastMonth) return 'finished'
  if (currentMonth < exp.firstPaymentMonth) return 'pending'
  return 'active'
}

export default function ExpenseList({ expenses, users }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const currentMonth = getCurrentMonth()
  const n = users.length || 3

  // ── Global stats ──
  const totalAmount = expenses.reduce((s, e) => s + e.totalAmount, 0)
  const totalPaid = expenses.reduce((s, e) => {
    const paid = getPaidInstallments(e, currentMonth)
    return s + paid * (e.totalAmount / e.installments)
  }, 0)
  const totalRemaining = totalAmount - totalPaid
  const lastPaymentMonth = expenses.reduce((max, e) => {
    const last = addMonths(e.firstPaymentMonth, e.installments - 1)
    return last > max ? last : max
  }, '')
  const activeCount = expenses.filter(e => getExpenseStatus(e, currentMonth) === 'active').length
  const finishedCount = expenses.filter(e => getExpenseStatus(e, currentMonth) === 'finished').length
  const monthsLeft = lastPaymentMonth ? Math.max(0, monthDiff(currentMonth, lastPaymentMonth)) : 0

  // ── Edit handlers ──
  async function handleDelete(id, name) {
    if (!window.confirm(`Eliminar "${name}"?`)) return
    await deleteDoc(doc(db, 'expenses', id))
  }

  function startEdit(exp) {
    let payerEmail = exp.payer
    if (exp.payer && !exp.payer.includes('@')) {
      const found = users.find(u => u.displayName === exp.payer)
      if (found) payerEmail = found.email
    }
    setEditingId(exp.id)
    setEditForm({
      name: exp.name,
      payer: payerEmail,
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
    <div className="expense-list-v2">

      {/* ── Summary stats ── */}
      <div className="exp-stats-grid">
        <div className="exp-stat">
          <div className="exp-stat-value">${formatARS(totalAmount)}</div>
          <div className="exp-stat-label">Total comprometido</div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-value green">${formatARS(totalPaid)}</div>
          <div className="exp-stat-label">Ya pagado</div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-value red">${formatARS(totalRemaining)}</div>
          <div className="exp-stat-label">Por pagar</div>
        </div>
      </div>

      <div className="exp-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="exp-stat">
          <div className="exp-stat-value">{activeCount}</div>
          <div className="exp-stat-label">Activos</div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-value">{finishedCount}</div>
          <div className="exp-stat-label">Terminados</div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-value">{monthsLeft === 0 ? '✓' : `${monthsLeft}m`}</div>
          <div className="exp-stat-label">
            {monthsLeft === 0 ? 'Todo pago' : `Hasta ${formatMonthLabel(lastPaymentMonth)}`}
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="exp-overall-progress">
        <div className="exp-overall-bar">
          <div
            className="exp-overall-fill"
            style={{ width: `${totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0}%` }}
          />
        </div>
        <span className="exp-overall-pct">
          {totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0}% pagado
        </span>
      </div>

      {/* ── Expense cards ── */}
      <div className="exp-cards">
        {expenses.map(exp => {
          const installmentAmt = exp.totalAmount / exp.installments
          const sharePerPerson = installmentAmt / n
          const paidInstallments = getPaidInstallments(exp, currentMonth)
          const paidAmount = paidInstallments * installmentAmt
          const remainingAmt = exp.totalAmount - paidAmount
          const pct = Math.round((paidInstallments / exp.installments) * 100)
          const lastMonth = addMonths(exp.firstPaymentMonth, exp.installments - 1)
          const status = getExpenseStatus(exp, currentMonth)
          const payerName = getPayerDisplay(exp.payer, users)

          if (editingId === exp.id) {
            return (
              <div key={exp.id} className="exp-card editing">
                <div className="exp-edit-grid">
                  <div className="form-group">
                    <label>Descripcion</label>
                    <input name="name" value={editForm.name} onChange={handleEditChange} className="edit-input" />
                  </div>
                  <div className="form-group">
                    <label>Quien pago</label>
                    <select name="payer" value={editForm.payer} onChange={handleEditChange} className="edit-input">
                      {users.map(u => <option key={u.id} value={u.email}>{u.displayName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Total ($)</label>
                    <input name="totalAmount" type="number" value={editForm.totalAmount} onChange={handleEditChange} className="edit-input" />
                  </div>
                  <div className="form-group">
                    <label>Cuotas</label>
                    <input name="installments" type="number" min="1" value={editForm.installments} onChange={handleEditChange} className="edit-input" />
                  </div>
                  <div className="form-group">
                    <label>Primer mes</label>
                    <input name="firstPaymentMonth" type="month" value={editForm.firstPaymentMonth} onChange={handleEditChange} className="edit-input" />
                  </div>
                </div>
                <div className="exp-edit-actions">
                  <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Guardar'}</button>
                  <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </div>
            )
          }

          return (
            <div key={exp.id} className={`exp-card status-${status}`}>
              <div className="exp-card-header">
                <div className="exp-card-title-row">
                  <span className="exp-card-name">{exp.name}</span>
                  <span className={`exp-status-pill status-${status}`}>
                    {status === 'active' ? 'Activo' : status === 'finished' ? 'Terminado' : 'Pendiente'}
                  </span>
                </div>
                <div className="exp-card-meta">
                  <span className="badge" style={getBadgeStyle(payerName, users)}>{payerName}</span>
                  {exp.installments > 1
                    ? <span className="exp-meta-text">{paidInstallments}/{exp.installments} cuotas</span>
                    : <span className="exp-meta-text">Pago único</span>
                  }
                  <span className="exp-meta-text">{formatMonthLabel(exp.firstPaymentMonth)} → {formatMonthLabel(lastMonth)}</span>
                </div>
              </div>

              {exp.installments > 1 && (
                <div className="exp-progress-wrap">
                  <div className="exp-progress-bar">
                    <div className="exp-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="exp-progress-pct">{pct}%</span>
                </div>
              )}

              <div className="exp-card-amounts">
                <div className="exp-amount-item">
                  <span className="exp-amount-label">Total</span>
                  <span className="exp-amount-value">${formatARS(exp.totalAmount)}</span>
                </div>
                {exp.installments > 1 && (
                  <>
                    <div className="exp-amount-item">
                      <span className="exp-amount-label">Pagado</span>
                      <span className="exp-amount-value green">${formatARS(paidAmount)}</span>
                    </div>
                    <div className="exp-amount-item">
                      <span className="exp-amount-label">Resta</span>
                      <span className="exp-amount-value red">${formatARS(remainingAmt)}</span>
                    </div>
                  </>
                )}
                <div className="exp-amount-item">
                  <span className="exp-amount-label">Cuota/mes</span>
                  <span className="exp-amount-value">${formatARS(installmentAmt)}</span>
                </div>
                <div className="exp-amount-item">
                  <span className="exp-amount-label">C/U</span>
                  <span className="exp-amount-value">${formatARS(sharePerPerson)}</span>
                </div>
              </div>

              <div className="exp-card-footer">
                {exp.createdBy && <span className="exp-created-by">Cargado por {exp.createdBy}</span>}
                <div className="row-actions">
                  <button className="btn-edit" onClick={() => startEdit(exp)} title="Editar">✎</button>
                  <button className="btn-delete" onClick={() => handleDelete(exp.id, exp.name)} title="Eliminar">x</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

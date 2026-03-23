import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

const PAYERS = ['nahuel', 'Caro', 'Juli']

function formatMonth(ym) {
  const [year, month] = ym.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

function formatARS(n) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ExpenseList({ expenses, onDeleted }) {
  async function handleDelete(id, name) {
    if (!window.confirm(`Eliminar "${name}"?`)) return
    await deleteDoc(doc(db, 'expenses', id))
    onDeleted?.()
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
              <th>Importe total</th>
              <th>Cuota mensual</th>
              <th>C/U</th>
              <th>Primer mes</th>
              <th>Cargado por</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => {
              const installmentAmt = exp.totalAmount / exp.installments
              const sharePerPerson = installmentAmt / PAYERS.length
              return (
                <tr key={exp.id}>
                  <td>{exp.name}</td>
                  <td><span className={`badge badge-${exp.payer}`}>{exp.payer}</span></td>
                  <td className="center">{exp.installments}</td>
                  <td className="right">${formatARS(exp.totalAmount)}</td>
                  <td className="right">${formatARS(installmentAmt)}</td>
                  <td className="right">${formatARS(sharePerPerson)}</td>
                  <td className="center">{formatMonth(exp.firstPaymentMonth)}</td>
                  <td className="text-muted">{exp.createdBy || '—'}</td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(exp.id, exp.name)}
                      title="Eliminar"
                    >
                      x
                    </button>
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

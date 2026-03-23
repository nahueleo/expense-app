import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function PaidBadge({ payment }) {
  if (!payment) return null

  const date = (() => {
    if (!payment.paidAt) return null
    const d = payment.paidAt.toDate?.() ?? new Date(payment.paidAt)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  })()

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este pago? Los balances volverán a mostrar la deuda.')) return
    await deleteDoc(doc(db, 'payments', payment.id))
  }

  return (
    <span className="paid-badge-wrap">
      <span className="paid-label">✓ Pagado{date ? ` el ${date}` : ''}</span>
      <button className="btn-delete-payment" onClick={handleDelete} title="Eliminar pago">×</button>
    </span>
  )
}

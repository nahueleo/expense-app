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
    if (!window.confirm('¿Anular este pago? La deuda volverá a aparecer.')) return
    await deleteDoc(doc(db, 'payments', payment.id))
  }

  return (
    <span className="paid-badge-wrap">
      <span className="paid-label">✓ Pagado{date ? ` el ${date}` : ''}</span>
      <button className="btn-anular" onClick={handleDelete}>Anular</button>
    </span>
  )
}

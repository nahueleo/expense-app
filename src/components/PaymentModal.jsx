import { createPortal } from 'react-dom'
import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'
import { formatARS } from '../utils/format'
import { formatMonthLabel, getCurrentMonth, addMonths } from '../utils/dates'

const FUTURE_MONTHS = 3

function buildMonthOptions() {
  const now = getCurrentMonth()
  return Array.from({ length: FUTURE_MONTHS + 1 }, (_, i) => addMonths(now, i))
}

export default function PaymentModal({ transaction, toUser, activityId, fromName, users, onClose, initialMonth }) {
  const [forMonth, setForMonth]   = useState(() => initialMonth || getCurrentMonth())
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied]       = useState(null)
  const monthOptions              = buildMonthOptions()

  const alias = toUser?.mpAlias || toUser?.modoAlias || null

  async function handleConfirm() {
    setConfirming(true)
    await addDoc(collection(db, 'payments'), {
      activityId,
      fromName,
      toName: transaction.to,
      fromEmail: '',   // can be enriched if needed
      toEmail: toUser?.email || '',
      amount: transaction.amount,
      forMonth,
      paidAt: serverTimestamp(),
    })
    onClose()
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet payment-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3 className="sheet-title">Confirmar pago</h3>

        {/* Who → Who */}
        <div className="payment-flow">
          <span className="badge" style={getBadgeStyle(fromName, users)}>{fromName}</span>
          <span className="payment-arrow">→</span>
          <span className="badge" style={getBadgeStyle(transaction.to, users)}>{transaction.to}</span>
        </div>

        {/* Amount */}
        <div className="payment-amount-display">
          <span className="payment-amount-label">Importe</span>
          <span className="payment-amount-value">${formatARS(transaction.amount)}</span>
        </div>

        {/* Month selector */}
        <div className="form-group">
          <label>Corresponde al mes</label>
          <select value={forMonth} onChange={e => setForMonth(e.target.value)}>
            {monthOptions.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>

        {/* Payment aliases */}
        {toUser?.mpAlias && (
          <div className="payment-alias-row">
            <div className="payment-alias-info">
              <span className="payment-alias-label">Mercado Pago</span>
              <span className="payment-alias-value">{toUser.mpAlias}</span>
            </div>
            <button
              className="btn-copy"
              onClick={() => copyToClipboard(toUser.mpAlias, 'mp')}
            >
              {copied === 'mp' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        )}

        {toUser?.modoAlias && (
          <div className="payment-alias-row">
            <div className="payment-alias-info">
              <span className="payment-alias-label">MODO</span>
              <span className="payment-alias-value">{toUser.modoAlias}</span>
            </div>
            <button
              className="btn-copy"
              onClick={() => copyToClipboard(toUser.modoAlias, 'modo')}
            >
              {copied === 'modo' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        )}

        {!alias && (
          <p className="payment-no-alias">
            {transaction.to} no tiene alias configurado. Pedile que lo agregue en su perfil.
          </p>
        )}

        {/* Actions */}
        <div className="payment-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="btn-confirm-payment"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? '...' : '✓ Ya pagué'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

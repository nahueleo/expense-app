import { createPortal } from 'react-dom'
import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getBadgeStyle } from '../utils/badges'
import { formatARS } from '../utils/format'
import { formatMonthLabel, getCurrentMonth } from '../utils/dates'

export default function PaymentModal({ transaction, toUser, activityId, fromName, users, onClose, initialMonth }) {
  const forMonth = initialMonth || getCurrentMonth()
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied]       = useState(null)
  const [err, setErr]             = useState('')

  const alias = toUser?.mpAlias || toUser?.modoAlias || null

  async function handleConfirm() {
    setConfirming(true)
    setErr('')
    try {
      await addDoc(collection(db, 'payments'), {
        activityId,
        fromName,
        toName: transaction.to,
        toEmail: toUser?.email || '',
        amount: transaction.amount,
        forMonth,
        paidAt: serverTimestamp(),
      })
      onClose()
    } catch (e) {
      setErr('Error al guardar: ' + e.message)
      setConfirming(false)
    }
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  async function openApp(alias, scheme) {
    try { await navigator.clipboard.writeText(alias) } catch (_) {}
    window.location.href = scheme
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

        <p className="payment-month-label">Mes: <strong>{formatMonthLabel(forMonth)}</strong></p>

        {/* Payment aliases */}
        {toUser?.mpAlias && (
          <div className="payment-alias-row">
            <div className="payment-alias-info">
              <span className="payment-alias-label">Mercado Pago</span>
              <span className="payment-alias-value">{toUser.mpAlias}</span>
            </div>
            <div className="alias-actions">
              <button className="btn-copy" onClick={() => copyToClipboard(toUser.mpAlias, 'mp')}>
                {copied === 'mp' ? '✓ Copiado' : 'Copiar alias'}
              </button>
              <button
                className="btn-open-app btn-open-mp"
                onClick={() => openApp(toUser.mpAlias, 'mercadopago://')}
              >
                Abrir MP
              </button>
            </div>
          </div>
        )}

        {toUser?.modoAlias && (
          <div className="payment-alias-row">
            <div className="payment-alias-info">
              <span className="payment-alias-label">MODO</span>
              <span className="payment-alias-value">{toUser.modoAlias}</span>
            </div>
            <div className="alias-actions">
              <button className="btn-copy" onClick={() => copyToClipboard(toUser.modoAlias, 'modo')}>
                {copied === 'modo' ? '✓ Copiado' : 'Copiar alias'}
              </button>
              <button
                className="btn-open-app btn-open-modo"
                onClick={() => openApp(toUser.modoAlias, 'modo://')}
              >
                Abrir MODO
              </button>
            </div>
          </div>
        )}

        {!alias && (
          <p className="payment-no-alias">
            {transaction.to} no tiene alias configurado. Pedile que lo agregue en su perfil.
          </p>
        )}

        {/* Actions */}
        {err && <p className="form-error">{err}</p>}

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

import { useMemo, useState } from 'react'
import { getBadgeStyle } from '../utils/badges'
import { getMonthsRange, formatMonthLabel } from '../utils/dates'
import { formatARS } from '../utils/format'
import { getActiveExpenses, calculateBalances, simplifyDebts, applyPayments } from '../utils/finance'
import PaymentModal from './PaymentModal'
import PaidBadge from './PaidBadge'

export default function MonthlySummary({ expenses, users, currentUserEmail, payments = [], activityId }) {
  const [expanded, setExpanded]                   = useState({})
  const [payingTransaction, setPayingTransaction] = useState(null)
  const [payingMonth, setPayingMonth]             = useState(null)

  const people     = users.map(u => u.displayName)
  const myName     = users.find(u => u.email === currentUserEmail?.toLowerCase())?.displayName
  const userByName = Object.fromEntries(users.map(u => [u.displayName, u]))
  const months     = useMemo(() => getMonthsRange(expenses), [expenses])

  if (!expenses.length) return <div className="empty">No hay gastos cargados.</div>

  return (
    <div className="monthly-summary">
      <h2>Historial</h2>
      <div className="months-list">
        {months.map(month => {
          const active       = getActiveExpenses(expenses, month)
          const rawBalances  = calculateBalances(expenses, month, people, users)
          const balances     = applyPayments(rawBalances, payments, month)
          const totalMonth   = active.reduce((s, e) => s + e.totalAmount / e.installments, 0)

          // Guard: no transactions for months without active expenses
          const transactions = active.length > 0 ? simplifyDebts(balances, people) : []
          const myBalance    = active.length > 0 && myName != null ? balances[myName] : null
          const isExpanded   = expanded[month]

          const getPayment = (fromName, toName) =>
            payments.find(p => p.fromName === fromName && p.toName === toName && p.forMonth === month) ?? null

          const allPaid = transactions.length > 0 && transactions.every(t => getPayment(t.from, t.to))

          return (
            <div key={month} className="month-card">
              <button className="month-header" onClick={() => setExpanded(e => ({ ...e, [month]: !e[month] }))}>
                <div className="month-title">
                  <span className="month-name">{formatMonthLabel(month)}</span>
                  <span className="month-total">${formatARS(totalMonth)}</span>
                  {allPaid && <span className="month-all-paid">✓ Saldado</span>}
                  {!allPaid && myBalance !== null && (
                    <span className={`my-balance-pill ${myBalance >= 0 ? 'positive' : 'negative'}`}>
                      {myBalance >= 0 ? '+' : ''}${formatARS(myBalance)}
                    </span>
                  )}
                </div>
                <span className="month-chevron">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="month-body">
                  {transactions.length === 0 ? (
                    <div className="no-debts">Sin deudas este mes</div>
                  ) : (
                    <div className="history-transactions">
                      {transactions.map((t, i) => {
                        const payment  = getPayment(t.from, t.to)
                        const isMyDebt = t.from === myName

                        return (
                          <div key={i} className={`history-row ${payment ? 'history-row-paid' : ''} ${isMyDebt ? 'history-row-mine' : ''}`}>
                            <div className="history-row-left">
                              <span className="badge" style={getBadgeStyle(t.from, users)}>{t.from}</span>
                              <span className="history-arrow">→</span>
                              <span className="badge" style={getBadgeStyle(t.to, users)}>{t.to}</span>
                            </div>
                            <div className="history-row-right">
                              <span className={`history-amount ${payment ? 'paid-text' : isMyDebt ? 'negative-text' : ''}`}>
                                ${formatARS(t.amount)}
                              </span>
                              {payment ? (
                                <PaidBadge payment={payment} />
                              ) : isMyDebt && (
                                <button
                                  className="btn-pay-action"
                                  onClick={() => { setPayingTransaction(t); setPayingMonth(month) }}
                                >
                                  Pagar
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {payingTransaction && (
        <PaymentModal
          transaction={payingTransaction}
          toUser={userByName[payingTransaction.to]}
          activityId={activityId}
          fromName={myName}
          users={users}
          initialMonth={payingMonth}
          onClose={() => { setPayingTransaction(null); setPayingMonth(null) }}
        />
      )}
    </div>
  )
}

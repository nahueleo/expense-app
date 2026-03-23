import { useMemo, useState } from 'react'
import { getBadgeStyle } from '../utils/badges'
import { getPayerDisplay } from '../utils/users'
import { getMonthsRange, formatMonthLabel } from '../utils/dates'
import { formatARS } from '../utils/format'
import { getActiveExpenses, calculateBalances, simplifyDebts, applyPayments } from '../utils/finance'
import PaymentModal from './PaymentModal'
import PaidBadge from './PaidBadge'

export default function MonthlySummary({ expenses, users, currentUserEmail, payments = [], activityId }) {
  const [expanded, setExpanded]               = useState({})
  const [payingTransaction, setPayingTransaction] = useState(null)
  const [payingMonth, setPayingMonth]         = useState(null)

  const people     = users.map(u => u.displayName)
  const myName     = users.find(u => u.email === currentUserEmail?.toLowerCase())?.displayName
  const userByName = Object.fromEntries(users.map(u => [u.displayName, u]))
  const months     = useMemo(() => getMonthsRange(expenses), [expenses])

  if (!expenses.length) return null

  return (
    <div className="monthly-summary">
      <h2>Historial mensual</h2>
      <div className="months-list">
        {months.map(month => {
          const active          = getActiveExpenses(expenses, month)
          const rawBalances     = calculateBalances(expenses, month, people, users)
          const balances        = applyPayments(rawBalances, payments, month)
          const transactions    = simplifyDebts(balances, people)
          const totalMonth      = active.reduce((s, e) => s + e.totalAmount / e.installments, 0)
          const myBalance       = myName != null ? balances[myName] : null
          const myTxs           = myName ? transactions.filter(t => t.from === myName || t.to === myName) : []
          const isExpanded      = expanded[month]

          const getPayment = (fromName, toName) =>
            payments.find(p => p.fromName === fromName && p.toName === toName && p.forMonth === month) ?? null

          return (
            <div key={month} className="month-card">
              <button className="month-header" onClick={() => setExpanded(e => ({ ...e, [month]: !e[month] }))}>
                <div className="month-title">
                  <span className="month-name">{formatMonthLabel(month)}</span>
                  <span className="month-total">${formatARS(totalMonth)} total</span>
                  <span className="month-active">{active.length} gasto{active.length !== 1 ? 's' : ''}</span>
                  {myBalance !== null && (
                    <span className={`my-balance-pill ${myBalance >= 0 ? 'positive' : 'negative'}`}>
                      Vos: {myBalance >= 0 ? '+' : ''}${formatARS(myBalance)}
                    </span>
                  )}
                </div>
                <span className="month-chevron">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="month-body">

                  {/* My summary */}
                  {myName && myTxs.length > 0 && (
                    <div className="my-summary">
                      <h4>Tu resumen</h4>
                      {myTxs.map((t, i) => {
                        const payment = t.from === myName ? getPayment(myName, t.to) : getPayment(t.from, myName)
                        return (
                          <div key={i} className={`my-transaction ${payment ? 'transaction-paid' : ''}`}>
                            {t.from === myName ? (
                              <>
                                <span>Pagarle a</span>
                                <span className="badge" style={getBadgeStyle(t.to, users)}>{t.to}</span>
                                {payment ? (
                                  <PaidBadge payment={payment} />
                                ) : (
                                  <>
                                    <span className="my-amount negative">-${formatARS(t.amount)}</span>
                                    <button className="btn-pay-action" onClick={() => { setPayingTransaction(t); setPayingMonth(month) }}>
                                      Pagar
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="badge" style={getBadgeStyle(t.from, users)}>{t.from}</span>
                                <span>te debe</span>
                                {payment
                                  ? <PaidBadge payment={payment} />
                                  : <span className="my-amount positive">+${formatARS(t.amount)}</span>
                                }
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* All transactions */}
                  {transactions.length === 0 ? (
                    <div className="no-debts">Sin deudas este mes</div>
                  ) : (
                    <div className="transactions">
                      <h4>Quien le debe a quien</h4>
                      {transactions.map((t, i) => {
                        const payment = getPayment(t.from, t.to)
                        return (
                          <div key={i} className={`transaction ${payment ? 'transaction-paid' : ''}`}>
                            <span className="badge" style={getBadgeStyle(t.from, users)}>{t.from}</span>
                            <span className="arrow"> le debe </span>
                            <span className="badge" style={getBadgeStyle(t.to, users)}>{t.to}</span>
                            <span className="amount">${formatARS(t.amount)}</span>
                            {payment ? (
                              <PaidBadge payment={payment} />
                            ) : t.from === myName && (
                              <button className="btn-pay-action" onClick={() => { setPayingTransaction(t); setPayingMonth(month) }}>
                                Pagar
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Net balances */}
                  <div className="balances">
                    <h4>Balance neto</h4>
                    {people.map(person => (
                      <div key={person} className={`balance-row ${person === myName ? 'balance-row-me' : ''}`}>
                        <span className="badge" style={getBadgeStyle(person, users)}>{person}</span>
                        {person === myName && <span className="me-label">vos</span>}
                        <span className={`balance-amount ${balances[person] >= 0 ? 'positive' : 'negative'}`}>
                          {balances[person] >= 0 ? '+' : ''}${formatARS(balances[person])}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Active expenses */}
                  <div className="active-expenses">
                    <h4>Gastos activos</h4>
                    {active.map(exp => (
                      <div key={exp.id} className="active-expense-row">
                        <span>{exp.name}</span>
                        <span className="badge" style={getBadgeStyle(getPayerDisplay(exp.payer, users), users)}>
                          {getPayerDisplay(exp.payer, users)}
                        </span>
                        <span className="right">${formatARS(exp.totalAmount / exp.installments)}/mes</span>
                      </div>
                    ))}
                  </div>

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

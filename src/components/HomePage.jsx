import { useMemo, useState } from 'react'
import { getBadgeStyle } from '../utils/badges'
import { getPayerDisplay } from '../utils/users'
import { addMonths, getCurrentMonth, formatMonthLabel } from '../utils/dates'
import { formatARS } from '../utils/format'
import { getActiveExpenses, calculateBalances, simplifyDebts, applyPayments } from '../utils/finance'
import PaymentModal from './PaymentModal'
import PaidBadge from './PaidBadge'

const MONTH_RANGE = { past: 6, future: 18 }

function buildMonthOptions() {
  const now = getCurrentMonth()
  const months = []
  for (let i = -MONTH_RANGE.past; i <= MONTH_RANGE.future; i++) {
    months.push(addMonths(now, i))
  }
  return months
}

export default function HomePage({ expenses, users, currentUserEmail, onAddExpense, payments = [], activityId }) {
  const [month, setMonth]               = useState(getCurrentMonth)
  const [payingTransaction, setPayingTransaction] = useState(null)
  const availableMonths                 = useMemo(buildMonthOptions, [])

  const people     = users.map(u => u.displayName)
  const myName     = users.find(u => u.email === currentUserEmail?.toLowerCase())?.displayName
  const userByName = Object.fromEntries(users.map(u => [u.displayName, u]))

  const active           = useMemo(() => getActiveExpenses(expenses, month), [expenses, month])
  const rawBalances      = useMemo(() => calculateBalances(expenses, month, people, users), [expenses, month, people, users])
  const adjustedBalances = useMemo(() => applyPayments(rawBalances, payments, month), [rawBalances, payments, month])

  function getPayment(fromName, toName) {
    return payments.find(p => p.fromName === fromName && p.toName === toName && p.forMonth === month) ?? null
  }

  const totalMonth = active.reduce((s, e) => s + e.totalAmount / e.installments, 0)

  // Raw transactions (before payments) — show all rows including paid ones
  const allTransactions = useMemo(() => active.length > 0 ? simplifyDebts(rawBalances, people) : [], [active, rawBalances, people])
  // Adjusted balance for hero — reflects confirmed payments
  const myBalance       = active.length > 0 && myName != null ? adjustedBalances[myName] : null
  const myTransactions  = myName ? allTransactions.filter(t => t.from === myName || t.to === myName) : []

  const payerTotals = {}
  active.forEach(exp => {
    const key = getPayerDisplay(exp.payer, users)
    payerTotals[key] = (payerTotals[key] || 0) + exp.totalAmount / exp.installments
  })

  // What I personally paid this month:
  // 1. Expenses where I'm the payer (I fronted the money)
  const myPayerTotal = myName
    ? active
        .filter(exp => getPayerDisplay(exp.payer, users) === myName)
        .reduce((s, e) => s + e.totalAmount / e.installments, 0)
    : 0
  // 2. Confirmed payments I made to others for this month
  const myConfirmedPayments = payments
    .filter(p => p.fromName === myName && p.forMonth === month)
    .reduce((s, p) => s + p.amount, 0)
  const totalIPaid = myPayerTotal + myConfirmedPayments

  const currentMonthYM = getCurrentMonth()

  return (
    <div className="home-page">

      {/* Month selector */}
      <div className="month-selector">
        <button
          className="month-nav-btn"
          onClick={() => setMonth(m => addMonths(m, -1))}
          disabled={month <= availableMonths[0]}
        >‹</button>
        <select value={month} onChange={e => setMonth(e.target.value)} className="month-select">
          {availableMonths.map(m => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}{m === currentMonthYM ? ' (este mes)' : ''}
            </option>
          ))}
        </select>
        <button
          className="month-nav-btn"
          onClick={() => setMonth(m => addMonths(m, 1))}
          disabled={month >= availableMonths[availableMonths.length - 1]}
        >›</button>
      </div>

      {/* Hero */}
      <div className={`my-hero ${myBalance === null ? '' : myBalance >= 0 ? 'hero-positive' : 'hero-negative'}`}>
        <div className="my-hero-label">
          {myBalance === null ? 'Resumen' : myBalance >= 0 ? 'Este mes te deben' : 'Este mes debés pagar'}
        </div>
        <div className="my-hero-amount">
          {myBalance === null ? '—' : `$${formatARS(myBalance)}`}
        </div>
        <div className="my-hero-month">{formatMonthLabel(month)}</div>
      </div>

      {/* My transactions */}
      {myTransactions.length > 0 && (
        <div className="home-card">
          <h3 className="home-card-title">Tus pagos</h3>
          {myTransactions.map((t, i) => {
            const payment = t.from === myName ? getPayment(myName, t.to) : getPayment(t.from, myName)

            return (
              <div key={i} className={`my-transaction-row ${payment ? 'transaction-paid' : ''}`}>
                {t.from === myName ? (
                  <>
                    <div className="transaction-info">
                      <span className="transaction-label">Pagarle a</span>
                      <span className="badge" style={getBadgeStyle(t.to, users)}>{t.to}</span>
                    </div>
                    <div className="transaction-right">
                      {payment ? (
                        <PaidBadge payment={payment} />
                      ) : (
                        <>
                          <span className="transaction-amount negative">${formatARS(t.amount)}</span>
                          <button className="btn-pay-action" onClick={() => setPayingTransaction(t)}>
                            Pagar
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="transaction-info">
                      <span className="badge" style={getBadgeStyle(t.from, users)}>{t.from}</span>
                      <span className="transaction-label">te debe</span>
                    </div>
                    {payment
                      ? <PaidBadge payment={payment} />
                      : <span className="transaction-amount positive">${formatARS(t.amount)}</span>
                    }
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {payingTransaction && (
        <PaymentModal
          transaction={payingTransaction}
          toUser={userByName[payingTransaction.to]}
          activityId={activityId}
          fromName={myName}
          users={users}
          onClose={() => setPayingTransaction(null)}
        />
      )}

      {myBalance !== null && myTransactions.length === 0 && (
        <div className="home-card home-card-ok">
          <span className="ok-icon">✓</span>
          <span>No tenés deudas este mes</span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">${formatARS(totalMonth)}</div>
          <div className="stat-label">Total mes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green-ios)' }}>${formatARS(totalIPaid)}</div>
          <div className="stat-label">Ya pagaste</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: myBalance !== null && myBalance < 0 ? 'var(--red)' : undefined }}>
            {myBalance !== null ? `$${formatARS(myBalance)}` : '—'}
          </div>
          <div className="stat-label">{myBalance !== null && myBalance >= 0 ? 'Te deben' : 'Debés'}</div>
        </div>
      </div>

      {/* Who paid */}
      {Object.keys(payerTotals).length > 0 && (
        <div className="home-card">
          <h3 className="home-card-title">Quién pagó este mes</h3>
          {Object.entries(payerTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([name, total]) => (
              <div key={name} className="payer-row">
                <span className="badge" style={getBadgeStyle(name, users)}>{name}</span>
                <div className="payer-bar-wrap">
                  <div className="payer-bar" style={{ width: `${totalMonth > 0 ? (total / totalMonth) * 100 : 0}%` }} />
                </div>
                <span className="payer-amount">${formatARS(total)}</span>
              </div>
            ))}
        </div>
      )}

      {/* Active expenses */}
      {active.length > 0 && (
        <div className="home-card">
          <h3 className="home-card-title">Gastos activos</h3>
          {active.map(exp => {
            const installmentAmt = exp.totalAmount / exp.installments
            const share = people.length > 0 ? installmentAmt / people.length : 0
            return (
              <div key={exp.id} className="active-exp-row">
                <div className="active-exp-info">
                  <span className="active-exp-name">{exp.name}</span>
                  <span className="badge" style={getBadgeStyle(getPayerDisplay(exp.payer, users), users)}>
                    {getPayerDisplay(exp.payer, users)}
                  </span>
                  {exp.installments > 1 && (
                    <span className="active-exp-installments">{exp.installments} cuotas</span>
                  )}
                </div>
                <div className="active-exp-amounts">
                  <span className="active-exp-total">${formatARS(installmentAmt)}/mes</span>
                  <span className="active-exp-share">c/u ${formatARS(share)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {active.length === 0 && (
        <div className="home-empty">
          <p>No hay gastos activos para {formatMonthLabel(month)}</p>
          <button className="btn-primary" onClick={onAddExpense} style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}>
            Agregar primer gasto
          </button>
        </div>
      )}
    </div>
  )
}

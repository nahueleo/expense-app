import { useMemo, useState } from 'react'
import { getBadgeStyle } from '../utils/badges'
import { normalizePayerKey, getPayerDisplay } from '../utils/users'
import PayButtons from './PayButtons'

function addMonths(yearMonth, n) {
  const [y, m] = yearMonth.split('-').map(Number)
  const date = new Date(y, m - 1 + n, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatARS(n) {
  return Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatMonthLabel(ym) {
  const [year, month] = ym.split('-')
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${months[parseInt(month) - 1]} ${year}`
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getActiveExpenses(expenses, month) {
  return expenses.filter(exp => {
    const endMonth = addMonths(exp.firstPaymentMonth, exp.installments)
    return month >= exp.firstPaymentMonth && month < endMonth
  })
}

function calculateBalances(expenses, month, people, users) {
  const balances = {}
  people.forEach(p => balances[p] = 0)

  expenses.forEach(exp => {
    const endMonth = addMonths(exp.firstPaymentMonth, exp.installments)
    if (month >= exp.firstPaymentMonth && month < endMonth) {
      const installmentAmt = exp.totalAmount / exp.installments
      const share = installmentAmt / people.length
      const payerKey = normalizePayerKey(exp.payer, users)
      if (balances[payerKey] !== undefined) balances[payerKey] += installmentAmt
      people.forEach(p => { balances[p] -= share })
    }
  })

  return balances
}

function simplifyDebts(balances, people) {
  const entries = people.map(name => ({ name, bal: balances[name] }))
  const transactions = []
  for (let iter = 0; iter < 20; iter++) {
    entries.sort((a, b) => a.bal - b.bal)
    const debtor = entries[0]
    const creditor = entries[entries.length - 1]
    if (Math.abs(debtor.bal) < 0.5 || Math.abs(creditor.bal) < 0.5) break
    const amount = Math.min(Math.abs(debtor.bal), creditor.bal)
    if (amount < 0.5) break
    transactions.push({ from: debtor.name, to: creditor.name, amount })
    debtor.bal += amount
    creditor.bal -= amount
  }
  return transactions
}

export default function HomePage({ expenses, users, currentUserEmail, onAddExpense }) {
  const [month, setMonth] = useState(getCurrentMonth())

  const availableMonths = useMemo(() => {
    const now = getCurrentMonth()
    // Range: 6 months back, 18 months forward from today
    const start = addMonths(now, -6)
    const end = addMonths(now, 18)
    const months = []
    let current = start
    while (current <= end) {
      months.push(current)
      current = addMonths(current, 1)
    }
    return months
  }, [])

  const people = users.map(u => u.displayName)
  const myName = users.find(u => u.email === currentUserEmail?.toLowerCase())?.displayName
  // Map displayName → user doc for payment link generation
  const userByName = Object.fromEntries(users.map(u => [u.displayName, u]))

  const active = useMemo(() => getActiveExpenses(expenses, month), [expenses, month])
  const balances = useMemo(() => calculateBalances(expenses, month, people, users), [expenses, month, people, users])
  const transactions = useMemo(() => simplifyDebts(balances, people), [balances, people])

  const totalMonth = active.reduce((sum, exp) => sum + exp.totalAmount / exp.installments, 0)
  const myBalance = myName ? balances[myName] : null
  const myTransactions = myName ? transactions.filter(t => t.from === myName || t.to === myName) : []

  // Stats: who paid how much this month
  const payerTotals = {}
  active.forEach(exp => {
    const key = getPayerDisplay(exp.payer, users)
    payerTotals[key] = (payerTotals[key] || 0) + exp.totalAmount / exp.installments
  })

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
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="month-select"
        >
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

      {/* Hero: my situation */}
      <div className={`my-hero ${myBalance === null ? '' : myBalance >= 0 ? 'hero-positive' : 'hero-negative'}`}>
        <div className="my-hero-label">
          {myBalance === null
            ? 'Tu resumen'
            : myBalance >= 0
              ? 'Este mes te deben'
              : 'Este mes debés pagar'}
        </div>
        <div className="my-hero-amount">
          {myBalance === null ? '—' : `$${formatARS(myBalance)}`}
        </div>
        <div className="my-hero-month">{formatMonthLabel(month)}</div>
      </div>

      {/* My transactions */}
      {myTransactions.length > 0 && (
        <div className="home-card">
          <h3 className="home-card-title">Tus pagos pendientes</h3>
          {myTransactions.map((t, i) => (
            <div key={i} className="my-transaction-row">
              {t.from === myName ? (
                <>
                  <div className="transaction-info">
                    <span className="transaction-label">Pagarle a</span>
                    <span className="badge" style={getBadgeStyle(t.to, users)}>{t.to}</span>
                  </div>
                  <div className="transaction-right">
                    <span className="transaction-amount negative">${formatARS(t.amount)}</span>
                    <PayButtons user={userByName[t.to]} amount={t.amount} />
                  </div>
                </>
              ) : (
                <>
                  <div className="transaction-info">
                    <span className="badge" style={getBadgeStyle(t.from, users)}>{t.from}</span>
                    <span className="transaction-label">te debe</span>
                  </div>
                  <span className="transaction-amount positive">${formatARS(t.amount)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {myBalance !== null && myTransactions.length === 0 && (
        <div className="home-card home-card-ok">
          <span className="ok-icon">✓</span>
          <span>No tenés deudas este mes</span>
        </div>
      )}

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">${formatARS(totalMonth)}</div>
          <div className="stat-label">Total del mes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Gastos activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{transactions.length}</div>
          <div className="stat-label">Transacciones</div>
        </div>
      </div>

      {/* Who paid what */}
      {Object.keys(payerTotals).length > 0 && (
        <div className="home-card">
          <h3 className="home-card-title">Quién pagó este mes</h3>
          {Object.entries(payerTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([name, total]) => {
              const pct = totalMonth > 0 ? (total / totalMonth) * 100 : 0
              return (
                <div key={name} className="payer-row">
                  <span className="badge" style={getBadgeStyle(name, users)}>{name}</span>
                  <div className="payer-bar-wrap">
                    <div className="payer-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="payer-amount">${formatARS(total)}</span>
                </div>
              )
            })}
        </div>
      )}

      {/* Active expenses list */}
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
                    <span className="active-exp-installments">
                      {exp.installments} cuotas
                    </span>
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

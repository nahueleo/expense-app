import { useMemo, useState } from 'react'

const PEOPLE = ['nahuel', 'Caro', 'Juli']

function addMonths(yearMonth, n) {
  const [y, m] = yearMonth.split('-').map(Number)
  const date = new Date(y, m - 1 + n, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthsRange(expenses) {
  if (expenses.length === 0) return []
  let min = expenses[0].firstPaymentMonth
  let max = expenses[0].firstPaymentMonth
  expenses.forEach(exp => {
    if (exp.firstPaymentMonth < min) min = exp.firstPaymentMonth
    const end = addMonths(exp.firstPaymentMonth, exp.installments - 1)
    if (end > max) max = end
  })
  const months = []
  let current = min
  while (current <= max) {
    months.push(current)
    current = addMonths(current, 1)
  }
  return months
}

function calculateMonthlyBalances(expenses, month) {
  const balances = {}
  PEOPLE.forEach(p => balances[p] = 0)

  expenses.forEach(exp => {
    const endMonth = addMonths(exp.firstPaymentMonth, exp.installments)
    if (month >= exp.firstPaymentMonth && month < endMonth) {
      const installmentAmt = exp.totalAmount / exp.installments
      const share = installmentAmt / PEOPLE.length
      balances[exp.payer] += installmentAmt
      PEOPLE.forEach(p => { balances[p] -= share })
    }
  })

  return balances
}

function simplifyDebts(balances) {
  const people = PEOPLE.map(name => ({ name, bal: balances[name] }))
  const transactions = []

  for (let iter = 0; iter < 20; iter++) {
    people.sort((a, b) => a.bal - b.bal)
    const debtor = people[0]
    const creditor = people[people.length - 1]
    if (Math.abs(debtor.bal) < 0.5 || Math.abs(creditor.bal) < 0.5) break
    const amount = Math.min(Math.abs(debtor.bal), creditor.bal)
    if (amount < 0.5) break
    transactions.push({ from: debtor.name, to: creditor.name, amount })
    debtor.bal += amount
    creditor.bal -= amount
  }

  return transactions
}

function formatARS(n) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatMonthLabel(ym) {
  const [year, month] = ym.split('-')
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${months[parseInt(month) - 1]} ${year}`
}

function getActiveExpenses(expenses, month) {
  return expenses.filter(exp => {
    const endMonth = addMonths(exp.firstPaymentMonth, exp.installments)
    return month >= exp.firstPaymentMonth && month < endMonth
  })
}

export default function MonthlySummary({ expenses }) {
  const [expanded, setExpanded] = useState({})

  const months = useMemo(() => getMonthsRange(expenses), [expenses])

  if (expenses.length === 0) {
    return null
  }

  function toggleMonth(m) {
    setExpanded(e => ({ ...e, [m]: !e[m] }))
  }

  return (
    <div className="monthly-summary">
      <h2>Resumen mensual</h2>
      <div className="months-list">
        {months.map(month => {
          const balances = calculateMonthlyBalances(expenses, month)
          const transactions = simplifyDebts(balances)
          const active = getActiveExpenses(expenses, month)
          const totalMonth = active.reduce((sum, exp) => sum + exp.totalAmount / exp.installments, 0)
          const isExpanded = expanded[month]

          return (
            <div key={month} className="month-card">
              <button className="month-header" onClick={() => toggleMonth(month)}>
                <div className="month-title">
                  <span className="month-name">{formatMonthLabel(month)}</span>
                  <span className="month-total">${formatARS(totalMonth)} total</span>
                  <span className="month-active">{active.length} gasto{active.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="month-chevron">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="month-body">
                  {transactions.length === 0 ? (
                    <div className="no-debts">Sin deudas este mes</div>
                  ) : (
                    <div className="transactions">
                      <h4>Quien le debe a quien:</h4>
                      {transactions.map((t, i) => (
                        <div key={i} className="transaction">
                          <span className={`badge badge-${t.from}`}>{t.from}</span>
                          <span className="arrow"> le debe </span>
                          <span className={`badge badge-${t.to}`}>{t.to}</span>
                          <span className="amount"> ${formatARS(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="balances">
                    <h4>Balance neto:</h4>
                    {PEOPLE.map(person => (
                      <div key={person} className="balance-row">
                        <span className={`badge badge-${person}`}>{person}</span>
                        <span className={`balance-amount ${balances[person] >= 0 ? 'positive' : 'negative'}`}>
                          {balances[person] >= 0 ? '+' : ''}${formatARS(balances[person])}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="active-expenses">
                    <h4>Gastos activos:</h4>
                    {active.map(exp => (
                      <div key={exp.id} className="active-expense-row">
                        <span>{exp.name}</span>
                        <span className={`badge badge-${exp.payer}`}>{exp.payer}</span>
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
    </div>
  )
}

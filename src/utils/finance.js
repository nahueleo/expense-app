import { addMonths } from './dates'
import { normalizePayerKey } from './users'

export function getActiveExpenses(expenses, month) {
  return expenses.filter(exp => {
    const end = addMonths(exp.firstPaymentMonth, exp.installments)
    return month >= exp.firstPaymentMonth && month < end
  })
}

export function calculateBalances(expenses, month, people, users) {
  const balances = Object.fromEntries(people.map(p => [p, 0]))
  getActiveExpenses(expenses, month).forEach(exp => {
    const installmentAmt = exp.totalAmount / exp.installments
    const share = installmentAmt / people.length
    const payerKey = normalizePayerKey(exp.payer, users)
    if (payerKey in balances) balances[payerKey] += installmentAmt
    people.forEach(p => { balances[p] -= share })
  })
  return balances
}

export function simplifyDebts(balances, people) {
  const entries = people.map(name => ({ name, bal: balances[name] ?? 0 }))
  const transactions = []
  for (let i = 0; i < 20; i++) {
    entries.sort((a, b) => a.bal - b.bal)
    const debtor   = entries[0]
    const creditor = entries[entries.length - 1]
    if (Math.abs(debtor.bal) < 0.5 || creditor.bal < 0.5) break
    const amount = Math.min(Math.abs(debtor.bal), creditor.bal)
    if (amount < 0.5) break
    transactions.push({ from: debtor.name, to: creditor.name, amount })
    debtor.bal   += amount
    creditor.bal -= amount
  }
  return transactions
}

export function getPaidInstallments(exp, currentMonth) {
  if (currentMonth < exp.firstPaymentMonth) return 0
  const [fy, fm] = exp.firstPaymentMonth.split('-').map(Number)
  const [ty, tm] = currentMonth.split('-').map(Number)
  return Math.min(exp.installments, (ty - fy) * 12 + (tm - fm) + 1)
}

export function getExpenseStatus(exp, currentMonth) {
  const lastMonth = addMonths(exp.firstPaymentMonth, exp.installments - 1)
  if (currentMonth > lastMonth) return 'finished'
  if (currentMonth < exp.firstPaymentMonth) return 'pending'
  return 'active'
}

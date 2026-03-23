const MONTHS_LONG  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function addMonths(yearMonth, n) {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthDiff(from, to) {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export function formatMonthLabel(ym) {
  const [year, month] = ym.split('-')
  return `${MONTHS_LONG[parseInt(month) - 1]} ${year}`
}

export function formatMonthShort(ym) {
  const [year, month] = ym.split('-')
  return `${MONTHS_SHORT[parseInt(month) - 1]} ${year}`
}

export function getMonthsRange(expenses) {
  if (!expenses.length) return []
  let min = expenses[0].firstPaymentMonth
  let max = expenses[0].firstPaymentMonth
  expenses.forEach(exp => {
    if (exp.firstPaymentMonth < min) min = exp.firstPaymentMonth
    const end = addMonths(exp.firstPaymentMonth, exp.installments - 1)
    if (end > max) max = end
  })
  const months = []
  let cur = min
  while (cur <= max) { months.push(cur); cur = addMonths(cur, 1) }
  return months
}

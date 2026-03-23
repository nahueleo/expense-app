import { getBadgeStyle } from '../utils/badges'

function formatARS(n) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(ym) {
  if (!ym) return null
  const [year, month] = ym.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun',
                  'Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

function getActivityStats(activityId, expenses) {
  const actExpenses = expenses.filter(e => e.activityId === activityId)
  const total = actExpenses.reduce((s, e) => s + e.totalAmount, 0)

  // Last payment month across all expenses
  const lastPaymentMonth = actExpenses.reduce((max, e) => {
    const last = addMonths(e.firstPaymentMonth, e.installments - 1)
    return last > max ? last : max
  }, '')

  // Progress: paid vs total
  const currentMonth = getCurrentMonth()
  const paid = actExpenses.reduce((s, e) => {
    if (currentMonth < e.firstPaymentMonth) return s
    const monthsPaid = Math.min(
      e.installments,
      (parseInt(currentMonth.split('-')[0]) - parseInt(e.firstPaymentMonth.split('-')[0])) * 12 +
      (parseInt(currentMonth.split('-')[1]) - parseInt(e.firstPaymentMonth.split('-')[1])) + 1
    )
    return s + (monthsPaid / e.installments) * e.totalAmount
  }, 0)

  return {
    count: actExpenses.length,
    total,
    paid,
    lastPaymentMonth,
    done: lastPaymentMonth ? currentMonth > lastPaymentMonth : false,
  }
}

export default function ActivitiesOverview({ activities, expenses, users, onSelect, onCreateNew, currentUserEmail }) {
  if (activities.length === 0) {
    return (
      <div className="activities-empty">
        <div className="activities-empty-icon">🌍</div>
        <h2>No hay actividades</h2>
        <p>Creá tu primera actividad para empezar a registrar gastos compartidos.</p>
        <button className="btn-primary" style={{ marginTop: 24 }} onClick={onCreateNew}>
          + Nueva actividad
        </button>
      </div>
    )
  }

  return (
    <div className="activities-overview">
      <h2 className="activities-title">Mis actividades</h2>
      <div className="activities-grid">
        {activities.map(activity => {
          const stats = getActivityStats(activity.id, expenses)
          const isAdmin = activity.admins?.includes(currentUserEmail)
          const memberUsers = users.filter(u => activity.members?.includes(u.email))

          return (
            <button
              key={activity.id}
              className="activity-card"
              onClick={() => onSelect(activity.id)}
            >
              <div className="activity-card-header">
                <span className="activity-card-emoji">{activity.emoji}</span>
                <div className="activity-card-badges">
                  <span className="activity-type-badge">{activity.type}</span>
                  {isAdmin && <span className="activity-admin-badge">Admin</span>}
                </div>
              </div>

              <h3 className="activity-card-name">{activity.name}</h3>

              <div className="activity-card-members">
                {memberUsers.slice(0, 5).map(u => (
                  <span
                    key={u.id}
                    className="activity-member-dot"
                    style={getBadgeStyle(u.displayName, users)}
                    title={u.displayName}
                  >
                    {u.displayName[0].toUpperCase()}
                  </span>
                ))}
                {memberUsers.length > 5 && (
                  <span className="activity-member-dot more">+{memberUsers.length - 5}</span>
                )}
              </div>

              <div className="activity-card-stats">
                <div className="activity-stat">
                  <span className="activity-stat-value">{stats.count}</span>
                  <span className="activity-stat-label">gastos</span>
                </div>
                <div className="activity-stat">
                  <span className="activity-stat-value">${formatARS(stats.monthlyTotal)}</span>
                  <span className="activity-stat-label">este mes</span>
                </div>
              </div>
            </button>
          )
        })}

        {/* New activity card */}
        <button className="activity-card activity-card-new" onClick={onCreateNew}>
          <span className="activity-card-new-icon">+</span>
          <span className="activity-card-new-label">Nueva actividad</span>
        </button>
      </div>
    </div>
  )
}

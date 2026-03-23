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

function getActivityStats(activityId, expenses, users) {
  const actExpenses = expenses.filter(e => e.activityId === activityId)
  const total = actExpenses.reduce((s, e) => s + e.totalAmount, 0)
  const currentMonth = getCurrentMonth()
  const monthlyTotal = actExpenses.reduce((s, e) => {
    const end = addMonths(e.firstPaymentMonth, e.installments)
    if (currentMonth >= e.firstPaymentMonth && currentMonth < end) {
      return s + e.totalAmount / e.installments
    }
    return s
  }, 0)
  return { count: actExpenses.length, total, monthlyTotal }
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
          const stats = getActivityStats(activity.id, expenses, users)
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

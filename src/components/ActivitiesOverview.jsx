import { getBadgeStyle } from '../utils/badges'
import { addMonths, getCurrentMonth, formatMonthShort } from '../utils/dates'
import { formatARS } from '../utils/format'
import { getPaidInstallments } from '../utils/finance'

function getActivityStats(activityId, expenses) {
  const actExp = expenses.filter(e => e.activityId === activityId)
  if (!actExp.length) return { count: 0, total: 0, paid: 0, lastPaymentMonth: null, done: false }

  const currentMonth = getCurrentMonth()
  const total = actExp.reduce((s, e) => s + e.totalAmount, 0)
  const paid  = actExp.reduce((s, e) => s + getPaidInstallments(e, currentMonth) * (e.totalAmount / e.installments), 0)
  const lastPaymentMonth = actExp.reduce((max, e) => {
    const last = addMonths(e.firstPaymentMonth, e.installments - 1)
    return last > max ? last : max
  }, '')

  return {
    count: actExp.length,
    total,
    paid,
    lastPaymentMonth,
    done: lastPaymentMonth ? currentMonth > lastPaymentMonth : false,
  }
}

export default function ActivitiesOverview({ activities, expenses, users, onSelect, onCreateNew, currentUserEmail }) {
  if (!activities.length) {
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
          const stats       = getActivityStats(activity.id, expenses)
          const isAdmin     = activity.admins?.includes(currentUserEmail?.toLowerCase())
          const memberUsers = users.filter(u => activity.members?.includes(u.email))

          return (
            <button key={activity.id} className="activity-card" onClick={() => onSelect(activity.id)}>
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

              {stats.total > 0 && (
                <div className="activity-progress-wrap">
                  <div className="activity-progress-bar">
                    <div
                      className="activity-progress-fill"
                      style={{ width: `${Math.min(100, (stats.paid / stats.total) * 100)}%` }}
                    />
                  </div>
                  <span className="activity-progress-pct">
                    {Math.round((stats.paid / stats.total) * 100)}%
                  </span>
                </div>
              )}

              <div className="activity-card-stats">
                <div className="activity-stat">
                  <span className="activity-stat-value">{stats.count}</span>
                  <span className="activity-stat-label">gastos</span>
                </div>
                <div className="activity-stat">
                  <span className="activity-stat-value">${formatARS(stats.total)}</span>
                  <span className="activity-stat-label">total</span>
                </div>
                <div className="activity-stat">
                  {stats.done ? (
                    <>
                      <span className="activity-stat-value" style={{ color: 'var(--green-ios)' }}>✓</span>
                      <span className="activity-stat-label">pagado</span>
                    </>
                  ) : stats.lastPaymentMonth ? (
                    <>
                      <span className="activity-stat-value" style={{ fontSize: 13 }}>{formatMonthShort(stats.lastPaymentMonth)}</span>
                      <span className="activity-stat-label">último pago</span>
                    </>
                  ) : (
                    <>
                      <span className="activity-stat-value">—</span>
                      <span className="activity-stat-label">sin gastos</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        <button className="activity-card activity-card-new" onClick={onCreateNew}>
          <span className="activity-card-new-icon">+</span>
          <span className="activity-card-new-label">Nueva actividad</span>
        </button>
      </div>
    </div>
  )
}

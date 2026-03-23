import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import { useAuth } from './AuthContext'
import { useUsers } from './hooks/useUsers'
import Login from './components/Login'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import MonthlySummary from './components/MonthlySummary'
import UserManager from './components/UserManager'

const ADMIN_EMAIL = 'nahueleo@gmail.com'

export default function App() {
  const user = useAuth()
  const { users, loading: usersLoading } = useUsers()
  const [expenses, setExpenses] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [tab, setTab] = useState('summary')

  const isAdmin = user?.email === ADMIN_EMAIL
  const isAllowed = isAdmin || users.some(u => u.email === user?.email?.toLowerCase())

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setExpensesLoading(false)
    }, (err) => {
      console.error(err)
      setExpensesLoading(false)
    })
    return unsub
  }, [user])

  if (user === undefined) return <div className="loading">Cargando...</div>
  if (user === null) return <Login />
  if (usersLoading) return <div className="loading">Cargando...</div>

  if (!isAllowed) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Sin acceso</h1>
          <p className="login-subtitle">{user.email}</p>
          <p className="login-no-access">
            Tu cuenta no tiene acceso. Pedile al admin que te agregue.
          </p>
          <button className="btn-google" onClick={() => signOut(auth)}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  const peopleNames = users.map(u => u.displayName)

  return (
    <div className="app">
      <header>
        <h1>Gastos Compartidos</h1>
        <p className="subtitle">{peopleNames.join(' · ') || 'nahuel · Caro · Juli'}</p>
        <div className="header-user">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" referrerPolicy="no-referrer" />
          <span className="user-name">{user.displayName}</span>
          <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <main>
        <ExpenseForm user={user} users={users} />

        <nav className="tabs">
          <button className={tab === 'summary' ? 'tab active' : 'tab'} onClick={() => setTab('summary')}>
            Resumen mensual
          </button>
          <button className={tab === 'list' ? 'tab active' : 'tab'} onClick={() => setTab('list')}>
            Gastos ({expenses.length})
          </button>
          {isAdmin && (
            <button className={tab === 'users' ? 'tab active' : 'tab'} onClick={() => setTab('users')}>
              Usuarios
            </button>
          )}
        </nav>

        {expensesLoading ? (
          <div className="loading">Cargando...</div>
        ) : tab === 'summary' ? (
          <MonthlySummary expenses={expenses} users={users} />
        ) : tab === 'list' ? (
          <ExpenseList expenses={expenses} users={users} />
        ) : (
          <UserManager users={users} />
        )}
      </main>
    </div>
  )
}

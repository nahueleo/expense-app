import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import { useAuth } from './AuthContext'
import Login from './components/Login'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import MonthlySummary from './components/MonthlySummary'

export default function App() {
  const user = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('summary')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setExpenses(data)
      setLoading(false)
    }, (err) => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [user])

  // Still checking auth state
  if (user === undefined) {
    return <div className="loading">Cargando...</div>
  }

  // Not logged in
  if (user === null) {
    return <Login />
  }

  return (
    <div className="app">
      <header>
        <h1>Gastos Compartidos</h1>
        <p className="subtitle">nahuel · Caro · Juli</p>
        <div className="header-user">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" referrerPolicy="no-referrer" />
          <span className="user-name">{user.displayName}</span>
          <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <main>
        <ExpenseForm user={user} />

        <nav className="tabs">
          <button
            className={tab === 'summary' ? 'tab active' : 'tab'}
            onClick={() => setTab('summary')}
          >
            Resumen mensual
          </button>
          <button
            className={tab === 'list' ? 'tab active' : 'tab'}
            onClick={() => setTab('list')}
          >
            Todos los gastos ({expenses.length})
          </button>
        </nav>

        {loading ? (
          <div className="loading">Cargando...</div>
        ) : tab === 'summary' ? (
          <MonthlySummary expenses={expenses} />
        ) : (
          <ExpenseList expenses={expenses} />
        )}
      </main>
    </div>
  )
}

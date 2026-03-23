import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import { useAuth } from './AuthContext'
import { useUsers } from './hooks/useUsers'
import Login from './components/Login'
import HomePage from './components/HomePage'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import MonthlySummary from './components/MonthlySummary'
import UserManager from './components/UserManager'

// Bootstrap email: always gets admin on first login if no admins exist
const BOOTSTRAP_EMAIL = 'nahueleo@gmail.com'

export default function App() {
  const user = useAuth()
  const { users, loading: usersLoading } = useUsers()
  const [expenses, setExpenses] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [tab, setTab] = useState('home')

  const currentUserDoc = users.find(u => u.email === user?.email?.toLowerCase())
  const isAdmin = currentUserDoc?.isAdmin === true
  const isAllowed = !!currentUserDoc

  // Bootstrap: ensure BOOTSTRAP_EMAIL always has admin access
  useEffect(() => {
    if (!user || usersLoading || user.email?.toLowerCase() !== BOOTSTRAP_EMAIL) return

    const existingDoc = users.find(u => u.email === BOOTSTRAP_EMAIL)

    if (!existingDoc) {
      // First time: create user doc with isAdmin=true
      addDoc(collection(db, 'users'), {
        email: BOOTSTRAP_EMAIL,
        displayName: 'nahuel',
        mpAlias: '',
        isAdmin: true,
        addedAt: serverTimestamp(),
      })
    } else if (!existingDoc.isAdmin) {
      // Doc exists but isAdmin not set: fix it
      updateDoc(doc(db, 'users', existingDoc.id), { isAdmin: true })
    }
  }, [user, usersLoading, users])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

  const NAV = [
    { id: 'home',     label: 'Inicio',    icon: '⌂' },
    { id: 'add',      label: 'Agregar',   icon: '+' },
    { id: 'history',  label: 'Historial', icon: '☰' },
    { id: 'expenses', label: 'Gastos',    icon: '≡' },
    ...(isAdmin ? [{ id: 'users', label: 'Usuarios', icon: '👤' }] : []),
  ]

  return (
    <div className="app">
      <header>
        <h1>Gastos Compartidos</h1>
        <p className="subtitle">{users.map(u => u.displayName).join(' · ')}</p>
        <div className="header-user">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" referrerPolicy="no-referrer" />
          <span className="user-name">{currentUserDoc?.displayName || user.displayName}</span>
          {isAdmin && <span className="admin-badge">admin</span>}
          <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <nav className="bottom-nav">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>

      <main>
        {expensesLoading ? (
          <div className="loading">Cargando...</div>
        ) : tab === 'home' ? (
          <HomePage
            expenses={expenses}
            users={users}
            currentUserEmail={user.email}
            onAddExpense={() => setTab('add')}
          />
        ) : tab === 'add' ? (
          <ExpenseForm user={user} users={users} onAdded={() => setTab('home')} />
        ) : tab === 'history' ? (
          <MonthlySummary expenses={expenses} users={users} currentUserEmail={user.email} />
        ) : tab === 'expenses' ? (
          <ExpenseList expenses={expenses} users={users} />
        ) : (
          <UserManager users={users} currentUserDoc={currentUserDoc} />
        )}
      </main>
    </div>
  )
}

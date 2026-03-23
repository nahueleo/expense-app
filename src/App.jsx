import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import { useAuth } from './AuthContext'
import { useUsers } from './hooks/useUsers'
import { useActivities } from './hooks/useActivities'
import Login from './components/Login'
import HomePage from './components/HomePage'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import MonthlySummary from './components/MonthlySummary'
import UserManager from './components/UserManager'
import ActivitySwitcher from './components/ActivitySwitcher'
import ActivitiesOverview from './components/ActivitiesOverview'

const BOOTSTRAP_EMAIL = 'nahueleo@gmail.com'

const Icons = {
  home: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  expenses: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  history: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
}

export default function App() {
  const user = useAuth()
  const { users, loading: usersLoading } = useUsers()
  const { activities } = useActivities()
  const [expenses, setExpenses] = useState([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [currentActivityId, setCurrentActivityId] = useState(
    () => localStorage.getItem('currentActivityId') || null
  )
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const currentUserDoc = users.find(u => u.email === user?.email?.toLowerCase())
  const isAdmin = currentUserDoc?.isAdmin === true
  const currentActivity = activities.find(a => a.id === currentActivityId)
  const filteredExpenses = currentActivityId
    ? expenses.filter(e => e.activityId === currentActivityId)
    : []

  function selectActivity(id) {
    setCurrentActivityId(id)
    if (id) localStorage.setItem('currentActivityId', id)
    else localStorage.removeItem('currentActivityId')
    setTab('home')
  }

  // Auto-register any Google user on first login
  useEffect(() => {
    if (!user || usersLoading) return
    const existingDoc = users.find(u => u.email === user.email?.toLowerCase())
    if (!existingDoc) {
      addDoc(collection(db, 'users'), {
        email: user.email.toLowerCase(),
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        mpAlias: '',
        modoAlias: '',
        isAdmin: user.email?.toLowerCase() === BOOTSTRAP_EMAIL,
        addedAt: serverTimestamp(),
      })
    } else if (user.email?.toLowerCase() === BOOTSTRAP_EMAIL && !existingDoc.isAdmin) {
      updateDoc(doc(db, 'users', existingDoc.id), { isAdmin: true })
    }
  }, [user, usersLoading, users])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q,
      snap => { setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setExpensesLoading(false) },
      err => { console.error(err); setExpensesLoading(false) }
    )
    return unsub
  }, [user])

  if (user === undefined || (user && usersLoading)) return <div className="loading">Cargando...</div>
  if (user === null) return <Login />

  const NAV = [
    { id: 'home',     label: 'Inicio',    icon: Icons.home },
    { id: 'expenses', label: 'Gastos',    icon: Icons.expenses },
    { id: 'history',  label: 'Historial', icon: Icons.history },
    ...(isAdmin ? [{ id: 'users', label: 'Usuarios', icon: Icons.users }] : []),
  ]

  // No activity selected → show activities overview (no tabs, no FAB)
  if (!currentActivityId) {
    return (
      <div className="app">
        <header>
          <ActivitySwitcher
            activities={activities}
            currentActivityId={null}
            onSelect={selectActivity}
            currentUserEmail={user.email}
            users={users}
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
          />
          <div className="header-user">
            <img src={user.photoURL} alt={user.displayName} className="user-avatar" referrerPolicy="no-referrer" />
            <span className="user-name">{currentUserDoc?.displayName || user.displayName}</span>
            {isAdmin && <span className="admin-badge">admin</span>}
            <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
          </div>
        </header>
        <main style={{ paddingBottom: 32 }}>
          <ActivitiesOverview
            activities={activities}
            expenses={expenses}
            users={users}
            onSelect={selectActivity}
            onCreateNew={() => setSwitcherOpen(true)}
            currentUserEmail={user.email}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <ActivitySwitcher
          activities={activities}
          currentActivityId={currentActivityId}
          onSelect={selectActivity}
          currentUserEmail={user.email}
          users={users}
          open={switcherOpen}
          onOpenChange={setSwitcherOpen}
        />
        <div className="header-user">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" referrerPolicy="no-referrer" />
          <span className="user-name">{currentUserDoc?.displayName || user.displayName}</span>
          {isAdmin && <span className="admin-badge">admin</span>}
          <button className="btn-logout" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </header>

      <nav className="bottom-nav">
        {NAV.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>

      {tab !== 'users' && (
        <button className="fab" onClick={() => setTab(tab === 'add' ? 'home' : 'add')} aria-label="Agregar gasto">
          <span className={`fab-icon ${tab === 'add' ? 'fab-icon-close' : ''}`}>{Icons.plus}</span>
        </button>
      )}

      <main>
        {tab === 'add' ? (
          <ExpenseForm user={user} users={users} activities={activities} currentActivityId={currentActivityId} onAdded={() => setTab('expenses')} />
        ) : expensesLoading ? (
          <div className="loading">Cargando...</div>
        ) : tab === 'home' ? (
          <HomePage expenses={filteredExpenses} users={users} currentUserEmail={user.email} onAddExpense={() => setTab('add')} activity={currentActivity} />
        ) : tab === 'history' ? (
          <MonthlySummary expenses={filteredExpenses} users={users} currentUserEmail={user.email} />
        ) : tab === 'expenses' ? (
          <ExpenseList expenses={filteredExpenses} users={users} />
        ) : (
          <UserManager users={users} currentUserDoc={currentUserDoc} currentActivity={currentActivity} />
        )}
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import MonthlySummary from './components/MonthlySummary'

export default function App() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('summary')

  useEffect(() => {
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
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Gastos Compartidos</h1>
        <p className="subtitle">nahuel · Caro · Juli</p>
      </header>

      <main>
        <ExpenseForm />

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

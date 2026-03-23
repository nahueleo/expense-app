import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'asc'))
    return onSnapshot(
      q,
      snap => { setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      ()   => setLoading(false),
    )
  }, [])

  return { expenses, loading }
}

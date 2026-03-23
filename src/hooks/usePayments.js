import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export function usePayments(activityId) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!activityId) { setPayments([]); setLoading(false); return }
    const q = query(collection(db, 'payments'), where('activityId', '==', activityId))
    return onSnapshot(
      q,
      snap => { setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      ()   => setLoading(false),
    )
  }, [activityId])

  return { payments, loading }
}

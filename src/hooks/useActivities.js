import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export function useActivities() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
    return onSnapshot(
      q,
      snap => { setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
  }, [])

  return { activities, loading }
}

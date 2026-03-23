import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDbdORB7g3ZfYYIdmD5LfLbwnWN_7Mmw9I',
  authDomain: 'expense-app-f6bad.firebaseapp.com',
  projectId: 'expense-app-f6bad',
  storageBucket: 'expense-app-f6bad.firebasestorage.app',
  messagingSenderId: '488091374369',
  appId: '1:488091374369:web:dafad326ad57e56e13a460',
  measurementId: 'G-QLQ545XQLG',
}

const app = initializeApp(firebaseConfig)

// Analytics is only available in supported browser environments.
export let analytics = null
if (typeof window !== 'undefined') {
  isSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app)
  })
}

export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export { app }

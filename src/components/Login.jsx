import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { useState } from 'react'

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    try {
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        await signInWithPopup(auth, googleProvider)
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Gastos Compartidos</h1>
        <p className="login-subtitle">nahuel · Caro · Juli</p>
        <button onClick={handleLogin} disabled={loading} className="btn-google">
          {loading ? 'Iniciando...' : 'Iniciar sesión con Google'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  )
}

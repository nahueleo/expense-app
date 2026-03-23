// Migra los gastos con payer como nombre legacy -> email del usuario registrado
// Uso: node migrate-payers.js

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env', 'utf-8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...rest] = line.split('=')
      return [key.trim(), rest.join('=').trim()]
    })
)

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrate() {
  // Cargar usuarios registrados
  const usersSnap = await getDocs(collection(db, 'users'))
  const users = usersSnap.docs.map(d => d.data())

  if (users.length === 0) {
    console.error('No hay usuarios en la coleccion. Agrega los usuarios primero desde la app.')
    process.exit(1)
  }

  console.log('Usuarios encontrados:')
  users.forEach(u => console.log(`  ${u.displayName} -> ${u.email}`))

  // Cargar gastos
  const expensesSnap = await getDocs(collection(db, 'expenses'))
  const toMigrate = expensesSnap.docs.filter(d => !d.data().payer?.includes('@'))

  if (toMigrate.length === 0) {
    console.log('\nNo hay gastos para migrar. Todos ya tienen email como payer.')
    process.exit(0)
  }

  console.log(`\nMigrando ${toMigrate.length} gastos...`)

  let updated = 0
  let skipped = 0

  for (const expDoc of toMigrate) {
    const exp = expDoc.data()
    const matchedUser = users.find(
      u => u.displayName.toLowerCase() === exp.payer?.toLowerCase()
    )

    if (!matchedUser) {
      console.log(`  ⚠ "${exp.name}" -> payer "${exp.payer}" no tiene usuario con ese nombre. Saltando.`)
      skipped++
      continue
    }

    await updateDoc(doc(db, 'expenses', expDoc.id), { payer: matchedUser.email })
    console.log(`  ✓ "${exp.name}" -> ${exp.payer} => ${matchedUser.email}`)
    updated++
  }

  console.log(`\nListo! ${updated} actualizados, ${skipped} saltados.`)
  if (skipped > 0) {
    console.log('Los saltados quedaron sin cambios. Revisalos manualmente en la app (editar -> cambiar payer).')
  }
  process.exit(0)
}

migrate().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})

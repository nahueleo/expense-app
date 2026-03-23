// Carga inicial de gastos
// Uso: node seed.js (requiere tener el .env configurado)

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, query } from 'firebase/firestore'
import { readFileSync } from 'fs'

// Leer variables de entorno del .env manualmente
const envFile = readFileSync('.env', 'utf-8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=').map(s => s.trim()))
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

const initialExpenses = [
  {
    name: 'CR2026',
    payer: 'nahuel',
    installments: 12,
    totalAmount: 960000,
    firstPaymentMonth: '2026-04',
  },
  {
    name: 'Vuelos',
    payer: 'Caro',
    installments: 3,
    totalAmount: 1048619.55,
    firstPaymentMonth: '2026-04',
  },
  {
    name: 'Equipos Transfers',
    payer: 'nahuel',
    installments: 1,
    totalAmount: 314400,
    firstPaymentMonth: '2026-04',
  },
  {
    name: 'Dpto',
    payer: 'Juli',
    installments: 1,
    totalAmount: 427500,
    firstPaymentMonth: '2026-04',
  },
  {
    name: 'Pases',
    payer: 'nahuel',
    installments: 6,
    totalAmount: 193400,
    firstPaymentMonth: '2026-05',
  },
  {
    name: 'CR2026 Service Charge',
    payer: 'nahuel',
    installments: 1,
    totalAmount: 144000,
    firstPaymentMonth: '2026-04',
  },
]

async function seed() {
  // Verificar si ya hay datos
  const existing = await getDocs(query(collection(db, 'expenses')))
  if (!existing.empty) {
    console.log(`Ya existen ${existing.size} gastos en la base de datos. Abortando para no duplicar.`)
    console.log('Si queres recargar, elimina los gastos desde la app primero.')
    process.exit(0)
  }

  console.log('Cargando gastos iniciales...')
  for (const expense of initialExpenses) {
    await addDoc(collection(db, 'expenses'), {
      ...expense,
      createdAt: new Date(),
    })
    console.log(`  ✓ ${expense.name}`)
  }
  console.log(`\nListo! Se cargaron ${initialExpenses.length} gastos.`)
  process.exit(0)
}

seed().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})

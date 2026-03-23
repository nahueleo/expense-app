const PALETTE = [
  { background: '#d0ebff', color: '#1864ab' },
  { background: '#fce8f3', color: '#8a1a5a' },
  { background: '#fff3bf', color: '#7c5f00' },
  { background: '#e8f5e9', color: '#2e7d32' },
  { background: '#f3e5f5', color: '#6a1b9a' },
]

// Fallback for existing data with hardcoded names
const LEGACY = { nahuel: 0, Caro: 1, Juli: 2 }

export function getBadgeStyle(displayName, users) {
  const idx = users.findIndex(u => u.displayName === displayName)
  if (idx !== -1) return PALETTE[idx % PALETTE.length]
  const legacyIdx = LEGACY[displayName]
  if (legacyIdx !== undefined) return PALETTE[legacyIdx]
  return { background: '#eee', color: '#555' }
}

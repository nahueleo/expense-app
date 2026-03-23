const PALETTE = [
  { background: '#d0ebff', color: '#1864ab' },
  { background: '#fce8f3', color: '#8a1a5a' },
  { background: '#fff3bf', color: '#7c5f00' },
  { background: '#e8f5e9', color: '#2e7d32' },
  { background: '#f3e5f5', color: '#6a1b9a' },
]

export function getBadgeStyle(displayName, users) {
  const idx = users.findIndex(u => u.displayName === displayName)
  if (idx !== -1) return PALETTE[idx % PALETTE.length]
  return { background: '#eee', color: '#555' }
}

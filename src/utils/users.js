// Resolve a payer value (email or legacy name) to display name
export function getPayerDisplay(payerValue, users) {
  if (!payerValue) return '?'
  if (payerValue.includes('@')) {
    return users.find(u => u.email === payerValue)?.displayName || payerValue
  }
  return payerValue // legacy: stored as name directly
}

// Normalize payer to display name for balance calculation keys
export function normalizePayerKey(payerValue, users) {
  return getPayerDisplay(payerValue, users)
}

/**
 * Builds payment links for MP and MODO.
 *
 * mpAlias: full personal MP link (https://mpago.la/xxxxxx)
 *   — generated in MP app: Cobrar → Compartir link
 *   — appending ?amount=X pre-fills the amount and opens the app on iOS
 *
 * modoAlias: MODO username/alias
 *   — https://link.modo.com.ar/ALIAS?amount=X opens MODO app on iOS
 */

export function buildMpLink(mpAlias, amount) {
  if (!mpAlias) return null
  const rounded = Math.round(amount)
  // If it's already a full URL (mpago.la or mercadopago.com.ar)
  if (mpAlias.startsWith('http')) {
    const url = new URL(mpAlias)
    url.searchParams.set('amount', rounded)
    return url.toString()
  }
  // Fallback: treat as mpago.la username
  return `https://mpago.la/${mpAlias}?amount=${rounded}`
}

export function buildModoLink(modoAlias, amount) {
  if (!modoAlias) return null
  const rounded = Math.round(amount)
  return `https://link.modo.com.ar/${modoAlias}?amount=${rounded}`
}

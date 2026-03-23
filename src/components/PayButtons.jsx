import { buildMpLink, buildModoLink } from '../utils/paymentLinks'

export default function PayButtons({ user, amount }) {
  if (!user) return null

  const mpLink   = buildMpLink(user.mpAlias, amount)
  const modoLink = buildModoLink(user.modoAlias, amount)

  if (!mpLink && !modoLink) return null

  return (
    <div className="pay-buttons">
      {mpLink && (
        <a href={mpLink} target="_blank" rel="noopener noreferrer" className="btn-pay btn-pay-mp">
          Pagar MP
        </a>
      )}
      {modoLink && (
        <a href={modoLink} target="_blank" rel="noopener noreferrer" className="btn-pay btn-pay-modo">
          MODO
        </a>
      )}
    </div>
  )
}

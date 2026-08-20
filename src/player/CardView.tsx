import type { Card, Theme } from '../model/types'
import { formatDate } from '../model/dates'
import { mediaStyle, creditLine } from './media'

interface Props {
  card: Card
  theme: Theme
  /** Toont het tijdstip; wordt bepaald door de as, zodat kaart en as
   *  hetzelfde vertellen. */
  showTime: boolean
}

/**
 * Eén kaart, in de vorm die bij zijn type hoort.
 *
 * Elk type vult dezelfde ruimte maar verdeelt hem anders. De kaart weet niets
 * van scrollen of van de as — dat zit in de speler eromheen.
 */
export function CardView({ card, theme, showTime }: Props) {
  const datum = formatDate(card.date, showTime)

  switch (card.type) {
    case 'title':
      return <TitleCard card={card} theme={theme} />
    case 'image':
      return <ImageOnlyCard card={card} theme={theme} />
    case 'text':
      return <TextCard card={card} theme={theme} datum={datum} />
    case 'quote':
      return <QuoteCard card={card} theme={theme} datum={datum} />
    case 'graphic':
      return <GraphicCard card={card} theme={theme} datum={datum} />
    case 'image-text':
    default:
      return <ImageTextCard card={card} theme={theme} datum={datum} />
  }
}

function TitleCard({ card, theme }: { card: Card; theme: Theme }) {
  return (
    <article className="pc pc-title">
      {card.media && (
        <div className="pc-bleed">
          <img
            src={card.media.src}
            alt={card.media.alt}
            style={mediaStyle(card.media, 'cover')}
          />
          <div className="pc-veil pc-veil-strong" />
        </div>
      )}
      <div className="pc-inner pc-center">
        <span className="pc-badge" style={{ background: theme.accent, color: theme.onAccent }}>
          Dossier
        </span>
        <h1 className="pc-h1">{card.title || 'Naamloos dossier'}</h1>
        {card.subtitle && <p className="pc-standfirst">{card.subtitle}</p>}
        <p className="pc-hint" aria-hidden="true">
          Scrol om te beginnen
        </p>
      </div>
    </article>
  )
}

function ImageTextCard({
  card,
  theme,
  datum,
}: {
  card: Card
  theme: Theme
  datum: string
}) {
  const naast = card.textPlacement === 'beside'
  const onder = card.textPlacement === 'below'

  if (!card.media) {
    return <TextCard card={card} theme={theme} datum={datum} />
  }

  return (
    <article className={`pc pc-imagetext ${naast ? 'is-beside' : onder ? 'is-below' : 'is-over'}`}>
      <div className={onder || naast ? 'pc-framed' : 'pc-bleed'}>
        <img
          src={card.media.src}
          alt={card.media.alt}
          style={mediaStyle(card.media, 'cover')}
        />
        {!onder && !naast && <div className="pc-veil" />}
      </div>

      <div className="pc-inner">
        <Meta datum={datum} theme={theme} />
        <h2 className="pc-h2">{card.title}</h2>
        {card.body && <p className="pc-body">{card.body}</p>}
        <Credit card={card} />
      </div>
    </article>
  )
}

function ImageOnlyCard({ card, theme }: { card: Card; theme: Theme }) {
  if (!card.media) return <Empty theme={theme} />
  return (
    <article className="pc pc-imageonly">
      <div className="pc-bleed">
        <img src={card.media.src} alt={card.media.alt} style={mediaStyle(card.media, 'cover')} />
      </div>
      {creditLine(card.media) && (
        <div className="pc-inner pc-bottom">
          <Credit card={card} />
        </div>
      )}
    </article>
  )
}

function TextCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  return (
    <article className="pc pc-text">
      <div className="pc-inner pc-middle">
        <Meta datum={datum} theme={theme} />
        <h2 className="pc-h2">{card.title}</h2>
        {card.body && <p className="pc-body pc-body-lead">{card.body}</p>}
      </div>
    </article>
  )
}

function QuoteCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  return (
    <article className="pc pc-quote">
      {card.media && (
        <div className="pc-bleed">
          <img src={card.media.src} alt={card.media.alt} style={mediaStyle(card.media, 'cover')} />
          <div className="pc-veil pc-veil-strong" />
        </div>
      )}
      <div className="pc-inner pc-middle">
        <Meta datum={datum} theme={theme} />
        <blockquote className="pc-quotetext">
          <span className="pc-quotemark" style={{ color: theme.accent }} aria-hidden="true">
            “
          </span>
          {card.body || card.title}
        </blockquote>
        {card.quoteAttribution && (
          <p className="pc-attrib">{card.quoteAttribution}</p>
        )}
        <Credit card={card} />
      </div>
    </article>
  )
}

function GraphicCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  return (
    <article className="pc pc-graphic">
      <div className="pc-inner">
        <Meta datum={datum} theme={theme} />
        <h2 className="pc-h3">{card.title}</h2>
        {card.media ? (
          <div className="pc-graphicframe">
            {/* 'contain': een grafiek mag nooit bijgesneden worden. */}
            <img
              src={card.media.src}
              alt={card.media.alt}
              style={mediaStyle(card.media, 'contain')}
            />
          </div>
        ) : (
          <Empty theme={theme} />
        )}
        <Credit card={card} />
      </div>
    </article>
  )
}

function Meta({ datum, theme }: { datum: string; theme: Theme }) {
  return (
    <p className="pc-meta">
      <span className="pc-dot" style={{ background: theme.accent }} aria-hidden="true" />
      {datum}
    </p>
  )
}

function Credit({ card }: { card: Card }) {
  if (!card.media) return null
  const regel = creditLine(card.media)
  if (!regel) return null
  return <p className="pc-credit">{regel}</p>
}

function Empty({ theme }: { theme: Theme }) {
  return (
    <p className="pc-empty" style={{ borderColor: theme.axisLine, color: theme.textMuted }}>
      Nog geen beeld gekozen
    </p>
  )
}

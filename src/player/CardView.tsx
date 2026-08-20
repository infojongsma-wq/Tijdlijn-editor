import type { Annotation, Card, Media, Theme } from '../model/types'
import { formatDate } from '../model/dates'
import { sanitizeRich } from '../model/richtext'
import { afgeleid } from '../model/palette'
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
      {card.media && <Beeld media={card.media} theme={theme} veil="strong" />}
      <div className="pc-inner pc-center">
        <span
          className="pc-badge"
          style={{ background: theme.accent, color: afgeleid(theme).onAccent }}
        >
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
      <Beeld
        media={card.media}
        theme={theme}
        veil={onder || naast ? 'none' : 'soft'}
        ingekaderd={onder || naast}
      />
      <div className="pc-inner">
        <Meta datum={datum} theme={theme} />
        <h2 className="pc-h2">{card.title}</h2>
        <Body html={card.body} />
        <Credit card={card} />
      </div>
    </article>
  )
}

function ImageOnlyCard({ card, theme }: { card: Card; theme: Theme }) {
  if (!card.media) return <Empty theme={theme} />
  return (
    <article className="pc pc-imageonly">
      <Beeld media={card.media} theme={theme} veil="none" />
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
        <Body html={card.body} lead />
      </div>
    </article>
  )
}

function QuoteCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  return (
    <article className="pc pc-quote">
      {card.media && <Beeld media={card.media} theme={theme} veil="strong" />}
      <div className="pc-inner pc-middle">
        <Meta datum={datum} theme={theme} />
        <blockquote className="pc-quotetext">
          <span className="pc-quotemark" style={{ color: theme.accent }} aria-hidden="true">
            “
          </span>
          {card.body ? (
            <span dangerouslySetInnerHTML={{ __html: sanitizeRich(card.body) }} />
          ) : (
            card.title
          )}
        </blockquote>
        {card.quoteAttribution && <p className="pc-attrib">{card.quoteAttribution}</p>}
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
            <div className="pc-mediabox">
              <img
                src={card.media.src}
                alt={card.media.alt}
                style={mediaStyle(card.media, 'contain')}
              />
              <Aanwijzers annotations={card.media.annotations} theme={theme} />
            </div>
          </div>
        ) : (
          <Empty theme={theme} />
        )}
        <Credit card={card} />
      </div>
    </article>
  )
}

/**
 * De foto met zijn sluier en zijn tekstballonnen.
 *
 * De sluier wordt getint met de achtergrondkleur van het thema in plaats van
 * met zwart. Daardoor zie je een kleurwijziging meteen terug op elke kaart, ook
 * op kaarten die helemaal met beeld gevuld zijn.
 */
function Beeld({
  media,
  theme,
  veil,
  ingekaderd,
}: {
  media: Media
  theme: Theme
  veil: 'none' | 'soft' | 'strong'
  ingekaderd?: boolean
}) {
  return (
    <div className={ingekaderd ? 'pc-framed' : 'pc-bleed'}>
      <img src={media.src} alt={media.alt} style={mediaStyle(media, 'cover')} />
      {veil !== 'none' && (
        <div className={`pc-veil ${veil === 'strong' ? 'pc-veil-strong' : ''}`} />
      )}
      <Aanwijzers annotations={media.annotations} theme={theme} />
    </div>
  )
}

/**
 * Tekstballonnen met een verbindingslijn naar een punt in het beeld.
 *
 * De ballon springt vanzelf naar de andere kant als het punt in de rechterhelft
 * ligt; anders loopt hij het beeld uit. Dat scheelt de redacteur een keuze die
 * toch altijd hetzelfde antwoord heeft.
 */
function Aanwijzers({ annotations, theme }: { annotations: Annotation[]; theme: Theme }) {
  if (annotations.length === 0) return null
  const extra = afgeleid(theme)

  return (
    <div className="an-laag">
      {annotations.map((a, i) => {
        const naarLinks = a.x > 0.55
        return (
          <div
            key={a.id}
            className={`an ${naarLinks ? 'is-left' : 'is-right'} ${
              a.reveal === 'hover' ? 'is-hover' : ''
            }`}
            style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
            tabIndex={a.reveal === 'hover' ? 0 : -1}
            aria-label={a.reveal === 'hover' ? a.text : undefined}
          >
            <span className="an-punt" style={{ borderColor: theme.accent }}>
              <span className="an-kern" style={{ background: theme.accent }} />
            </span>
            {a.text && (
              <span
                className="an-ballon"
                style={{
                  background: theme.background,
                  color: theme.text,
                  borderColor: extra.axisLine,
                }}
              >
                <span className="an-lijn" style={{ background: theme.accent }} aria-hidden="true" />
                {a.text}
              </span>
            )}
            {a.reveal === 'hover' && !a.text && <span className="sr-only">Aanwijzer {i + 1}</span>}
          </div>
        )
      })}
    </div>
  )
}

function Body({ html, lead }: { html: string; lead?: boolean }) {
  if (!html) return null
  return (
    <p
      className={`pc-body ${lead ? 'pc-body-lead' : ''}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRich(html) }}
    />
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
  const extra = afgeleid(theme)
  return (
    <p className="pc-empty" style={{ borderColor: extra.axisLine, color: extra.textMuted }}>
      Nog geen beeld gekozen
    </p>
  )
}

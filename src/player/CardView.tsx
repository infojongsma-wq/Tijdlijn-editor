import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Card, Media, Theme } from '../model/types'
import { formatDate } from '../model/dates'
import { sanitizeRich } from '../model/richtext'
import { afgeleid, tekstVoor } from '../model/palette'
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

/**
 * De binnenkolom van een kaart. De lezer scrolt alleen door het verhaal, nooit
 * binnen een kaart — dus geen eigen scrollbalkje. Past de inhoud niet, dan
 * wordt de tekst stap voor stap iets kleiner tot hij past, zoals een titeldia
 * in PowerPoint, met een ondergrens zodat het leesbaar blijft.
 */
function Inner({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const pas = () => {
      el.style.setProperty('--fit', '1')
      let f = 1
      while (el.scrollHeight > el.clientHeight + 1 && f > 0.68) {
        f = Math.max(0.68, Math.round((f - 0.05) * 100) / 100)
        el.style.setProperty('--fit', String(f))
      }
    }
    pas()
    // Hermeten bij elk ander kaderformaat; --fit verandert de buitenmaat niet,
    // dus dit lust niet.
    const observer = new ResizeObserver(pas)
    observer.observe(el)
    return () => observer.disconnect()
  })

  return (
    <div ref={ref} className={`pc-inner ${className}`}>
      {children}
    </div>
  )
}

function TitleCard({ card, theme }: { card: Card; theme: Theme }) {
  return (
    <article className="pc pc-title">
      {card.media && <Beeld media={card.media} theme={theme} veil="strong" />}
      <Inner className="pc-center">
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
      </Inner>
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
      <Inner>
        <Meta datum={datum} theme={theme} />
        <h2 className="pc-h2">{card.title}</h2>
        <Body html={card.body} />
        <Credit card={card} />
      </Inner>
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
      <Inner className="pc-middle">
        <Meta datum={datum} theme={theme} />
        <h2 className="pc-h2">{card.title}</h2>
        <Body html={card.body} lead />
      </Inner>
    </article>
  )
}

function QuoteCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  // Met kader blijft de foto vol in kleur en draagt het gekleurde vlak de
  // leesbaarheid; zonder kader dimt de sluier de foto, zoals voorheen.
  const kader = card.quoteFrame

  return (
    <article className="pc pc-quote">
      {card.media && <Beeld media={card.media} theme={theme} veil={kader ? 'none' : 'strong'} />}
      <Inner className="pc-middle">
        <div
          className={kader ? 'pc-quotepanel' : undefined}
          style={
            kader
              ? { background: card.quoteFrameColor, color: tekstVoor(card.quoteFrameColor) }
              : undefined
          }
        >
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
      </Inner>
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
              <Aanwijzers media={card.media} theme={theme} fit="contain" />
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
      <Aanwijzers media={media} theme={theme} fit="cover" />
    </div>
  )
}

/**
 * Rekent een positie in beeldfracties om naar fracties van het kader waarin de
 * afbeelding wordt getoond.
 *
 * De editor bewaart aanwijzers als fracties van de vólledige afbeelding. In de
 * speler is de foto echter bijgesneden (object-fit: cover met het brandpunt als
 * object-position, plus eventueel zoom) of juist geletterboxt (contain, bij een
 * grafiek). Zonder omrekening wijst een punt dan naast zijn onderwerp zodra het
 * kader een andere verhouding heeft dan de foto — op een telefoon vrijwel
 * altijd.
 */
function beeldNaarKader(
  ax: number,
  ay: number,
  media: Media,
  kader: { w: number; h: number },
  fit: 'cover' | 'contain',
): { x: number; y: number } {
  const { width: w, height: h } = media
  // Onbekende beeldmaten (sommige SVG's): geen omrekening mogelijk; de oude
  // benadering is dan het beste dat we hebben.
  if (!w || !h || !kader.w || !kader.h) return { x: ax, y: ay }

  const { focalX, focalY, zoom } = media.adjust
  const s = fit === 'cover' ? Math.max(kader.w / w, kader.h / h) : Math.min(kader.w / w, kader.h / h)
  // object-position: bij cover volgt die het brandpunt, bij contain het midden.
  const px = fit === 'cover' ? focalX : 0.5
  const py = fit === 'cover' ? focalY : 0.5
  let x = (ax * w * s + (kader.w - w * s) * px) / kader.w
  let y = (ay * h * s + (kader.h - h * s) * py) / kader.h

  // transform: scale(zoom) heeft zijn oorsprong in het brandpunt (media.ts).
  if (fit === 'cover' && zoom !== 1) {
    x = focalX + (x - focalX) * zoom
    y = focalY + (y - focalY) * zoom
  }
  return { x, y }
}

const klem01 = (n: number, marge = 0.02) => Math.min(1 - marge, Math.max(marge, n))

/**
 * Aanwijzers op het beeld, in drie smaken uit dezelfde bouwsteen:
 *
 * - punt (of eigen picto) met lijn en tekstballon — de klassieke aanwijzer;
 * - punt of picto zonder tekst — een markering, bijvoorbeeld op een kaart;
 * - los tekstblok zonder punt en lijn — vrij op het beeld te plaatsen.
 *
 * De laag meet zichzelf en rekent alle posities om van beeld- naar
 * kaderfracties, zodat een punt op de wolf óók op de wolf staat als de foto op
 * een telefoon smal is uitgesneden. Valt het anker daarbij buiten de zichtbare
 * uitsnede, dan verdwijnt de hele aanwijzer — het onderwerp is dan immers niet
 * in beeld. Een los tekstblok wordt juist binnen de rand geklemd.
 */
function Aanwijzers({
  media,
  theme,
  fit,
}: {
  media: Media
  theme: Theme
  fit: 'cover' | 'contain'
}) {
  const laagRef = useRef<HTMLDivElement>(null)
  const [kader, setKader] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = laagRef.current
    if (!el) return
    const meet = () => {
      const r = el.getBoundingClientRect()
      setKader((oud) => (Math.abs(oud.w - r.width) < 0.5 && Math.abs(oud.h - r.height) < 0.5 ? oud : { w: r.width, h: r.height }))
    }
    meet()
    const observer = new ResizeObserver(meet)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const annotations = media.annotations
  if (annotations.length === 0) return null
  const extra = afgeleid(theme)

  return (
    <div className="an-laag" ref={laagRef}>
      {kader.w > 0 &&
        annotations.map((a, i) => {
          const anker = beeldNaarKader(a.x, a.y, media, kader, fit)
          const balRuw = beeldNaarKader(a.bx, a.by, media, kader, fit)

          if (a.line) {
            // Anker buiten de uitsnede: het onderwerp is niet in beeld.
            if (anker.x < -0.01 || anker.x > 1.01 || anker.y < -0.01 || anker.y > 1.01) {
              return null
            }
          }
          const bal = a.line
            ? balRuw
            : { x: klem01(balRuw.x, 0.04), y: klem01(balRuw.y, 0.05) }

          // Verbergen-bij-aanwijzen vraagt een punt om aan te wijzen; zonder
          // punt is er niets om op te richten en blijft het blok gewoon staan.
          const verborgen = a.reveal === 'hover' && a.line
          return (
            <div key={a.id} className={`an ${verborgen ? 'is-hover' : ''}`}>
              {a.line && a.text && (
                <svg className="an-svg" aria-hidden="true">
                  <line
                    x1={`${anker.x * 100}%`}
                    y1={`${anker.y * 100}%`}
                    x2={`${bal.x * 100}%`}
                    y2={`${bal.y * 100}%`}
                    stroke={theme.accent}
                    strokeWidth="2"
                  />
                </svg>
              )}

              {a.text && (
                <span
                  className="an-ballon"
                  style={{
                    left: `${bal.x * 100}%`,
                    top: `${bal.y * 100}%`,
                    background: theme.background,
                    color: theme.text,
                    borderColor: extra.axisLine,
                  }}
                >
                  {a.text}
                </span>
              )}

              {a.line &&
                (a.icon ? (
                  <img
                    className="an-icoon"
                    src={a.icon}
                    alt=""
                    style={{ left: `${anker.x * 100}%`, top: `${anker.y * 100}%` }}
                    tabIndex={verborgen ? 0 : -1}
                    aria-label={verborgen ? a.text || `Aanwijzer ${i + 1}` : undefined}
                  />
                ) : (
                  <span
                    className="an-punt"
                    style={{
                      left: `${anker.x * 100}%`,
                      top: `${anker.y * 100}%`,
                      borderColor: theme.accent,
                    }}
                    tabIndex={verborgen ? 0 : -1}
                    aria-label={verborgen ? a.text || `Aanwijzer ${i + 1}` : undefined}
                  >
                    <span className="an-kern" style={{ background: theme.accent }} />
                  </span>
                ))}
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

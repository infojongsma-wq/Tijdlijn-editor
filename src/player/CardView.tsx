import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Card, Media, Theme } from '../model/types'
import { formatDate } from '../model/dates'
import { sanitizeRich } from '../model/richtext'
import { afgeleid, rgba, tekstVoor } from '../model/palette'
import { contrastRatio } from '../model/contrast'
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
    case 'compare':
      return <CompareCard card={card} theme={theme} datum={datum} />
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
function Inner({
  className = '',
  base = 'pc-inner',
  style,
  children,
}: {
  className?: string
  /** De grondklasse van het vlak dat moet passen. Standaard de hele kaart,
   *  maar bij een citaat in een kader is het kader zelf het vlak met een vaste
   *  maat — daar moet de tekst zich naar voegen, niet naar de kaart. */
  base?: string
  style?: CSSProperties
  children: ReactNode
}) {
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
    <div ref={ref} className={`${base} ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

function TitleCard({ card, theme }: { card: Card; theme: Theme }) {
  return (
    <article className="pc pc-title">
      {card.media && <Beeld media={card.media} theme={theme} veil="strong" />}
      <Inner className="pc-center">
        {/* Leeg label betekent: geen blokje. Eerder viel het hier terug op
            'Dossier', waardoor het onmogelijk was het weg te laten. */}
        {card.badge && (
          <span
            className="pc-badge"
            style={{ background: theme.accent, color: afgeleid(theme).onAccent }}
          >
            {card.badge}
          </span>
        )}
        <Kop card={card} niveau={1} />
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
        <Kop card={card} />
        <Body html={card.body} kleur={card.bodyColor} />
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
        <Kop card={card} />
        <Body html={card.body} lead kleur={card.bodyColor} />
      </Inner>
    </article>
  )
}

/**
 * Het citaat in drie vormen.
 *
 * - `over`  — de foto wordt gedimd, de tekst staat er los overheen.
 * - `kader` — de foto blijft vol in kleur en het citaat krijgt een eigen vlak
 *             dat je over de foto kunt verschuiven. Nodig omdat een citaat
 *             midden op de kaart nu juist het gezicht kan bedekken waar het
 *             over gaat.
 * - `naast` — citaat en foto staan elk in een eigen kader op een gekleurd
 *             vlak. De foto is dan geen achtergrond meer maar zelfstandig
 *             beeld, dus hij wordt niet gedimd en niet bijgesneden tot
 *             kaartformaat.
 */
function QuoteCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  // In een kader ligt de tekst niet op de tijdlijnkleur maar op de kleur van
  // het kader. Tekst én accent moeten dat volgen, anders staat het
  // aanhalingsteken in Oost Blauw op een blauw kader — onzichtbaar.
  const vlakThema: Theme = {
    ...theme,
    text: tekstVoor(card.quoteFrameColor),
    accent: accentOp(theme.accent, card.quoteFrameColor),
  }
  const inhoud = (
    <QuoteInhoud
      card={card}
      theme={card.quoteStyle === 'over' ? theme : vlakThema}
      datum={datum}
    />
  )

  if (card.quoteStyle === 'naast') {
    const lijn = lijnKleur(card, card.quoteBackdrop)
    return (
      <article
        className="pc pc-quote is-naast"
        style={{ background: card.quoteBackdrop, color: tekstVoor(card.quoteBackdrop) }}
      >
        <div className={`pc-quoteduo is-${card.quoteSide}`}>
          <div className="pc-quotefoto" style={omlijning(lijn)}>
            <MediaVak media={card.media} theme={theme} />
          </div>
          <Inner
            base="pc-quotepanel"
            style={{
              background: card.quoteFrameColor,
              color: tekstVoor(card.quoteFrameColor),
              ...omlijning(lijn),
            }}
          >
            {inhoud}
          </Inner>
        </div>
      </article>
    )
  }

  if (card.quoteStyle === 'kader') {
    const lijn = lijnKleur(card, card.quoteFrameColor)
    return (
      <article className="pc pc-quote is-kader">
        {card.media && <Beeld media={card.media} theme={theme} veil="none" />}
        <div className="pc-quotearea">
          <Inner
            base="pc-quotepanel"
            style={{
              background: card.quoteFrameColor,
              color: tekstVoor(card.quoteFrameColor),
              ...omlijning(lijn),
              ...kaderPlek(card.quoteBoxX, card.quoteBoxY),
            }}
          >
            {inhoud}
          </Inner>
        </div>
      </article>
    )
  }

  return (
    <article className="pc pc-quote">
      {card.media && <Beeld media={card.media} theme={theme} veil="strong" />}
      <Inner className="pc-middle">{inhoud}</Inner>
    </article>
  )
}

/**
 * De plek van het citaatkader, als fractie van het vrije vlak.
 *
 * De truc: verschuif het kader met dezelfde fractie als waarop je het zet. Bij
 * 0 staat het op 0% en schuift het 0% terug — tegen de linkerrand. Bij 1 staat
 * het op 100% en schuift het zijn volle breedte terug — tegen de rechterrand.
 * Bij 0,5 precies in het midden. Daardoor blijft het kader altijd binnen de
 * kaart, wat de breedte van het scherm ook is; met een gewone middelpunt-
 * positie zou het op een telefoon half buiten beeld vallen.
 */
function kaderPlek(x: number, y: number): CSSProperties {
  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    transform: `translate(${x * -100}%, ${y * -100}%)`,
  }
}

/**
 * De accentkleur zoals hij op dít vlak werkt.
 *
 * Het aanhalingsteken en de datumstip staan in de accentkleur van de tijdlijn.
 * Ligt daaronder een kader met een eigen kleur, dan kan die accentkleur
 * wegvallen: Oost Blauw op een blauw kader is niet te zien. Is het verschil te
 * klein — onder 3:1, de ondergrens die WCAG voor grote tekst en grafische
 * elementen aanhoudt — dan volgen ze de tekstkleur van het kader.
 */
function accentOp(accent: string, achtergrond: string): string {
  return contrastRatio(accent, achtergrond) >= 3 ? accent : tekstVoor(achtergrond)
}

/** De lijn om de kaders; null = geen lijn. */
function lijnKleur(card: Card, achtergrond: string): string | null {
  if (!card.quoteBorder) return null
  // Geen eigen kleur gekozen? Dan de tekstkleur van het vlak eronder, gedempt.
  // Zo is de lijn op een licht én op een donker kader te zien.
  return card.quoteBorderColor ?? rgba(tekstVoor(achtergrond), 0.28)
}

function omlijning(kleur: string | null): CSSProperties {
  return kleur ? { border: `1px solid ${kleur}` } : {}
}

/** De inhoud van een citaat, gelijk in alle drie de vormen. */
function QuoteInhoud({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  return (
    <>
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
    </>
  )
}

function GraphicCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  // Beeldvullend zet de grafiek over de hele kaart, met de tekst eroverheen —
  // goed voor een infographic die zelf al een achtergrond heeft. In een kader
  // krijgt hij een gekleurd vlak eromheen, met lucht.
  const vullend = card.graphicFit === 'vullend'

  if (vullend && card.media) {
    return (
      <article className="pc pc-graphic is-vullend">
        <Beeld media={card.media} theme={theme} veil="soft" fit="contain" />
        <Inner>
          <Meta datum={datum} theme={theme} />
          <Kop card={card} niveau={3} />
          <Credit card={card} />
        </Inner>
      </article>
    )
  }

  return (
    <article className="pc pc-graphic">
      <div className="pc-inner">
        <Meta datum={datum} theme={theme} />
        <Kop card={card} niveau={3} />
        {card.media ? (
          <div
            className="pc-graphicframe has-kader"
            style={{ background: card.graphicFrameColor }}
          >
            {/* 'contain': een grafiek in een kader mag nooit bijgesneden worden. */}
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
 * De vergelijkkaart: twee dingen naast elkaar zetten.
 *
 * Alles staat in één raster in plaats van in twee losse kolommen. Dat is het
 * verschil: kolommen bepalen ieder hun eigen hoogte, dus een langere tekst
 * links maakte de foto links kleiner dan die rechts. In een raster delen beide
 * beelden één rij en beide teksten één rij, dus zijn ze altijd even groot. Een
 * kortere tekst laat onderin ruimte over — precies wat je bij een vergelijking
 * wilt, want het oog moet de beelden kunnen vergelijken, niet de kaders.
 */
function CompareCard({ card, theme, datum }: { card: Card; theme: Theme; datum: string }) {
  const indeling = card.compareLayout

  // Met een eigen achtergrond gelden de tijdlijnkleuren hier niet meer: de
  // datumstip in Oost Blauw verdwijnt op een Oost Blauw vlak. Zelfde regel
  // als bij het citaat in een kader.
  const vlakThema: Theme = card.compareBackdrop
    ? {
        ...theme,
        background: card.compareBackdrop,
        text: tekstVoor(card.compareBackdrop),
        accent: accentOp(theme.accent, card.compareBackdrop),
      }
    : theme

  // Een leeg tekstblok houdt zijn vak in het raster. Body geeft bij lege tekst
  // niets terug; zonder deze omhulling zou het tweede tekstblok dan in het vak
  // van het eerste belanden en klopte de hele indeling niet meer.
  // Een tint achter een helft maakt het verschil ook in kleur zichtbaar. De
  // tekstkleur gaat mee, anders staat donkere tekst op een donkere tint.
  const vlak = (tint: string | null): CSSProperties | undefined =>
    tint ? { background: tint, color: tekstVoor(tint) } : undefined

  const tekstvak = (html: string, tint: string | null) => (
    <div className={`pc-comparetekst ${tint ? 'heeft-vlak' : ''}`} style={vlak(tint)}>
      <Body html={html} kleur={card.bodyColor} />
    </div>
  )

  return (
    <article
      className={`pc pc-compare is-${indeling}`}
      style={
        card.compareBackdrop
          ? { background: card.compareBackdrop, color: tekstVoor(card.compareBackdrop) }
          : undefined
      }
    >
      <Inner>
        <Meta datum={datum} theme={vlakThema} />
        <Kop card={card} niveau={3} />

        <div className="pc-comparegrid">
          {indeling === 'een-beeld-twee-tekst' ? (
            <>
              <MediaVak media={card.media} theme={vlakThema} tint={card.compareTintA} />
              {tekstvak(card.body, card.compareTintA)}
              {tekstvak(card.body2, card.compareTintB)}
            </>
          ) : (
            <>
              <MediaVak media={card.media} theme={vlakThema} tint={card.compareTintA} />
              <MediaVak media={card.media2} theme={vlakThema} tint={card.compareTintB} />
              {indeling === 'twee-beeld-twee-tekst' && (
                <>
                  {tekstvak(card.body, card.compareTintA)}
                  {tekstvak(card.body2, card.compareTintB)}
                </>
              )}
            </>
          )}
        </div>

        {indeling === 'twee-beeld-een-tekst' && (
          <Body html={card.body} kleur={card.bodyColor} />
        )}
        <Bijschriften card={card} />
      </Inner>
    </article>
  )
}

function MediaVak({
  media,
  theme,
  tint,
}: {
  media: Media | null
  theme: Theme
  /** Een gekleurd vlak om de foto heen; null = geen vlak. */
  tint?: string | null
}) {
  // Ook zonder foto blijft het vak in het raster staan. De lege melding los
  // neerzetten liet de rijverdeling kantelen: het tweede tekstblok belandde
  // dan onder de melding in plaats van onder het eerste.
  return (
    <div
      className={`pc-comparebeeld ${tint ? 'heeft-vlak' : ''} ${media ? '' : 'is-leeg'}`}
      style={tint ? { background: tint } : undefined}
    >
      {media ? (
        <div className="pc-mediabox">
          <img src={media.src} alt={media.alt} style={mediaStyle(media, 'cover')} />
          <Aanwijzers media={media} theme={theme} fit="cover" />
        </div>
      ) : (
        <Empty theme={theme} />
      )}
    </div>
  )
}

/** Beide rechtenregels van een vergelijkkaart, ontdubbeld. */
function Bijschriften({ card }: { card: Card }) {
  const regels = [card.media, card.media2]
    .filter((m): m is Media => m !== null)
    .map(creditLine)
    .filter(Boolean)
  const uniek = [...new Set(regels)]
  if (uniek.length === 0) return null
  return <p className="pc-credit">{uniek.join(' · ')}</p>
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
  fit = 'cover',
}: {
  media: Media
  theme: Theme
  veil: 'none' | 'soft' | 'strong'
  ingekaderd?: boolean
  fit?: 'cover' | 'contain'
}) {
  return (
    <div className={ingekaderd ? 'pc-framed' : 'pc-bleed'}>
      <img src={media.src} alt={media.alt} style={mediaStyle(media, fit)} />
      {veil !== 'none' && (
        <div className={`pc-veil ${veil === 'strong' ? 'pc-veil-strong' : ''}`} />
      )}
      <Aanwijzers media={media} theme={theme} fit={fit} />
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

  // De laag wordt óók zonder ballonnen opgebouwd (hij vangt geen muis en kost
  // niets). Zou hij pas verschijnen bij de eerste ballon, dan heeft de meting
  // hierboven — die maar één keer start — nooit een element gehad om te meten,
  // en blijft elke later toegevoegde ballon onzichtbaar.
  const annotations = media.annotations
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
            <div
              key={a.id}
              className={`an ${verborgen ? 'is-hover' : ''}`}
              // De maat gaat als factor mee naar de opmaak, zodat stip, kern,
              // rand en picto in één keer meeschalen.
              style={{ ['--an-schaal' as string]: a.size }}
            >
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
                    background: a.balloonColor ?? theme.background,
                    color: a.textColor ?? (a.balloonColor ? tekstVoor(a.balloonColor) : theme.text),
                    borderColor: a.balloonColor ? 'transparent' : extra.axisLine,
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
                      borderColor: a.dotColor ?? theme.accent,
                    }}
                    tabIndex={verborgen ? 0 : -1}
                    aria-label={verborgen ? a.text || `Aanwijzer ${i + 1}` : undefined}
                  >
                    <span className="an-kern" style={{ background: a.dotColor ?? theme.accent }} />
                  </span>
                ))}
            </div>
          )
        })}
    </div>
  )
}

function Body({ html, lead, kleur }: { html: string; lead?: boolean; kleur?: string | null }) {
  if (!html) return null
  return (
    <p
      className={`pc-body ${lead ? 'pc-body-lead' : ''}`}
      style={kleur ? { color: kleur } : undefined}
      dangerouslySetInnerHTML={{ __html: sanitizeRich(html) }}
    />
  )
}

/** De kop van een kaart, in de kleur van de kaart of anders die van het thema. */
function Kop({
  card,
  niveau = 2,
}: {
  card: Card
  niveau?: 1 | 2 | 3
}) {
  const stijl = card.headingColor ? { color: card.headingColor } : undefined
  if (niveau === 1) return <h1 className="pc-h1" style={stijl}>{card.title || 'Naamloos dossier'}</h1>
  if (niveau === 3) return <h2 className="pc-h3" style={stijl}>{card.title}</h2>
  return <h2 className="pc-h2" style={stijl}>{card.title}</h2>
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

import {
  DOC_VERSION,
  DEFAULT_ADJUST,
  type Annotation,
  type Card,
  type CardType,
  type PartialDate,
  type QuoteStyle,
  type Settings,
  type Theme,
  type TimelineDoc,
} from './types'
import { buildDate, sortKey } from './dates'
import { THEMA_DONKER, tekstVoor } from './palette'
import { contrastRatio } from './contrast'
import { isHtml, sanitizeRich, tekstNaarHtml } from './richtext'

export const DEFAULT_SETTINGS: Settings = {
  form: 'vertical',
  axis: 'left',
  direction: 'asc',
  showProgress: true,
  showCounter: true,
  pushTransition: true,
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function emptyCard(type: CardType = 'image-text'): Card {
  const nu = new Date()
  return {
    id: newId(),
    type,
    date: buildDate(nu.getFullYear(), nu.getMonth() + 1, nu.getDate()),
    title: '',
    body: '',
    media: null,
    quoteAttribution: '',
    subtitle: '',
    quoteStyle: 'over',
    quoteFrameColor: '#F5F0E8',
    quoteBoxX: 0.5,
    quoteBoxY: 0.5,
    quoteSide: 'links',
    quoteBackdrop: '#E7EEF9',
    quoteBorder: false,
    quoteBorderColor: null,
    textPlacement: 'over',
    source: '',
    badge: 'Dossier',
    headingColor: null,
    bodyColor: null,
    compareLayout: 'twee-beeld-een-tekst',
    compareBackdrop: null,
    compareTintA: null,
    compareTintB: null,
    media2: null,
    body2: '',
    graphicFit: 'kader',
    graphicFrameColor: '#FFFFFF',
  }
}

/** Een verse tijdlijn heeft bewust géén naam. Stond er 'Naamloze tijdlijn' in
 *  het veld, dan zag het eruit als een kop en niet als iets om in te vullen —
 *  en werd er onder die naam opgeslagen. Leeg toont een wenk, en het opslaan
 *  vraagt erom. */
export function emptyDoc(name = ''): TimelineDoc {
  return {
    version: DOC_VERSION,
    name,
    settings: { ...DEFAULT_SETTINGS },
    theme: { ...THEMA_DONKER },
    cards: [],
  }
}

/**
 * De kaarten in vertelvolgorde.
 *
 * De titelkaart staat altijd vooraan, ongeacht zijn datum en ongeacht de
 * sorteerrichting — hij is de opening van het verhaal, geen moment erin.
 */
export function orderedCards(doc: TimelineDoc): Card[] {
  const titels = doc.cards.filter((c) => c.type === 'title')
  const rest = doc.cards.filter((c) => c.type !== 'title')

  rest.sort((a, b) => {
    const verschil = sortKey(a.date) - sortKey(b.date)
    if (verschil !== 0) {
      return doc.settings.direction === 'asc' ? verschil : -verschil
    }
    // Gelijke datums: de invoervolgorde beslist, zodat het niet gaat wisselen
    // bij elke hertekening.
    return doc.cards.indexOf(a) - doc.cards.indexOf(b)
  })

  return [...titels, ...rest]
}

/** Kaarten die een punt op de as krijgen — de titelkaart hoort daar niet bij. */
export function axisCards(doc: TimelineDoc): Card[] {
  return orderedCards(doc).filter((c) => c.type !== 'title')
}

export function cardTypeLabel(type: CardType): string {
  switch (type) {
    case 'title': return 'Titelkaart'
    case 'image-text': return 'Beeld met tekst'
    case 'image': return 'Alleen beeld'
    case 'text': return 'Alleen tekst'
    case 'quote': return 'Citaat'
    case 'graphic': return 'Graphic'
    case 'compare': return 'Vergelijken'
    default: return 'Kaart'
  }
}

/** Kan dit kaarttype een beeld tonen? Alleen 'alleen tekst' niet. Het citaat
 *  gebruikt zijn beeld als achtergrond — dat hoorde hier dus ook bij, anders
 *  staat er een foto op de kaart die je nergens kunt bewerken. */
export function typeUsesMedia(type: CardType): boolean {
  return type !== 'text'
}

/** Heeft dit type een tweede beeld? Alleen de vergelijkkaart, en dan alleen
 *  in de indelingen die er twee tonen. */
export function typeUsesTweedeMedia(card: Card): boolean {
  return card.type === 'compare' && card.compareLayout !== 'een-beeld-twee-tekst'
}

/** Heeft dit type een tweede tekstblok? */
export function typeUsesTweedeTekst(card: Card): boolean {
  return card.type === 'compare' && card.compareLayout !== 'twee-beeld-een-tekst'
}

export function typeUsesBody(type: CardType): boolean {
  return type !== 'image'
}

/**
 * Leest een document uit een bestand en vult ontbrekende velden aan. Documenten
 * van een oudere versie mogen nooit een leeg scherm opleveren — liever een kaart
 * met een lege titel dan een foutmelding.
 */
export function normaliseDoc(raw: unknown): TimelineDoc {
  const basis = emptyDoc()
  if (!raw || typeof raw !== 'object') return basis

  const input = raw as Partial<TimelineDoc>
  const cards = Array.isArray(input.cards) ? input.cards.map(normaliseCard) : []

  return {
    version: DOC_VERSION,
    name: typeof input.name === 'string' && input.name ? input.name : basis.name,
    settings: { ...basis.settings, ...(input.settings ?? {}) },
    theme: veiligThema(input.theme, basis.theme),
    cards,
  }
}

/**
 * Het thema zoals het op déze kaart geldt.
 *
 * De meeste kaarten staan op de achtergrondkleur van de tijdlijn, maar een
 * citaat in de vorm 'naast elkaar' brengt zijn eigen gekleurde vlak mee. De as
 * moet dat volgen: anders staan de datums in wit op lichtblauw, en ligt er een
 * donkere sluier over een lichte kaart.
 */
export function kaartThema(card: Card, thema: Theme): Theme {
  const eigen =
    card.type === 'quote' && card.quoteStyle === 'naast'
      ? card.quoteBackdrop
      : card.type === 'compare'
        ? card.compareBackdrop
        : null
  if (!eigen) return thema
  return {
    ...thema,
    background: eigen,
    text: tekstVoor(eigen),
    // Het accent kleurt de voortgangsbalk en de actieve stip op de as. Valt
    // het weg tegen de eigen achtergrond — onder 3:1, de WCAG-ondergrens voor
    // grafische elementen — dan neemt het de tekstkleur van dat vlak over.
    accent: contrastRatio(thema.accent, eigen) >= 3 ? thema.accent : tekstVoor(eigen),
  }
}

function normaliseCard(raw: unknown): Card {
  const basis = emptyCard()
  if (!raw || typeof raw !== 'object') return basis

  const input = raw as Partial<Card>
  const media = normaliseMedia(input.media)
  const media2 = normaliseMedia(input.media2)

  return {
    ...basis,
    ...input,
    id: input.id ?? basis.id,
    // De citaatkaart had eerst alleen een aan/uit-schakelaar voor het kader.
    // Bestanden van toen kennen `quoteStyle` nog niet; die worden hier omgezet
    // zodat er niets van vorm verandert bij het openen.
    quoteStyle: leesQuoteStyle(input),
    quoteFrameColor:
      typeof input.quoteFrameColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.quoteFrameColor)
        ? input.quoteFrameColor
        : basis.quoteFrameColor,
    quoteBoxX: fractie(input.quoteBoxX, basis.quoteBoxX),
    quoteBoxY: fractie(input.quoteBoxY, basis.quoteBoxY),
    quoteSide:
      input.quoteSide === 'rechts' || input.quoteSide === 'boven' || input.quoteSide === 'onder'
        ? input.quoteSide
        : basis.quoteSide,
    quoteBackdrop: veiligeKleurOfNull(input.quoteBackdrop) ?? basis.quoteBackdrop,
    quoteBorder: input.quoteBorder === true,
    quoteBorderColor: veiligeKleurOfNull(input.quoteBorderColor),
    date: normaliseDate(input.date) ?? basis.date,
    // Oudere bestanden bewaarden de tekst zonder opmaak; die wordt hier omgezet
    // zodat er niets verloren gaat en er niets ongefilterds binnenkomt.
    body: leesTekst(input.body),
    body2: leesTekst(input.body2),
    // Ontbreekt het veld, dan is het een ouder bestand en geldt de standaard.
    // Staat het er leeg in, dan is dat een keuze: geen blokje.
    badge: typeof input.badge === 'string' ? input.badge.trim() : basis.badge,
    headingColor: veiligeKleurOfNull(input.headingColor),
    bodyColor: veiligeKleurOfNull(input.bodyColor),
    compareLayout:
      input.compareLayout === 'twee-beeld-twee-tekst' ||
      input.compareLayout === 'een-beeld-twee-tekst'
        ? input.compareLayout
        : basis.compareLayout,
    compareBackdrop: veiligeKleurOfNull(input.compareBackdrop),
    compareTintA: veiligeKleurOfNull(input.compareTintA),
    compareTintB: veiligeKleurOfNull(input.compareTintB),
    graphicFit: input.graphicFit === 'vullend' ? 'vullend' : 'kader',
    graphicFrameColor: veiligeKleurOfNull(input.graphicFrameColor) ?? basis.graphicFrameColor,
    media,
    media2,
  }
}

function normaliseMedia(raw: unknown): Card['media'] {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as NonNullable<Card['media']>
  return {
    src: veiligeSrc(String(m.src ?? '')),
    mime: String(m.mime ?? 'image/jpeg'),
    width: Number(m.width) || 0,
    height: Number(m.height) || 0,
    alt: String(m.alt ?? ''),
    caption: String(m.caption ?? ''),
    credit: String(m.credit ?? ''),
    adjust: { ...DEFAULT_ADJUST, ...(m.adjust ?? {}) },
    annotations: normaliseAnnotations(m.annotations),
  }
}

/** Een losse kleur uit een bestand: alleen echte hex, anders 'volg het thema'. */
function veiligeKleurOfNull(waarde: unknown): string | null {
  return typeof waarde === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(waarde.trim())
    ? waarde.trim()
    : null
}

/**
 * De vorm van de citaatkaart, ook uit bestanden van vóór `quoteStyle`.
 *
 * Die kenden alleen `quoteFrame`: aan betekende een gekleurd vlak over een
 * volle foto, uit een gedimde foto met de tekst erover. Dat zijn nu 'kader'
 * en 'over', dus een oud bestand gaat er ongewijzigd uitzien.
 */
function leesQuoteStyle(input: Partial<Card>): QuoteStyle {
  const stijl = (input as { quoteStyle?: unknown }).quoteStyle
  if (stijl === 'over' || stijl === 'kader' || stijl === 'naast') return stijl
  return (input as { quoteFrame?: unknown }).quoteFrame === true ? 'kader' : 'over'
}

/** Een fractie tussen 0 en 1. Alles daarbuiten of onleesbaar valt terug op de
 *  standaard; een NaN in een positie zou een kaart onzichtbaar maken. */
function fractie(waarde: unknown, terugval: number): number {
  return typeof waarde === 'number' && Number.isFinite(waarde)
    ? Math.min(1, Math.max(0, waarde))
    : terugval
}

function leesTekst(waarde: unknown): string {
  if (typeof waarde !== 'string' || waarde === '') return ''
  return isHtml(waarde) ? sanitizeRich(waarde) : tekstNaarHtml(waarde)
}

function normaliseAnnotations(raw: unknown): Annotation[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item): Annotation[] => {
    if (!item || typeof item !== 'object') return []
    const a = item as Partial<Annotation>
    if (typeof a.x !== 'number' || typeof a.y !== 'number') return []
    const klem = (n: number) => Math.min(1, Math.max(0, n))
    const x = klem(a.x)
    const y = klem(a.y)
    return [
      {
        id: typeof a.id === 'string' ? a.id : newId(),
        x,
        y,
        // Oudere bestanden kennen geen ballonpositie; die krijgt hij dan naast
        // het anker, weg van de dichtstbijzijnde rand.
        bx: typeof a.bx === 'number' ? klem(a.bx) : klem(x > 0.55 ? x - 0.3 : x + 0.3),
        by: typeof a.by === 'number' ? klem(a.by) : y,
        text: typeof a.text === 'string' ? a.text : '',
        reveal: a.reveal === 'hover' ? 'hover' : 'always',
        line: a.line !== false,
        dotColor: veiligeKleurOfNull(a.dotColor),
        textColor: veiligeKleurOfNull(a.textColor),
        balloonColor: veiligeKleurOfNull(a.balloonColor),
        // Alleen ingebedde afbeeldingen; een pad of webadres uit een bewerkt
        // bestand hoort hier niet doorheen te komen.
        icon: typeof a.icon === 'string' && a.icon.startsWith('data:image/') ? a.icon : null,
        // Buiten bereik of onleesbaar: terug naar de standaardmaat. Een 0 of
        // een NaN zou de markering onvindbaar klein maken.
        size:
          typeof a.size === 'number' && Number.isFinite(a.size)
            ? Math.min(3, Math.max(0.4, a.size))
            : 1,
      },
    ]
  })
}

/**
 * Een datum uit een bestand kan van alles zijn: een ouder formaat, handmatig
 * aangepast, of half ingevuld. Hier gaat hij door dezelfde molen als
 * gebruikersinvoer, zodat de speler nooit "undefined januari" toont en sortKey
 * nooit NaN oplevert.
 */
/**
 * Een geopend bestand is niet te vertrouwen. Beeld hoort ingebed te zijn
 * (data:) of, voor het meegeleverde voorbeeld, een relatief pad. Een absolute
 * URL met schema — http(s), javascript, wat dan ook — gaat eruit: die zou bij
 * de kijker een extern adres aanroepen zodra de kaart in beeld komt.
 */
function veiligeSrc(src: string): string {
  if (src.startsWith('data:image/') || src.startsWith('blob:')) return src
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return ''
  return src
}

/** Alleen echte hex-kleuren; via een bestand binnengekomen CSS zoals
 *  url(…) hoort nooit in een style-attribuut te belanden. */
function veiligThema(raw: unknown, basis: TimelineDoc['theme']): TimelineDoc['theme'] {
  const input = (raw ?? {}) as Record<string, unknown>
  const kleur = (waarde: unknown, terugval: string) =>
    typeof waarde === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(waarde.trim())
      ? waarde.trim()
      : terugval
  return {
    background: kleur(input.background, basis.background),
    text: kleur(input.text, basis.text),
    accent: kleur(input.accent, basis.accent),
  }
}

function normaliseDate(raw: unknown): PartialDate | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<PartialDate>
  if (typeof d.year !== 'number' || !Number.isFinite(d.year)) return null

  // De precisie in het bestand mag niet meer beloven dan de velden waarmaken:
  // 'minute' zonder uur wordt teruggebracht tot wat er wél staat.
  const heeftMaand = typeof d.month === 'number' && Number.isFinite(d.month)
  const heeftDag = heeftMaand && typeof d.day === 'number' && Number.isFinite(d.day)
  const heeftTijd = heeftDag && typeof d.hour === 'number' && Number.isFinite(d.hour)

  return buildDate(
    d.year,
    heeftMaand ? d.month : undefined,
    heeftDag ? d.day : undefined,
    heeftTijd ? d.hour : undefined,
    heeftTijd && typeof d.minute === 'number' ? d.minute : undefined,
  )
}

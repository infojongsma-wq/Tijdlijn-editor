import {
  DOC_VERSION,
  DEFAULT_ADJUST,
  type Annotation,
  type Card,
  type CardType,
  type PartialDate,
  type Settings,
  type TimelineDoc,
} from './types'
import { buildDate, sortKey } from './dates'
import { THEMA_DONKER } from './palette'
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
    quoteFrame: false,
    quoteFrameColor: '#F5F0E8',
    textPlacement: 'over',
    source: '',
  }
}

export function emptyDoc(name = 'Naamloze tijdlijn'): TimelineDoc {
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
  }
}

/** Kan dit kaarttype een beeld tonen? Alleen 'alleen tekst' niet. Het citaat
 *  gebruikt zijn beeld als achtergrond — dat hoorde hier dus ook bij, anders
 *  staat er een foto op de kaart die je nergens kunt bewerken. */
export function typeUsesMedia(type: CardType): boolean {
  return type !== 'text'
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

function normaliseCard(raw: unknown): Card {
  const basis = emptyCard()
  if (!raw || typeof raw !== 'object') return basis

  const input = raw as Partial<Card>
  const media = input.media
    ? {
        src: veiligeSrc(String(input.media.src ?? '')),
        mime: String(input.media.mime ?? 'image/jpeg'),
        width: Number(input.media.width) || 0,
        height: Number(input.media.height) || 0,
        alt: String(input.media.alt ?? ''),
        caption: String(input.media.caption ?? ''),
        credit: String(input.media.credit ?? ''),
        adjust: { ...DEFAULT_ADJUST, ...(input.media.adjust ?? {}) },
        annotations: normaliseAnnotations(input.media.annotations),
      }
    : null

  return {
    ...basis,
    ...input,
    id: input.id ?? basis.id,
    quoteFrame: input.quoteFrame === true,
    quoteFrameColor:
      typeof input.quoteFrameColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.quoteFrameColor)
        ? input.quoteFrameColor
        : basis.quoteFrameColor,
    date: normaliseDate(input.date) ?? basis.date,
    // Oudere bestanden bewaarden de tekst zonder opmaak; die wordt hier omgezet
    // zodat er niets verloren gaat en er niets ongefilterds binnenkomt.
    body: leesTekst(input.body),
    media,
  }
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
        // Alleen ingebedde afbeeldingen; een pad of webadres uit een bewerkt
        // bestand hoort hier niet doorheen te komen.
        icon: typeof a.icon === 'string' && a.icon.startsWith('data:image/') ? a.icon : null,
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

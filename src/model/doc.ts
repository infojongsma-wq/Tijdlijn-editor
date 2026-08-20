import {
  DOC_VERSION,
  DEFAULT_ADJUST,
  type Card,
  type CardType,
  type Settings,
  type Theme,
  type TimelineDoc,
} from './types'
import { buildDate, sortKey } from './dates'

/** RTV Oost-huisstijl als vertrekpunt. Alles hierin is aanpasbaar in de editor. */
export const OOST_THEME: Theme = {
  background: '#131720', // Oost Donkerblauw
  surface: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#B9C2D4',
  accent: '#1361FF', // Oost Blauw
  axisLine: '#3A4457',
  onAccent: '#FFFFFF',
}

export const OOST_THEME_LIGHT: Theme = {
  background: '#FFFFFF',
  surface: '#E7EEF9', // Oost Lichtblauw
  text: '#131720',
  textMuted: '#4A5468',
  accent: '#1361FF',
  axisLine: '#C8D5EC',
  onAccent: '#FFFFFF',
}

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
    textPlacement: 'over',
    source: '',
  }
}

export function emptyDoc(name = 'Naamloze tijdlijn'): TimelineDoc {
  return {
    version: DOC_VERSION,
    name,
    settings: { ...DEFAULT_SETTINGS },
    theme: { ...OOST_THEME },
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

/** Heeft dit kaarttype een beeld nodig om iets te laten zien? */
export function typeUsesMedia(type: CardType): boolean {
  return type === 'image-text' || type === 'image' || type === 'graphic' || type === 'title'
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
    theme: { ...basis.theme, ...(input.theme ?? {}) },
    cards,
  }
}

function normaliseCard(raw: unknown): Card {
  const basis = emptyCard()
  if (!raw || typeof raw !== 'object') return basis

  const input = raw as Partial<Card>
  const media = input.media
    ? {
        src: String(input.media.src ?? ''),
        mime: String(input.media.mime ?? 'image/jpeg'),
        width: Number(input.media.width) || 0,
        height: Number(input.media.height) || 0,
        alt: String(input.media.alt ?? ''),
        caption: String(input.media.caption ?? ''),
        credit: String(input.media.credit ?? ''),
        adjust: { ...DEFAULT_ADJUST, ...(input.media.adjust ?? {}) },
      }
    : null

  return {
    ...basis,
    ...input,
    id: input.id ?? basis.id,
    date: input.date ?? basis.date,
    media,
  }
}

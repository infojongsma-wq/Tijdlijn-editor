import { normaliseDoc } from './doc'
import type { TimelineDoc } from './types'

const AUTOSAVE_KEY = 'tijdlijn-editor:autosave'
const EXT = '.tijdlijn.json'

/**
 * Tussentijds bewaren, zodat een dichtgeklapte laptop niets kost.
 *
 * Foto's zitten als data:-URL in het document, dus dit kan tegen de grens van
 * localStorage (meestal 5 MB) aanlopen. Dat is geen ramp — het echte opslaan
 * gaat via een bestand — maar we moeten het wél netjes melden in plaats van
 * stilletjes te falen.
 */
export function autosave(doc: TimelineDoc): { ok: true } | { ok: false; reason: string } {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc))
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: verklaarOpslagfout(e) }
  }
}

/**
 * Er zijn twee heel verschillende redenen waarom tussentijds bewaren mislukt,
 * en ze vragen om ander advies. Ze op één hoop gooien leverde de verwarrende
 * melding "de tijdlijn is te groot" op bij een nog lege tijdlijn.
 */
function verklaarOpslagfout(e: unknown): string {
  const vol =
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')

  if (vol) {
    return (
      'Tussentijds bewaren lukt niet meer: de tijdlijn is te groot voor het ' +
      'geheugen van de browser. Sla op als bestand om je werk veilig te stellen.'
    )
  }

  // Een los HTML-bestand dat je met een dubbelklik opent, draait op file:// —
  // en daar houdt de browser de opslag dicht. Alles werkt gewoon, alleen het
  // automatisch bewaren niet.
  if (location.protocol === 'file:') {
    return (
      'Automatisch bewaren werkt niet als je dit bestand rechtstreeks van je ' +
      'schijf opent. Alles werkt verder normaal — sla tussendoor zelf op met ' +
      'Ctrl+S, dan raak je niets kwijt.'
    )
  }

  return (
    'Automatisch bewaren lukt niet in deze browser. Sla tussendoor zelf op ' +
    'met Ctrl+S.'
  )
}

export function loadAutosave(): TimelineDoc | null {
  try {
    const rauw = localStorage.getItem(AUTOSAVE_KEY)
    if (!rauw) return null
    return normaliseDoc(JSON.parse(rauw))
  } catch {
    return null
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    /* niets aan te doen, en niets ergs */
  }
}

/**
 * Minimale beschrijving van de opslagbrug die sommige omgevingen aanbieden.
 * We beschrijven alleen wat we gebruiken; een volledige typering hoort bij die
 * omgeving, niet bij deze app.
 */
interface OpslagBrug {
  use?: (naam: string) => Promise<{
    save: (verzoek: { filename: string; data: string }) => Promise<unknown>
  } | null>
}

export async function saveToFile(doc: TimelineDoc): Promise<void> {
  const inhoud = JSON.stringify(doc, null, 2)
  const naam = safeFileName(doc.name) + EXT

  // Draait de editor in een omgeving die downloads zelf afhandelt — zoals een
  // ingesloten voorvertoning — dan loopt het opslaan daarlangs. Een gewone
  // downloadlink doet daar namelijk niets, en dan lijkt de knop stuk.
  const brug = (globalThis as { claude?: OpslagBrug }).claude
  if (typeof brug?.use === 'function') {
    try {
      const downloads = await brug.use('downloads')
      if (downloads) {
        await downloads.save({ filename: naam, data: inhoud })
        return
      }
    } catch {
      // Geweigerd of niet beschikbaar: hieronder gewoon de normale weg.
      return
    }
  }

  const blob = new Blob([inhoud], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = naam
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Pas vrijgeven nadat de browser de download heeft opgepakt.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function openFromFile(file: File): Promise<TimelineDoc> {
  const tekst = await file.text()
  let rauw: unknown
  try {
    rauw = JSON.parse(tekst)
  } catch {
    throw new Error(`${file.name} is geen tijdlijnbestand.`)
  }
  return normaliseDoc(rauw)
}

export function safeFileName(name: string): string {
  const schoon = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return schoon || 'tijdlijn'
}

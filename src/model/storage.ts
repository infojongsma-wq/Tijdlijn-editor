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
  } catch {
    return {
      ok: false,
      reason:
        'Tussentijds bewaren lukt niet meer: de tijdlijn is te groot voor het ' +
        'geheugen van de browser. Sla op als bestand om je werk veilig te stellen.',
    }
  }
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

export function saveToFile(doc: TimelineDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFileName(doc.name) + EXT
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

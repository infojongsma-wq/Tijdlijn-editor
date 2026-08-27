import { normaliseDoc } from './doc'
import type { TimelineDoc } from './types'

/**
 * Het voorbeelddossier achter de knop *Voorbeeld*.
 *
 * Dit is een gewoon tijdlijnbestand — precies wat de knop *Opslaan* oplevert —
 * dat in `src/assets/voorbeeld.tijdlijn.json` staat. Het was eerst een lijst in
 * de code, met de foto's als losse imports; dan is het voorbeeld vervangen een
 * kwestie van programmeren. Nu is het één bestand omwisselen en opnieuw
 * bouwen. Zie "Het voorbeeld vervangen" in de README.
 *
 * Het bestand wordt pas opgehaald als iemand op de knop drukt. Het is ruim een
 * megabyte, en de meeste mensen openen de editor om aan hun eigen dossier te
 * werken.
 */
export async function demoDoc(): Promise<TimelineDoc> {
  const { default: rauw } = await import('../assets/voorbeeld.tijdlijn.json')
  // Door dezelfde controle als elk ander bestand: een voorbeeld dat niet meer
  // bij de huidige versie past, hoort te worden bijgewerkt en niet te breken.
  return normaliseDoc(rauw)
}

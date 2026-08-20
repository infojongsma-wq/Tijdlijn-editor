import { SECUNDAIR } from './palette'

/**
 * Opmaak in de lopende tekst: vet, cursief, dun, en losse woorden in een
 * huisstijlkleur.
 *
 * De tekst wordt als HTML bewaard, maar alleen in een streng afgebakende vorm.
 * Alles wat daarbuiten valt gaat eruit — bij het opslaan én bij het tonen. Zo
 * kan er niets binnenkomen via een geplakt stuk tekst uit Word of een
 * handmatig aangepast bestand.
 */

/** De kleuren waarin je een woord kunt uitlichten, op naam. */
export const KLEURNAMEN = SECUNDAIR.map((s) => s.naam.replace('Oost ', '').toLowerCase())

const KLEUR_HEX = new Map(
  SECUNDAIR.map((s) => [s.naam.replace('Oost ', '').toLowerCase(), s.hex]),
)

export function kleurHex(naam: string): string | null {
  return KLEUR_HEX.get(naam) ?? null
}

/** Klasse voor het dunne gewicht; de opmaak zit in de stijlbladen. */
export const LICHT_CLASS = 'tx-licht'

/**
 * Maakt van willekeurige HTML een veilige, kleine set: vet, cursief, dun,
 * kleuraccent en regeleinden. De rest wordt platgeslagen tot tekst.
 */
export function sanitizeRich(html: string): string {
  if (typeof document === 'undefined') return ''
  const bron = document.createElement('div')
  bron.innerHTML = html
  const doel = document.createElement('div')
  kopieer(bron, doel)
  return doel.innerHTML
}

function kopieer(van: Node, naar: HTMLElement): void {
  van.childNodes.forEach((kind) => {
    if (kind.nodeType === Node.TEXT_NODE) {
      naar.appendChild(document.createTextNode(kind.textContent ?? ''))
      return
    }
    if (kind.nodeType !== Node.ELEMENT_NODE) return

    const el = kind as HTMLElement
    const tag = el.tagName.toLowerCase()

    // Blokelementen uit geplakte tekst worden een regeleinde plus hun inhoud.
    if (tag === 'br') {
      naar.appendChild(document.createElement('br'))
      return
    }
    if (tag === 'div' || tag === 'p') {
      if (naar.childNodes.length > 0) naar.appendChild(document.createElement('br'))
      kopieer(el, naar)
      return
    }

    const nieuw = vertaal(tag, el)
    if (!nieuw) {
      // Onbekend element: inhoud behouden, omhulsel weg.
      kopieer(el, naar)
      return
    }
    kopieer(el, nieuw)
    // Leeg geworden opmaak heeft geen zin en maakt de tekst alleen rommelig.
    if (nieuw.textContent) naar.appendChild(nieuw)
  })
}

function vertaal(tag: string, el: HTMLElement): HTMLElement | null {
  if (tag === 'strong' || tag === 'b') return document.createElement('strong')
  if (tag === 'em' || tag === 'i') return document.createElement('em')

  if (tag === 'span') {
    if (el.classList.contains(LICHT_CLASS)) {
      const span = document.createElement('span')
      span.className = LICHT_CLASS
      return span
    }
    const kleur = el.getAttribute('data-kleur')
    if (kleur && KLEUR_HEX.has(kleur)) {
      const span = document.createElement('span')
      span.setAttribute('data-kleur', kleur)
      return span
    }
  }
  return null
}

/** Platte tekst uit opgemaakte tekst — voor lengtes en samenvattingen. */
export function platteTekst(html: string): string {
  if (typeof document === 'undefined') return html
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

/** Zet platte tekst om in veilige HTML. Gebruikt bij het inlezen van oudere
 *  bestanden, waarin de tekst nog zonder opmaak was opgeslagen. */
export function tekstNaarHtml(tekst: string): string {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

/** Bevat deze waarde al opmaak, of is het nog platte tekst? */
export function isHtml(waarde: string): boolean {
  return /<(br|strong|em|span|b|i|p|div)\b/i.test(waarde)
}

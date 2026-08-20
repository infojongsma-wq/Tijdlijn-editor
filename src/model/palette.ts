import type { Theme } from './types'

/**
 * Het kleurenpalet van RTV Oost.
 *
 * De editor biedt geen vrije kleurkiezer maar deze staalkaart. Dat is een
 * bewuste beperking: een tijdlijn hoort herkenbaar van Oost te zijn, en met een
 * volledig palet kiest iedereen net iets anders blauw.
 */

export interface Swatch {
  naam: string
  hex: string
}

/** Primair. */
export const OOST_BLAUW = '#1361FF'
export const OOST_DONKERBLAUW = '#131720'
export const OOST_LICHTBLAUW = '#E7EEF9'
export const OOST_WIT = '#FFFFFF'
export const OOST_CREME = '#F5F0E8'

/** Secundair, in de volgorde van de huisstijl. */
export const SECUNDAIR: Swatch[] = [
  { naam: 'Oost Blauw', hex: OOST_BLAUW },
  { naam: 'Oost Paars', hex: '#8F00FF' },
  { naam: 'Oost Rood', hex: '#FF4242' },
  { naam: 'Oost Oranje', hex: '#FF6813' },
  { naam: 'Oost Geel', hex: '#FFAF16' },
  { naam: 'Oost Groen', hex: '#ABBF3D' },
]

/**
 * Achtergronden. Naast de merkkleuren twee nuances: een diepere variant van het
 * donkerblauw voor als beeld over de volle breedte moet ademen, en het crème uit
 * de huisstijl.
 */
export const ACHTERGRONDEN: Swatch[] = [
  { naam: 'Donkerblauw', hex: OOST_DONKERBLAUW },
  { naam: 'Diep donkerblauw', hex: '#0B0E14' },
  { naam: 'Oost Blauw', hex: OOST_BLAUW },
  { naam: 'Wit', hex: OOST_WIT },
  { naam: 'Lichtblauw', hex: OOST_LICHTBLAUW },
  { naam: 'Crème', hex: OOST_CREME },
  { naam: 'Zacht paars', hex: '#F3E6FF' },
  { naam: 'Zacht rood', hex: '#FFECEC' },
  { naam: 'Zacht oranje', hex: '#FFF0E7' },
  { naam: 'Zacht geel', hex: '#FFF7E7' },
  { naam: 'Zacht groen', hex: '#F5F7EC' },
]

/** De 10%-tinten uit de huisstijl — de nuances. */
export const TINTEN: Swatch[] = [
  { naam: 'Zacht blauw', hex: '#E7EEF9' },
  { naam: 'Zacht paars', hex: '#F3E6FF' },
  { naam: 'Zacht rood', hex: '#FFECEC' },
  { naam: 'Zacht oranje', hex: '#FFF0E7' },
  { naam: 'Zacht geel', hex: '#FFF7E7' },
  { naam: 'Zacht groen', hex: '#F5F7EC' },
]

/**
 * De kleuren waarin je in de lopende tekst een woord kunt zetten: wit en
 * donkerblauw om terug te keren naar 'gewoon', de zes merkkleuren om uit te
 * lichten, en de zes tinten als nuance.
 */
export interface RichKleur {
  key: string
  naam: string
  hex: string
}

export const RICH_KLEUREN: RichKleur[] = [
  { key: 'wit', naam: 'Wit', hex: OOST_WIT },
  { key: 'donker', naam: 'Donkerblauw', hex: OOST_DONKERBLAUW },
  ...SECUNDAIR.map((s) => ({
    key: s.naam.replace('Oost ', '').toLowerCase(),
    naam: s.naam,
    hex: s.hex,
  })),
  ...TINTEN.map((t) => ({
    key: 'zacht' + t.naam.replace('Zacht ', '').toLowerCase(),
    naam: t.naam,
    hex: t.hex,
  })),
]

export const TEKSTKLEUREN: Swatch[] = [
  { naam: 'Wit', hex: OOST_WIT },
  { naam: 'Donkerblauw', hex: OOST_DONKERBLAUW },
]

/** Kleuren waarmee je in de tekst een woord kunt uitlichten. */
export const TEKSTACCENTEN: Swatch[] = SECUNDAIR

export const THEMA_DONKER: Theme = {
  background: OOST_DONKERBLAUW,
  text: OOST_WIT,
  accent: OOST_BLAUW,
}

export const THEMA_LICHT: Theme = {
  background: OOST_WIT,
  text: OOST_DONKERBLAUW,
  accent: OOST_BLAUW,
}

export const THEMA_BLAUW: Theme = {
  background: OOST_BLAUW,
  text: OOST_WIT,
  // Geel op blauw is het kenmerkende Oost-contrast uit de grafiekstijl.
  accent: '#FFAF16',
}

export const PRESETS: { naam: string; thema: Theme }[] = [
  { naam: 'Oost donker', thema: THEMA_DONKER },
  { naam: 'Oost licht', thema: THEMA_LICHT },
  { naam: 'Oost blauw', thema: THEMA_BLAUW },
]

export interface RGB {
  r: number
  g: number
  b: number
}

export function hexNaarRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexNaarRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Mengt twee kleuren; `deel` is hoeveel van `a` erin zit. */
export function meng(a: string, b: string, deel: number): string {
  const x = hexNaarRgb(a)
  const y = hexNaarRgb(b)
  const k = Math.min(1, Math.max(0, deel))
  const kanaal = (p: number, q: number) => Math.round(p * k + q * (1 - k))
  return `rgb(${kanaal(x.r, y.r)}, ${kanaal(x.g, y.g)}, ${kanaal(x.b, y.b)})`
}

/**
 * De kleuren die uit het thema volgen. Zachte tekst en de lijn van de as zijn
 * mengsels van tekst en achtergrond, zodat ze altijd bij elkaar passen en er
 * geen onleesbare combinatie te kiezen valt.
 */
export interface AfgeleideKleuren {
  textMuted: string
  axisLine: string
  onAccent: string
}

export function afgeleid(thema: Theme): AfgeleideKleuren {
  return {
    textMuted: meng(thema.text, thema.background, 0.68),
    axisLine: meng(thema.text, thema.background, 0.26),
    // Wit op een gekleurd vlak, behalve als dat vlak zelf licht is.
    onAccent: isLicht(thema.accent) ? OOST_DONKERBLAUW : OOST_WIT,
  }
}

export function isLicht(hex: string): boolean {
  const { r, g, b } = hexNaarRgb(hex)
  // Snelle helderheidsmaat; goed genoeg om wit of donkerblauw te kiezen.
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

/** De tekstkleur die het beste op deze achtergrond leest. */
export function tekstVoor(achtergrond: string): string {
  return isLicht(achtergrond) ? OOST_DONKERBLAUW : OOST_WIT
}

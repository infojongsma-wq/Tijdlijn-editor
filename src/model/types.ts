/**
 * Het tijdlijndocument.
 *
 * Eén document, meerdere weergaven. De vormgeving zit niet in de kaarten maar in
 * `settings` en `theme`, zodat je van vorm kunt wisselen zonder inhoud aan te raken.
 */

export const DOC_VERSION = 1

/** Hoe nauwkeurig een datum is ingevuld. Bepaalt zowel sortering als weergave. */
export type DatePrecision = 'year' | 'month' | 'day' | 'minute'

export interface PartialDate {
  year: number
  /** 1-12, alleen bij precisie 'month' en fijner */
  month?: number
  /** 1-31, alleen bij precisie 'day' en fijner */
  day?: number
  /** 0-23, alleen bij precisie 'minute' */
  hour?: number
  /** 0-59, alleen bij precisie 'minute' */
  minute?: number
  precision: DatePrecision
}

export type CardType =
  /** De opening. Andere opmaak, geen punt op de as. */
  | 'title'
  /** Beeld over de volle breedte met tekst erover of eronder. */
  | 'image-text'
  /** Alleen beeld, hooguit een bijschrift. Geeft lucht tussen zware kaarten. */
  | 'image'
  /** Alleen tekst, voor feiten zonder beeld. */
  | 'text'
  /** Uitgelicht citaat, met naam en functie. */
  | 'quote'
  /** Grafiek of kaart: wordt volledig getoond, nooit bijgesneden. */
  | 'graphic'

/** Waar de tekst staat ten opzichte van het beeld. Alleen voor 'image-text'. */
export type TextPlacement = 'over' | 'below' | 'beside'

export interface MediaAdjust {
  /** Brandpunt als fractie (0-1) van de afbeelding. Bepaalt wat er in beeld blijft
   *  bij bijsnijden — daarom in fracties en niet in pixels, zodat het op elk
   *  schermformaat klopt. */
  focalX: number
  focalY: number
  /** 1 = passend, hoger = ingezoomd. */
  zoom: number
  /** 0-1 */
  opacity: number
  /** Procenten, 100 = ongewijzigd. */
  brightness: number
  contrast: number
  saturation: number
}

export const DEFAULT_ADJUST: MediaAdjust = {
  focalX: 0.5,
  focalY: 0.5,
  zoom: 1,
  opacity: 1,
  brightness: 100,
  contrast: 100,
  saturation: 100,
}

export interface Media {
  /** data:-URL. Afbeeldingen zitten in het document zelf; er is geen beeldbank. */
  src: string
  /** Oorspronkelijk bestandstype, bepaalt of we mochten verkleinen. */
  mime: string
  width: number
  height: number
  /** Verplicht voor toegankelijkheid; de editor dringt hierop aan. */
  alt: string
  caption: string
  /** Apart veld — in de bron zitten bijschrift en rechten aan elkaar geplakt. */
  credit: string
  adjust: MediaAdjust
}

export interface Card {
  id: string
  type: CardType
  date: PartialDate
  title: string
  /** Platte tekst in deze fase; opmaak met kleuraccenten komt later. */
  body: string
  media: Media | null
  /** Alleen bij type 'quote'. */
  quoteAttribution: string
  /** Ondertitel, alleen bij de titelkaart. */
  subtitle: string
  textPlacement: TextPlacement
  /** Herkomst van dit moment. Journalistiek onmisbaar, ook als het niet getoond wordt. */
  source: string
}

export type TimelineForm =
  | 'vertical'
  | 'filmstrip'
  | 'duo'
  | 'magazine'
  | 'headlines'
  | 'horizontal'

export type AxisPosition = 'left' | 'right' | 'top' | 'bottom' | 'hidden'

export type SortDirection = 'asc' | 'desc'

export interface Theme {
  background: string
  surface: string
  text: string
  textMuted: string
  accent: string
  axisLine: string
  /** Tekst op een gekleurd vlak (knoppen, tags). */
  onAccent: string
}

export interface Settings {
  form: TimelineForm
  axis: AxisPosition
  direction: SortDirection
  /** Voortgangsbalk onder/naast de as. */
  showProgress: boolean
  /** "3 / 21" teller. */
  showCounter: boolean
  /** De duw-overgang bij verticaal scrollen. Gaat sowieso uit bij
   *  prefers-reduced-motion. */
  pushTransition: boolean
}

export interface TimelineDoc {
  version: number
  /** Naam van het dossier, gebruikt als bestandsnaam en in de titelkaart. */
  name: string
  settings: Settings
  theme: Theme
  cards: Card[]
}

/** Een opgeslagen combinatie van vorm en kleuren, zonder inhoud. */
export interface Template {
  id: string
  name: string
  settings: Settings
  theme: Theme
}

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

/**
 * Een aanwijzer op een afbeelding: een punt met een tekstballon eraan, verbonden
 * door een lijntje.
 *
 * Het ankerpunt staat in fracties van de afbeelding, niet in pixels. Daardoor
 * blijft de aanwijzer op de juiste plek als de foto op een telefoon veel kleiner
 * wordt getoond, en ook als je later inzoomt of de uitsnede verschuift.
 *
 * Ditzelfde mechanisme dient straks voor de interactieve kaart van Overijssel en
 * voor aanwijzers op een grafiek: één punt, met inhoud eraan gekoppeld.
 */
export interface Annotation {
  id: string
  /** Het anker: waar de lijn naar wijst. 0-1, fractie van links. */
  x: number
  /** 0-1, fractie van boven. */
  y: number
  /** De ballon: waar de tekst staat. Vrij te verslepen, los van het anker. */
  bx: number
  by: number
  text: string
  /** Meteen zichtbaar, of pas bij aanwijzen en aantikken. */
  reveal: 'always' | 'hover'
  /** Punt en verbindingslijn tonen. Uit = een los tekstblok op het beeld. */
  line: boolean
  /** Eigen picto (data-URL) in plaats van de standaardstip. */
  icon: string | null
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
  /** Tekstballonnen met een verbindingslijn naar een punt in de foto. */
  annotations: Annotation[]
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
  /** Citaat: tekst in een gekleurd kader, zodat de foto vol in kleur blijft.
   *  Uit = de foto wordt gedimd om de tekst leesbaar te houden. */
  quoteFrame: boolean
  quoteFrameColor: string
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

/**
 * De kleuren van een tijdlijn.
 *
 * Bewust klein gehouden: achtergrond, tekst en accent kies je, de rest wordt
 * daaruit berekend. Een zachte tekstkleur die je los kunt instellen levert
 * vooral onleesbare combinaties op, en de as hoort sowieso bij de achtergrond
 * te passen.
 */
export interface Theme {
  background: string
  text: string
  accent: string
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

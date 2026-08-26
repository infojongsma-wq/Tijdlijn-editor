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
  /** Grafiek of kaart: standaard volledig getoond, nooit bijgesneden. */
  | 'graphic'
  /** Twee beelden naast elkaar, of één beeld met twee tekstblokken —
   *  om iets te vergelijken: voor en na, hier en daar, toen en nu. */
  | 'compare'

/** Waar de tekst staat ten opzichte van het beeld. Alleen voor 'image-text'. */
export type TextPlacement = 'over' | 'below' | 'beside'

/**
 * Hoe een citaat op zijn foto staat.
 *
 * - `over`   — de foto wordt gedimd en het citaat staat er los overheen.
 * - `kader`  — de foto blijft vol in kleur, het citaat krijgt een eigen vlak
 *              dat je over de foto kunt verschuiven zodat het onderwerp vrij
 *              blijft.
 * - `naast`  — citaat en foto staan elk in een eigen kader naast (of boven,
 *              of onder) elkaar, op een gekleurd vlak. De foto wordt dan niet
 *              als achtergrond gebruikt maar als zelfstandig beeld.
 */
export type QuoteStyle = 'over' | 'kader' | 'naast'

/** Waar het fotokader staat ten opzichte van het citaatkader, bij 'naast'. */
export type QuoteSide = 'links' | 'rechts' | 'boven' | 'onder'

/** De verdeling op een vergelijkkaart. */
export type CompareLayout =
  /** Twee beelden, één gezamenlijk tekstblok eronder. */
  | 'twee-beeld-een-tekst'
  /** Twee beelden, elk met een eigen tekstblok. */
  | 'twee-beeld-twee-tekst'
  /** Eén beeld, twee tekstblokken ernaast. */
  | 'een-beeld-twee-tekst'

/** Hoe een grafiek de kaart vult. */
export type GraphicFit =
  /** In een gekleurd kader, met ruimte eromheen. */
  | 'kader'
  /** Over de volle kaart, tot aan de randen. */
  | 'vullend'

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
  /** Eigen kleuren; null betekent: volg het thema van de tijdlijn. */
  dotColor: string | null
  textColor: string | null
  balloonColor: string | null
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
  /** Hoe het citaat gepresenteerd wordt. Zie QuoteStyle. */
  quoteStyle: QuoteStyle
  /** De vulkleur van het citaatkader, bij 'kader' en 'naast'. */
  quoteFrameColor: string
  /** Plek van het citaatkader bij 'kader', als fractie van het vrije vlak:
   *  0 is tegen de linker- of bovenrand, 1 tegen de rechter- of onderrand,
   *  0,5 is midden. Zo blijft het kader altijd binnen de kaart, ongeacht
   *  schermformaat. */
  quoteBoxX: number
  quoteBoxY: number
  /** Bij 'naast': aan welke kant van het citaat het fotokader staat. */
  quoteSide: QuoteSide
  /** Bij 'naast': de kleur van het vlak waarop beide kaders liggen. */
  quoteBackdrop: string
  /** Een dunne lijn om de kaders. */
  quoteBorder: boolean
  /** De kleur van die lijn; null = volg de tekstkleur, gedempt. */
  quoteBorderColor: string | null
  textPlacement: TextPlacement
  /** Herkomst van dit moment. Journalistiek onmisbaar, ook als het niet getoond wordt. */
  source: string

  /** Het label op de titelkaart. Standaard 'Dossier', maar vrij in te vullen. */
  badge: string

  /** Vormgeving van déze kaart. null = volg het thema van de tijdlijn; een
   *  eigen kleur is voor de kaart waar de foto erom vraagt. */
  headingColor: string | null
  bodyColor: string | null

  /** Alleen bij type 'compare'. */
  compareLayout: CompareLayout
  /** Het tweede beeld en de tweede tekst van een vergelijkkaart. */
  media2: Media | null
  body2: string

  /** Alleen bij type 'graphic'. */
  graphicFit: GraphicFit
  graphicFrameColor: string
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

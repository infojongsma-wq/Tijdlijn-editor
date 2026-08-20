import { DEFAULT_ADJUST, type Media } from './types'

/** Boven deze lengte wordt de langste zijde teruggebracht. Komt overeen met de
 *  1920×1080 waarop het fotoarchief van RTV Oost werkt. */
export const MAX_EDGE = 1920

/** Vanaf hier waarschuwen: het uitpakken van zo'n foto kost veel geheugen. */
export const WARN_MEGAPIXELS = 25
export const WARN_BYTES = 15 * 1024 * 1024

/** Bestandstypen die we nooit opnieuw coderen. */
const PASS_THROUGH = new Set(['image/svg+xml', 'image/gif'])

export const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

export interface ImageWarning {
  level: 'warn' | 'info'
  text: string
}

export interface ImportResult {
  media: Media
  warnings: ImageWarning[]
}

/** Vooraf, zodat de gebruiker kan besluiten vóór het wachten begint. */
export function inspectFile(file: File): ImageWarning[] {
  const waarschuwingen: ImageWarning[] = []
  if (file.size > WARN_BYTES) {
    waarschuwingen.push({
      level: 'warn',
      text: `Dit bestand is ${formatBytes(file.size)}. Dat kan even duren en maakt het werken trager.`,
    })
  }
  return waarschuwingen
}

export async function importImage(file: File): Promise<ImportResult> {
  const warnings = inspectFile(file)

  if (PASS_THROUGH.has(file.type)) {
    const src = await readAsDataUrl(file)
    const afmeting = await measure(src).catch(() => ({ width: 0, height: 0 }))
    if (file.type === 'image/gif') {
      warnings.push({
        level: 'info',
        text: 'Bewegende GIF blijft zoals hij is — verkleinen zou de animatie kapotmaken.',
      })
    }
    return {
      media: makeMedia(src, file.type, afmeting.width, afmeting.height),
      warnings,
    }
  }

  const bron = await readAsDataUrl(file)
  const bitmap = await loadBitmap(bron)
  const megapixels = (bitmap.width * bitmap.height) / 1_000_000


  if (megapixels > WARN_MEGAPIXELS) {
    warnings.push({
      level: 'warn',
      text:
        `Deze foto is ${bitmap.width}×${bitmap.height}. Hij wordt verkleind naar ` +
        `${MAX_EDGE} pixels, maar dat kan even duren. Een kleinere versie werkt sneller.`,
    })
  }

  // Vastleggen vóórdat de bitmap wordt gesloten: close() zet breedte en hoogte
  // op nul, en dan meldt de editor "verkleind van 0×0".
  const bronBreedte = bitmap.width
  const bronHoogte = bitmap.height
  const langsteZijde = Math.max(bronBreedte, bronHoogte)

  // Al klein genoeg? Dan de oorspronkelijke bytes houden. Opnieuw coderen zou
  // alleen maar kwaliteit kosten zonder iets op te leveren.
  if (langsteZijde <= MAX_EDGE) {
    close(bitmap)
    return {
      media: makeMedia(bron, file.type, bronBreedte, bronHoogte),
      warnings,
    }
  }

  const schaal = MAX_EDGE / langsteZijde
  const breedte = Math.round(bronBreedte * schaal)
  const hoogte = Math.round(bronHoogte * schaal)

  const canvas = document.createElement('canvas')
  canvas.width = breedte
  canvas.height = hoogte
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('De browser kan deze foto niet verwerken.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, breedte, hoogte)
  close(bitmap)

  // PNG met doorzichtigheid blijft PNG; de rest wordt JPEG.
  const doelType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const verkleind = canvas.toDataURL(doelType, 0.85)

  warnings.push({
    level: 'info',
    text: `Verkleind van ${bronBreedte}×${bronHoogte} naar ${breedte}×${hoogte}.`,
  })

  return { media: makeMedia(verkleind, doelType, breedte, hoogte), warnings }
}

function makeMedia(src: string, mime: string, width: number, height: number): Media {
  return {
    src,
    mime,
    width,
    height,
    alt: '',
    caption: '',
    credit: '',
    adjust: { ...DEFAULT_ADJUST },
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`${file.name} kon niet gelezen worden.`))
    reader.readAsDataURL(file)
  })
}

async function loadBitmap(src: string): Promise<ImageBitmap | HTMLImageElement> {
  const img = await measureElement(src)
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(img)
    } catch {
      // Sommige browsers weigeren bitmaps van bepaalde bronnen; het img-element
      // werkt dan alsnog als tekenbron.
      return img
    }
  }
  return img
}

function measureElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Dit bestand is geen bruikbare afbeelding.'))
    img.src = src
  })
}

async function measure(src: string): Promise<{ width: number; height: number }> {
  const img = await measureElement(src)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

function close(bitmap: ImageBitmap | HTMLImageElement): void {
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Ruwe schatting van het gewicht van een data:-URL, voor de bestandsmeter.
 * Verwijst het beeld naar een gewoon adres — zoals in het voorbeelddossier —
 * dan weten we het gewicht niet en geven we 0 terug, zodat de editor er niets
 * over beweert in plaats van "0 B" te tonen.
 */
export function dataUrlBytes(src: string): number {
  if (!src.startsWith('data:')) return 0
  const komma = src.indexOf(',')
  if (komma < 0) return 0
  return Math.round((src.length - komma - 1) * 0.75)
}

import { bewaarBestand, safeFileName } from './storage'
import type { Media, TimelineDoc } from './types'

/** De plek in de kijk-pagina waar het document terechtkomt. */
const MERKTEKEN = '"__TIJDLIJN_DOCUMENT__"'

/**
 * Maakt van een tijdlijn één HTML-bestand dat los op een webserver kan staan.
 *
 * Het sjabloon is de gebouwde kijk-pagina: speler, opmaak en de Roobert-fonts,
 * alles in dat ene bestand. Hier komt alleen het document er nog bij. Zo is
 * één bestand één tijdlijn — geen JSON ernaast die kan zoekraken, geen server
 * die aan moet blijven staan, en over drie jaar werkt hij nog.
 */
export async function exportEmbed(doc: TimelineDoc): Promise<void> {
  // Pas ophalen bij het exporteren. Het sjabloon is een halve megabyte; die
  // hoeft niet mee te komen elke keer dat iemand de editor opent.
  const { default: sjabloon } = await import('virtual:kijkpagina')

  if (!sjabloon || !sjabloon.includes(MERKTEKEN)) {
    throw new Error(
      'De kijk-pagina ontbreekt in deze versie van de editor. ' +
        'Bouw hem met "npm run build:viewer" en laad de editor opnieuw.',
    )
  }

  const compleet = await metIngeslotenBeeld(doc)
  // Een vervangfunctie, geen tekst: in een tekst zou $& of $1 in het document
  // als verwijzing worden gelezen en zou de tijdlijn stilletjes veranderen.
  const html = sjabloon.replace(MERKTEKEN, () => alsScriptInhoud(compleet))
  await bewaarBestand(safeFileName(doc.name) + '.html', html, 'text/html')
}

/**
 * Zet elk beeld dat nog een verwijzing is om naar het bestand zelf.
 *
 * Foto's die de redacteur plakt of uploadt staan al als `data:`-URL in het
 * document. Maar het voorbeelddossier verwijst naar bestanden die bij de editor
 * horen, en dat zijn adressen die op een vreemde webserver nergens op slaan.
 * Zonder deze stap exporteer je een tijdlijn met zeven kapotte plaatjes en zie
 * je dat pas als hij online staat.
 */
async function metIngeslotenBeeld(doc: TimelineDoc): Promise<TimelineDoc> {
  // Dezelfde foto kan op meerdere kaarten staan; één keer ophalen is genoeg.
  const opgehaald = new Map<string, string>()

  const insluiten = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src
    const bekend = opgehaald.get(src)
    if (bekend) return bekend
    const data = await naarDataUrl(src)
    opgehaald.set(src, data)
    return data
  }

  const beeld = async (media: Media | null): Promise<Media | null> => {
    if (!media) return null
    return {
      ...media,
      src: await insluiten(media.src),
      annotations: await Promise.all(
        media.annotations.map(async (a) => ({
          ...a,
          icon: a.icon ? await insluiten(a.icon) : null,
        })),
      ),
    }
  }

  const cards = await Promise.all(
    doc.cards.map(async (kaart) => ({
      ...kaart,
      media: await beeld(kaart.media),
      media2: await beeld(kaart.media2),
    })),
  )
  return { ...doc, cards }
}

async function naarDataUrl(src: string): Promise<string> {
  let blob: Blob
  try {
    const antwoord = await fetch(src)
    if (!antwoord.ok) throw new Error(String(antwoord.status))
    blob = await antwoord.blob()
  } catch {
    throw new Error(
      'Een van de foto\'s kon niet in het bestand worden opgenomen. ' +
        'Vervang hem in de editor en probeer het opnieuw.',
    )
  }
  return new Promise((klaar, mis) => {
    const lezer = new FileReader()
    lezer.onload = () => klaar(String(lezer.result))
    lezer.onerror = () => mis(new Error('Een van de foto\'s kon niet gelezen worden.'))
    lezer.readAsDataURL(blob)
  })
}

/**
 * Het document als JSON, veilig om binnen een script-blok te zetten.
 *
 * De browser leest zo'n blok als ruwe tekst tot hij `</script` tegenkomt. Staat
 * dat toevallig in een bijschrift of een alt-tekst, dan valt de pagina daar in
 * tweeën. Elke `<` als `\\u003c` schrijven voorkomt dat; JSON.parse maakt er
 * daarna weer gewoon een `<` van.
 */
function alsScriptInhoud(doc: TimelineDoc): string {
  return JSON.stringify(doc).replace(/</g, '\\u003c')
}

/** Het iframe waarmee de redactie de tijdlijn op de site zet. */
export function embedCode(doc: TimelineDoc, url = ''): string {
  const bestand = safeFileName(doc.name) + '.html'
  const titel = (doc.name || 'Tijdlijn').replace(/"/g, '&quot;')
  return [
    '<iframe',
    `  src="${url || 'https://VUL-HIER-HET-ADRES-IN/' + bestand}"`,
    `  title="Tijdlijn: ${titel}"`,
    '  loading="lazy"',
    '  style="width:100%; aspect-ratio:16/9; min-height:520px; border:0;"',
    '></iframe>',
  ].join('\n')
}

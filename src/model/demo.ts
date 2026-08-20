import { DEFAULT_ADJUST, type Card, type TimelineDoc } from './types'
import { buildDate } from './dates'
import { emptyDoc, newId } from './doc'

import begrip from '../assets/demo/wolf-begrip.jpg'
import enter from '../assets/demo/wolf-enter.jpg'
import wolvenplan from '../assets/demo/wolf-wolvenplan.jpg'
import beschermd from '../assets/demo/wolf-beschermd.jpg'
import afschieten from '../assets/demo/wolf-afschieten.jpg'
import incidenten from '../assets/demo/wolf-incidenten.jpg'
import sam from '../assets/demo/wolf-sam.jpg'
import aanvallen from '../assets/demo/aanvallen-2025.svg'

/**
 * Het wolvendossier als voorbeeld.
 *
 * Dit is testmateriaal, geen inhoud die met de app meegeleverd hoort te worden:
 * het bestaat om de editor te vullen met koppen van echte lengte, datums die op
 * dezelfde dag vallen en foto's met echte rechtenvermeldingen. Wie een eigen
 * tijdlijn begint, gooit dit weg.
 */

interface Bron {
  type: Card['type']
  date: [number, number, number, number?, number?]
  title: string
  body: string
  image?: string
  alt?: string
  caption?: string
  credit?: string
  quoteAttribution?: string
  subtitle?: string
  textPlacement?: Card['textPlacement']
  source?: string
}

const BRONNEN: Bron[] = [
  {
    type: 'title',
    date: [2025, 3, 13],
    title: 'De wolf in Overijssel',
    subtitle:
      'In drie maanden tijd verschoof de discussie van begrip naar afschot. Een dossier in zeven momenten.',
    body: '',
    image: incidenten,
    alt: 'Een wolf staat op een open plek in een bos en kijkt in de camera.',
    credit: 'Getty Images',
    source: 'Samenstelling redactie',
  },
  {
    type: 'image-text',
    date: [2025, 3, 13, 10, 27],
    title: `Roep om wederzijds begrip in 'wolf-discussie': "Luister zonder te polariseren"`,
    body:
      '"Eigenlijk kunnen we nu niets, misschien alleen als het te laat is. Er is geen sprake meer ' +
      'van incidenten als we de cijfers zien over wolvenaanvallen. Zorg snel voor duidelijk beleid." ' +
      'Die oproep doet Rob Bats, burgemeester van de gemeente Steenwijkerland. In een betoog vraagt ' +
      'hij om duidelijke regels rondom de wolf.',
    image: begrip,
    alt: 'Een wolf staat in het hoge gras aan de rand van een bos en kijkt in de camera.',
    credit: 'RTV Oost',
    textPlacement: 'over',
    source: 'RTV Oost, Chantal Everaardt',
  },
  {
    type: 'image-text',
    date: [2025, 3, 13, 17, 0],
    title: 'Afgeschoten, doodgereden of gevlogen? Waar is de Enterse wolf gebleven?',
    body:
      'Over de Sportlaan in Enter hangt deze ochtend een deken van rust. Een dag eerder was dat wel ' +
      'anders toen een wolf door het Twentse klompendorp zwierf. Foto’s en video’s van het dier ' +
      'verschenen in rap tempo op sociale media, maar na een uurtje verdween ieder spoor van de wolf. ' +
      'En nu wordt er volop gespeculeerd in het dorp.',
    image: enter,
    alt: 'Berm langs de N347 met een hectometerpaal, met daarin een uitsnede van een wolf die door een weiland loopt.',
    caption:
      'De wolf die woensdagochtend in Enter opdook zou zijn doodgereden op de N347, maar dat lijkt een dag later niet waarschijnlijk.',
    credit: 'Oost / Ingestuurd',
    textPlacement: 'below',
    source: 'RTV Oost',
  },
  {
    type: 'image-text',
    date: [2025, 3, 28, 7, 0],
    title: 'Provincies presenteren nieuw gezamenlijk wolvenplan',
    body:
      'De Nederlandse provincies zijn het eens over een gezamenlijk wolvenplan. Dat meldt het ' +
      'Interprovinciaal Overleg (IPO) vandaag. In het plan zijn gezamenlijke richtlijnen afgesproken ' +
      'over hoe om te gaan met incidenten tussen mensen, honden, vee en wolven. Het plan moet zorgen ' +
      'voor meer duidelijkheid over schadevergoedingen en preventiemaatregelen, zoals het plaatsen ' +
      'van wolfwerende rasters.',
    image: wolvenplan,
    alt: 'Een wolf staat tussen varens in een zonnig bos.',
    caption: 'Wolf gesignaleerd in Borne.',
    credit: 'Pixabay',
    textPlacement: 'over',
    source: 'RTV Oost',
  },
  {
    type: 'quote',
    date: [2025, 5, 7, 20, 2],
    title:
      'Wolf van ‘strikt beschermd’ naar ‘beschermd’: "Maar ook dan mag je niet zomaar afschieten"',
    body:
      'Ook als de beschermingsstatus omlaaggaat, blijft de wolf een beschermde diersoort. Afschot ' +
      'blijft gebonden aan strenge voorwaarden en aan een aantoonbaar probleem.',
    quoteAttribution: 'Daniel Tuitert, jurist en wolvenvrijwilliger uit Zwolle',
    image: beschermd,
    alt: 'Een wolf loopt langs een omheining.',
    credit: 'Getty Images',
    source: 'RTV Oost',
  },
  {
    type: 'image-text',
    date: [2025, 5, 8, 12, 30],
    title: 'Versoepelde regels voor afschieten wolven: “Niet wachten tot het misgaat”',
    body:
      'Gedeputeerde van Overijssel Maurits von Martels is blij met het besluit om de regels rond de ' +
      'beschermingsstatus van de wolf te versoepelen. Hij vindt het noodzakelijk dat provincies meer ' +
      'ruimte krijgen om op te treden bij risico’s of schade. “Anders is het wachten op verdere ' +
      'problemen, en die wil je echt niet”, waarschuwt hij.',
    image: afschieten,
    alt: 'Een wolf loopt over een zandpad in een bos.',
    caption:
      'Het Europees Parlement stemt vandaag over het aanpassen van de beschermingsstatus van de wolf: van strikt beschermd naar beschermd.',
    credit: 'iStock / Getty Images Plus',
    textPlacement: 'below',
    source: 'RTV Oost',
  },
  {
    type: 'graphic',
    date: [2025, 5, 26, 11, 33],
    title: 'Wolven slaan vaker toe in 2025: Overijssel kent relatief weinig incidenten',
    body:
      'Het aantal aanvallen van wolven op schapen en ander vee was nog nooit zo hoog. In de eerste ' +
      'drie maanden van 2025 zijn in Nederland 368 aanvallen op dieren geregistreerd. In Overijssel ' +
      'vonden relatief weinig aanvallen plaats. Dat blijkt uit een analyse van het ANP op basis van ' +
      'recente cijfers van meldpunt BIJ12.',
    image: aanvallen,
    alt: 'Grafiek: 368 geregistreerde aanvallen op dieren in Nederland in het eerste kwartaal van 2025.',
    credit: 'RTV Oost, op basis van cijfers van BIJ12',
    source: 'ANP / BIJ12',
  },
  {
    type: 'image-text',
    date: [2025, 6, 2, 15, 50],
    title: 'Met wiskunde voorspelt Sam (17) hoe de wolf zich in Nederland gaat verspreiden',
    body:
      'De terugkeer van de wolf in Nederland roept veel vragen op en leidt tot felle discussies. De ' +
      'zeventienjarige Sam uit Deventer ontwierp voor zijn profielwerkstuk een wiskundig model, dat ' +
      'inzicht geeft in de verspreiding van wolven en voorspelt waar ze zich waarschijnlijk zullen ' +
      'vestigen. Zijn onderzoek leverde hem een prijs op: de KNAW Onderwijsprijs.',
    image: sam,
    alt: 'Links Sam achter een laptop in een veld, rechts een portret van een wolf.',
    caption: 'Sam weet hoe de wolf zich de komende jaren door Nederland gaat verspreiden.',
    credit: 'Sam van Ginhoven / Getty Images',
    textPlacement: 'over',
    source: 'RTV Oost',
  },
]

export function demoDoc(): TimelineDoc {
  const doc = emptyDoc('De wolf in Overijssel')
  doc.cards = BRONNEN.map(toCard)
  return doc
}

function toCard(bron: Bron): Card {
  const [jaar, maand, dag, uur, minuut] = bron.date
  return {
    id: newId(),
    type: bron.type,
    date: buildDate(jaar, maand, dag, uur, minuut),
    title: bron.title,
    body: bron.body,
    subtitle: bron.subtitle ?? '',
    quoteAttribution: bron.quoteAttribution ?? '',
    textPlacement: bron.textPlacement ?? 'over',
    source: bron.source ?? '',
    media: bron.image
      ? {
          src: bron.image,
          mime: bron.image.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
          width: 1104,
          height: 620,
          alt: bron.alt ?? '',
          caption: bron.caption ?? '',
          credit: bron.credit ?? '',
          adjust: { ...DEFAULT_ADJUST },
        }
      : null,
  }
}

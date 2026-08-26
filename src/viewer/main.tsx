import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { normaliseDoc } from '../model/doc'
import { Player } from '../player/Player'
import '../styles/tokens.css'
import './viewer.css'

/**
 * De kijk-pagina: alleen de speler, één tijdlijn, verder niets.
 *
 * Dit is de ingang die in een iframe op de site komt te staan. Het document
 * zit in de pagina zelf, in een script-blok dat de editor bij het exporteren
 * vult. Geen server, geen tweede bestand dat mee moet: één HTML-bestand is
 * één tijdlijn, en blijft dat ook als er over drie jaar niemand meer weet waar
 * hij vandaan kwam.
 */
const DATA_ID = 'tijdlijn-data'

function leesDocument(): unknown {
  const blok = document.getElementById(DATA_ID)
  if (!blok?.textContent) return null
  try {
    return JSON.parse(blok.textContent)
  } catch {
    return null
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Het element #root ontbreekt in viewer.html.')

const rauw = leesDocument()

// Een ongevulde kijk-pagina hoort te zeggen wat eraan schort. Zonder dit zie
// je een leeg wit vlak en weet je niet of de tijdlijn stuk is of nog moet
// komen.
if (rauw === null || typeof rauw === 'string') {
  root.innerHTML =
    '<p class="viewer-leeg">Deze pagina bevat nog geen tijdlijn. ' +
    'Exporteer hem opnieuw vanuit de tijdlijn-editor.</p>'
} else {
  createRoot(root).render(
    <StrictMode>
      <Player doc={normaliseDoc(rauw)} />
    </StrictMode>,
  )
}

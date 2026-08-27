import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Twee bouwvormen:
//   npm run build            -> gewone site in dist/ (fonts als losse bestanden)
//   SINGLEFILE=1 npm run build -> één zelfstandig HTML-bestand, te openen zonder server
const singleFile = process.env.SINGLEFILE === '1'

const VIEWER_ID = 'virtual:kijkpagina'
const VIEWER_PAD = 'dist-viewer/viewer.html'

/**
 * Stelt de gebouwde kijk-pagina beschikbaar als tekst, zodat de editor hem als
 * sjabloon kan gebruiken voor de embed-export.
 *
 * Een gewone import van dat bestand kan niet: het bestaat pas nadat de
 * kijk-pagina gebouwd is, en tijdens `npm run dev` vaak helemaal niet. Vandaar
 * dit tussenmodule, dat bij ontbreken een lege tekst teruggeeft. De editor
 * merkt dat en zegt wat eraan schort, in plaats van een kapot bestand te
 * downloaden.
 */
function kijkpagina(): Plugin {
  return {
    name: 'tijdlijn-kijkpagina',
    resolveId: (id) => (id === VIEWER_ID ? '\0' + VIEWER_ID : null),
    load(id) {
      if (id !== '\0' + VIEWER_ID) return null
      let html = ''
      try {
        html = readFileSync(resolve(process.cwd(), VIEWER_PAD), 'utf8')
      } catch {
        // Niet gebouwd. Geen bouwfout: de rest van de editor werkt prima en
        // `npm run dev` moet gewoon starten.
      }
      return `export default ${JSON.stringify(html)}`
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), kijkpagina(), ...(singleFile ? [viteSingleFile()] : [])],
  build: {
    outDir: singleFile ? 'dist-singlefile' : 'dist',
    // Fonts inline zetten zou het bestand met ~230 KB opblazen; in de losse build
    // blijven ze aparte bestanden zodat de browser ze kan cachen.
    assetsInlineLimit: singleFile ? 100 * 1024 * 1024 : 4096,
  },
})

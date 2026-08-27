import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * De kijk-pagina, gebouwd tot één zelfstandig HTML-bestand.
 *
 * Dit bestand is geen site maar een sjabloon: de editor leest het in en vult
 * het script-blok met een tijdlijn. Alles moet er dus in zitten — de speler,
 * de opmaak én de Roobert-fonts — want het eindresultaat moet los op een
 * webserver kunnen staan zonder iets ernaast.
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-viewer',
    emptyOutDir: true,
    rollupOptions: { input: 'viewer.html' },
    assetsInlineLimit: 100 * 1024 * 1024,
  },
})

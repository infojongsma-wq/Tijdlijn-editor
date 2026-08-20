import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Twee bouwvormen:
//   npm run build            -> gewone site in dist/ (fonts als losse bestanden)
//   SINGLEFILE=1 npm run build -> één zelfstandig HTML-bestand, te openen zonder server
const singleFile = process.env.SINGLEFILE === '1'

export default defineConfig({
  base: './',
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  build: {
    outDir: singleFile ? 'dist-singlefile' : 'dist',
    // Fonts inline zetten zou het bestand met ~230 KB opblazen; in de losse build
    // blijven ze aparte bestanden zodat de browser ze kan cachen.
    assetsInlineLimit: singleFile ? 100 * 1024 * 1024 : 4096,
  },
})

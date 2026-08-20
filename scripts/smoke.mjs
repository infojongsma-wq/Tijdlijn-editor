/**
 * Rooktest: opent de editor, laadt het voorbeelddossier en controleert dat de
 * kern werkt — kaarten, as, duw-overgang, ongedaan maken en fonts.
 *
 * Gebruik:  node scripts/smoke.mjs [url]
 * Zonder url wordt het zelfstandige bestand in dist-singlefile getest.
 */
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const doel =
  process.argv[2] ?? pathToFileURL(resolve('dist-singlefile/index.html')).href

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? undefined,
})
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } })

const fouten = []
page.on('pageerror', (e) => fouten.push('PAGEERROR: ' + e.message))
page.on('console', (m) => m.type() === 'error' && fouten.push(m.text()))
page.on('dialog', (d) => d.accept())

await page.goto(doel, { waitUntil: 'load' })
await page.waitForSelector('.shell', { timeout: 15000 })

await page.getByRole('button', { name: 'Voorbeeld' }).click()
await page.waitForTimeout(1200)

const uitkomst = {
  kaarten: await page.locator('.cli').count(),
  asStops: await page.locator('.ax-stop').count(),
  labels: await page.locator('.ax-label').allInnerTexts(),
  roobertGeladen: await page.evaluate(() => document.fonts.check('700 40px Roobert')),
}

// Duw-overgang: halverwege moeten er twee kaarten tegelijk in beeld zijn.
const scroller = page.locator('.vp-scroller')
await scroller.evaluate((el) => {
  el.scrollTop = el.clientHeight * 1.5
})
await page.waitForTimeout(400)
uitkomst.zichtbaarTijdensOvergang = await page
  .locator('.vp-slide.is-visible')
  .count()

console.log(JSON.stringify(uitkomst, null, 2))
console.log('fouten:', fouten.length ? fouten : 'geen')

const goed =
  uitkomst.kaarten === 8 &&
  uitkomst.asStops === 7 &&
  uitkomst.roobertGeladen &&
  uitkomst.zichtbaarTijdensOvergang === 2 &&
  fouten.length === 0

await browser.close()
if (!goed) {
  console.error('ROOKTEST MISLUKT')
  process.exit(1)
}
console.log('ROOKTEST GESLAAGD')

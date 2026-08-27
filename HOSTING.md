# Zelf hosten — technische leesmij

Voor de beheerder. De redactionele handleiding staat in [README.md](README.md).

## Wat dit is

Een client-side webapplicatie: React 18, gebouwd met Vite tot statische
bestanden. Er is **geen backend**, geen database, geen sessie, geen
server-side rendering. Alle logica draait in de browser van de gebruiker.

Er zit ook **geen client-side routing** in. Eén document, geen paden, dus geen
rewrite- of fallback-regels nodig. Serveer de map en klaar.

## Bouwen

Node.js 20 of nieuwer.

```bash
npm ci
npm run build          # resultaat in dist/
```

`npm run build` doet twee dingen achter elkaar: eerst wordt de kijk-pagina
gebouwd (`dist-viewer/viewer.html`), daarna de editor, die dat bestand als
sjabloon insluit. Die volgorde staat in `package.json` en is verplicht — de
editor kan zonder dat sjabloon geen tijdlijnen exporteren.

Wie geen Node wil draaien: `dist-singlefile/index.html` staat in de repo en is
de complete editor in één bestand.

## Wat er uit komt

`dist/` is ongeveer 2,0 MB:

| Onderdeel | Omvang | Opmerking |
| --- | --- | --- |
| `index.html` | ~1 kB | geen verwijzingen naar buiten |
| `assets/index-*.js` | ~233 kB | de editor |
| `assets/index-*.css` | ~38 kB | |
| `assets/_virtual_kijkpagina-*.js` | ~505 kB | sjabloon voor de export, wordt pas opgehaald bij gebruik |
| `assets/Roobert-*.woff2` | 5 × ~35 kB | huisstijlfont |
| `assets/wolf-*.jpg` | ~1 MB | voorbeelddossier, mag weg — zie onder |

Alle bestandsnamen in `assets/` bevatten een inhoudshash.

## Serveren

Statische bestanden vanuit een documentroot. nginx, Apache, IIS, een
container, een bucket achter een CDN — het maakt niet uit.

**Cache-headers.** Alles in `assets/` heeft een inhoudshash en mag
`Cache-Control: public, max-age=31536000, immutable`. `index.html` moet
`no-cache` krijgen, anders krijgt de redactie na een update de oude versie.
De meegeleverde `vercel.json` bevat precies deze twee regels; die kun je als
referentie gebruiken.

**MIME-types.** `.woff2` moet als `font/woff2` uitgeleverd worden. De meeste
servers doen dat, oudere IIS-installaties niet — dan valt het font terug op
een systeemfont en ziet de huisstijl er verkeerd uit.

**Compressie.** De JS- en CSS-bestanden comprimeren goed (gzip ongeveer 1:3).
De JPEG's niet; die staan al gecomprimeerd op schijf.

## HTTPS is geen luxe

Twee dingen breken zonder beveiligde verbinding:

- **`navigator.clipboard`** bestaat alleen op https en op `localhost`. De knop
  "Kopieer de code" valt dan terug op tekst selecteren met een melding erbij,
  maar dat is een slechtere ervaring.
- **`localStorage`** wordt door sommige browsers beperkt op onbeveiligde
  origins. De editor bewaart daar zijn tussentijdse versie; zonder dat kost een
  dichtgeklapte laptop werk.

Draai het dus op https, ook intern.

## Toegang

**De editor hoort niet publiek te staan.** Er is geen inlog, geen
rollenmodel, geen scheiding tussen gebruikers: wie het adres opent, kan
tijdlijnen maken. Zet er iets voor — SSO, een reverse proxy met
authenticatie, of alleen bereikbaar op het interne netwerk.

De *gepubliceerde* tijdlijnen zijn iets anders: die horen juist wel publiek te
staan, maar op een ander adres. Zie onder.

## Het voorbeelddossier

`src/assets/demo/` bevat zeven foto's met rechten van derden (Getty Images,
iStock, Pixabay). Ze zitten erin als testmateriaal, achter de knop
*Voorbeeld*. Voor een interne installatie is dat geen bezwaar; wil je ze eruit,
verwijder dan de map en de verwijzingen in `src/model/demo.ts`. Dat scheelt
ook ongeveer 1 MB.

## Gepubliceerde tijdlijnen

De editor exporteert een tijdlijn als één zelfstandig HTML-bestand van
ongeveer 1,5 tot 2 MB, afhankelijk van het aantal foto's. Daar zit alles in:
de speler, de teksten, de foto's als `data:`-URL en de fonts. **Nul
verwijzingen naar buiten.**

Zo'n bestand hoort in een publieke map te staan, gescheiden van de editor,
bijvoorbeeld `https://rtvoost.nl/tijdlijnen/`. Het wordt met een `<iframe>` in
een artikel gehaald:

```html
<iframe
  src="https://rtvoost.nl/tijdlijnen/de-wolf-in-overijssel.html"
  title="Tijdlijn: De wolf in Overijssel"
  loading="lazy"
  style="width:100%; aspect-ratio:16/9; min-height:520px; border:0;"
></iframe>
```

Twee dingen om te controleren:

- **Content Security Policy.** Staat er een CSP op de site, dan moet het
  tijdlijn-adres bij `frame-src` staan. Serveer je vanaf hetzelfde domein, dan
  speelt dit niet.
- **CMS.** Sommige redactiesystemen strippen `<iframe>` uit artikelen of
  hanteren een witte lijst met domeinen.

De gepubliceerde bestanden zijn statisch en hebben de editor niet nodig. Een
storing op de editor-omgeving raakt gepubliceerde dossiers dus niet. Dat is
opzet en zou zo moeten blijven.

## Wat er nog niet is, en wat het straks nodig heeft

De editor slaat op naar een bestand op de eigen computer. Voor een
redactiebrede werkwijze is er meer nodig. Dit staat er nog niet in; het staat
hier zodat je het kunt meewegen bij het inrichten.

**Gedeelde opslag.** Een kleine API met vier handelingen — lijst, openen,
opslaan, verwijderen — en een plek om te bewaren. Een map met bestanden plus
back-up volstaat om te beginnen; een database mag maar hoeft niet. Weinig
code, in welke stack dan ook.

**Beeld als losse bestanden.** Op dit moment staan foto's als `data:`-URL in
het document. Op een laptop is dat prima, maar bij server-opslag betekent het
dat elke bewaaractie een paar megabyte verstuurt. Dat moet dan een upload-
endpoint worden dat een URL teruggeeft.

De rest van de applicatie is hier al op voorbereid: het documentformaat en de
speler accepteren een gewone URL net zo goed als een `data:`-URL, en het
voorbeelddossier draait daar al op. Bij de export wordt alles wat nog een
verwijzing is alsnog ingesloten, zodat het gepubliceerde bestand zelfstandig
blijft. De wijziging zit in één functie — `importImage()` in
`src/model/image.ts` — die nu een `data:`-URL teruggeeft en dan een
server-URL. Nodig van jouw kant: een schrijfbare plek voor beeld, met een
publiek leesbaar adres.

**Authenticatie.** Zodra er gedeeld opgeslagen wordt, is de vraag wie mag
bewerken en wie mag publiceren niet meer te vermijden. Het liefst aangesloten
op de bestaande accounts, zodat de redactie geen extra wachtwoord krijgt.

**Publiceren vanuit de editor.** Nu downloadt de exportknop een bestand. Met
de bovengenoemde API erbij kan hij het rechtstreeks naar de publieke map
schrijven en het definitieve adres teruggeven.

## Verder lezen

De keuzes achter de opbouw — waarom foto's in het document zitten, waarom het
scrollen van de browser blijft, hoe het exportsjabloon werkt — staan onder
"Hoe het in elkaar zit" in [README.md](README.md).

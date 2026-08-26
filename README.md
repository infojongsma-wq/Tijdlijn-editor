# Tijdlijn-editor

Een gereedschap waarmee de redactie van RTV Oost een dossier tot een verhaal
maakt: kaarten met datum, tekst en beeld, afgespeeld als responsieve tijdlijn in
de huisstijl.

Dit is **fase 1**: een werkend prototype, nog niet bedoeld om echt mee te
publiceren.

## Wat er werkt

- **Editor** — momenten toevoegen, datum, kop, tekst en beeld invullen. De
  volgorde volgt automatisch uit de datum.
- **Zeven soorten kaarten** — titelkaart, beeld met tekst, alleen beeld, alleen
  tekst, citaat, graphic en vergelijken. Om te wisselen zonder je werk kwijt te
  raken.
- **Vergelijken** — twee beelden met één tekst, twee beelden met twee teksten,
  of één beeld met twee teksten. Beide beelden krijgen altijd dezelfde maat en
  beide tekstblokken ook; is de ene tekst korter, dan blijft er onderin ruimte
  over in plaats van dat het beeld ernaast groter wordt. Elke helft kan een
  eigen gekleurd vlak krijgen, zodat het verschil ook in kleur te zien is.
- **Tekstopmaak** — vet, cursief, dun, en losse woorden in een kleur: wit en
  donkerblauw om terug te keren naar gewoon, de zes merkkleuren, en de zes
  zachte tinten uit de huisstijl als nuance. Geplakte tekst uit Word komt
  binnen als kale tekst.
- **Aanwijzers op het beeld, in drie smaken** — een punt met lijn en
  tekstballon; alleen een punt (of een eigen geüploade picto) als markering;
  of een los tekstblok zonder punt en lijn. Anker en ballon sleep je elk vrij
  naar hun plek. Alle posities staan in fracties, dus alles klopt op elk
  schermformaat. Ditzelfde mechanisme dient straks voor een aanklikbare kaart
  van Overijssel en voor toelichtingen op een grafiek.
- **Beeld bijstellen** — brandpunt slepen, inzoomen, doorzichtigheid,
  belichting, contrast en verzadiging. De foto zelf wordt daarbij nooit
  aangeraakt; alleen de instellingen worden bewaard.
- **Verticaal scrollen met duw-overgang** — de kaarten duwen elkaar omhoog,
  zoals de overgang 'duwen' in PowerPoint. Loslaten betekent altijd op een
  hele kaart landen; het verhaal blijft nooit tussen twee kaarten in hangen.
- **Citaat in drie vormen** — *over de foto*: de foto wordt gedimd om de tekst
  leesbaar te houden. *In een kader*: de foto blijft vol in kleur en het citaat
  krijgt een eigen vlak dat je over de foto versleept, zodat het gezicht waar
  het over gaat vrij blijft. *Naast elkaar*: citaat en foto elk in een eigen
  kader — links, rechts, boven of onder — op een gekleurd vlak. Bij de laatste
  twee kun je een dunne lijn om de kaders zetten; de hoeken zijn licht
  afgerond. Op een telefoon komen de kaders altijd onder elkaar.
- **Tekst past altijd** — de lezer scrolt alleen door het verhaal, nooit
  binnen een kaart. Past de inhoud niet, dan wordt de tekst stapsgewijs iets
  verkleind tot hij past, met een ondergrens.
- **De as** — links, rechts, boven, onder of verborgen. Aanklikbaar, met
  voortgangsbalk en teller.
- **Kleuren uit de huisstijl** — geen vrije kleurkiezer maar een staalkaart met
  de kleuren van RTV Oost. Je kiest achtergrond, tekst en accent; de zachte
  tekstkleur en de lijn van de as worden daaruit berekend, zodat er geen
  onleesbare combinatie te maken valt. De editor toont het contrast erbij.
- **Ongedaan maken** — twintig stappen terug, en weer vooruit (Ctrl+Z /
  Ctrl+Shift+Z).
- **Bekijken** — de tijdlijn schermvullend, zoals het publiek hem straks ziet.
  Escape sluit hem weer.
- **Opslaan en openen** — als bestand op je eigen computer (Ctrl+S). Tussentijds
  bewaart de editor automatisch, zodat een dichtgeklapte laptop niets kost.

## Online zetten met Vercel

De editor is een gewone statische site: geen server, geen database, geen
omgevingsvariabelen. `vercel.json` staat klaar met de juiste instellingen
(Vite, build naar `dist/`, alle paden terug naar `index.html`).

1. Ga naar [vercel.com/new](https://vercel.com/new) en kies deze repository.
2. Vercel herkent Vite zelf; de instellingen uit `vercel.json` worden gebruikt.
   Er hoeft niets ingevuld te worden.
3. Klik op **Deploy**.

Vanaf dan levert elke push naar `main` een nieuwe versie op, en krijgt elke
pull request een eigen voorbeeldlink.

Let op: de editor bewaart tijdlijnen als bestand op je eigen computer, niet op
de server. Iedereen die de link opent, begint met een leeg document. Voor een
gedeelde bibliotheek is de database nodig die we later met een ICT-collega
bouwen.

## Openen zonder iets te installeren

Download `dist-singlefile/index.html` en open het met een dubbelklik. Alles zit
in dat ene bestand: de fonts, het voorbeelddossier en het programma zelf. Er is
geen internetverbinding en geen installatie nodig.

## Zelf bouwen of doorontwikkelen

Hiervoor is [Node.js](https://nodejs.org) 20 of nieuwer nodig.

```bash
npm install
npm run dev          # editor op http://localhost:5173
npm run build        # gewone site in dist/
SINGLEFILE=1 npm run build   # één zelfstandig bestand in dist-singlefile/
npm run typecheck    # controleert de types
```

Rooktest, die controleert of de kern nog werkt:

```bash
npm install --save-dev playwright
node scripts/smoke.mjs                          # test dist-singlefile/index.html
node scripts/smoke.mjs http://localhost:5173/   # test de draaiende editor
```

## Hoe het in elkaar zit

Alles rust op één idee: een tijdlijn is een **document** — een lijst kaarten met
datums, teksten, beeld en instellingen. De vormgeving zit niet vast in dat
document maar wordt eroverheen gelegd. Daardoor kun je van vorm wisselen zonder
iets opnieuw in te voeren, en blijft een gepubliceerde tijdlijn werken ook als
de editor later wordt verbouwd.

```
src/
  model/      het document en de regels eromheen
    types.ts      hoe een tijdlijn en een kaart eruitzien
    dates.ts      datums met wisselende nauwkeurigheid, sorteren en tonen
    doc.ts        aanmaken, sorteren, inlezen van oudere bestanden
    image.ts      foto's inlezen, verkleinen en waarschuwen
    history.ts    ongedaan maken
    storage.ts    opslaan, openen, tussentijds bewaren
    contrast.ts   contrastcontrole volgens WCAG
    demo.ts       het wolvendossier als testmateriaal
  player/     wat de kijker ziet
  ui/         wat de redacteur bedient
  styles/     huisstijl-tokens, editor en speler
```

### Keuzes die uitleg verdienen

**Foto's zitten in het document.** Er is geen koppeling met de beeldbank, dus
een foto wordt als `data:`-URL in het bestand opgeslagen. Om te voorkomen dat
dat onwerkbaar wordt, verkleint de editor bij het inplakken alles wat groter is
dan 1920 pixels. Is een foto al kleiner, dan blijft hij onaangeroerd: opnieuw
coderen zou alleen kwaliteit kosten.

**Het scrollen blijft van de browser.** De duw-overgang wordt aangedreven door
de scrollpositie, niet door het scrollen over te nemen. Dat houdt
toetsenbordbediening, schermlezers en het gevoel van controle intact. Bij
bezoekers die aangeven zo min mogelijk beweging te willen zien, gaat de
overgang vanzelf uit.

**Datums mogen onvolledig zijn.** `1953`, `maart 2024` en `29 oktober, 06:30`
zijn alle drie geldig. Wat je invult is wat de kijker ziet. Vallen twee
momenten op dezelfde dag — zoals de twee artikelen van 13 maart in het
voorbeelddossier — dan krijgen ze allebei hun tijdstip erbij, zodat de as geen
twee identieke stops toont.

**Bijschrift en rechten zijn losse velden.** In de bron zaten ze aan elkaar
geplakt (`…niet waarschijnlijk.© Oost / Ingestuurd`). Hier niet.

## Het voorbeelddossier

Onder de knop *Voorbeeld* zit het wolvendossier: zeven artikelen van RTV Oost
tussen 13 maart en 2 juni 2025. Dat is **testmateriaal**, geen inhoud die bij de
app hoort. Het staat erin om de editor te vullen met koppen van echte lengte,
datums die samenvallen en foto's met echte rechtenvermeldingen. Wie een eigen
tijdlijn begint, gooit het weg met *Nieuw*.

## Nog niet gebouwd

De vijf andere tijdlijnvormen (filmstrip, duo-cards, magazine, headlines,
horizontaal), links in de lopende tekst, knoppen onder de tekst, hoofdstukken,
het inklappen van lege perioden, video en de embed-keten met meegroeiende
hoogte.

import { useCallback, useRef } from 'react'
import type {
  Card,
  CardType,
  CompareLayout,
  Media,
  QuoteSide,
  QuoteStyle,
  TextPlacement,
} from '../model/types'
import { buildDate, precisionLabel } from '../model/dates'
import {
  cardTypeLabel,
  typeUsesBody,
  typeUsesMedia,
  typeUsesTweedeMedia,
  typeUsesTweedeTekst,
} from '../model/doc'
import { ImageField } from './ImageField'
import { Field, NumberInput, Segmented, Select, TextArea, TextInput, Toggle } from './controls'
import { ACHTERGRONDEN, KADER_KLEUREN, type Swatch } from '../model/palette'
import { mediaStyle } from '../player/media'
import { RichText } from './RichText'

interface Props {
  card: Card
  onChange: (patch: Partial<Card>, label?: string) => void
}

const TYPES: CardType[] = ['title', 'image-text', 'image', 'text', 'quote', 'graphic', 'compare']

/** Suggesties voor het label op de titelkaart; vrij te overschrijven. */
const BADGES = [
  'Dossier',
  'Verhaal',
  'Tijdlijn',
  'Collectie',
  'Verdieping',
  'Reconstructie',
  'Evenement',
  'Herdenking',
  'Geschiedenis',
]

const QUOTE_VORMEN: { value: QuoteStyle; label: string; title: string }[] = [
  { value: 'over', label: 'Over de foto', title: 'De foto wordt gedimd, de tekst staat er los overheen' },
  { value: 'kader', label: 'In een kader', title: 'De foto blijft vol in kleur; het citaatkader is te verschuiven' },
  { value: 'naast', label: 'Naast elkaar', title: 'Citaat en foto elk in een eigen kader op een gekleurd vlak' },
]

const QUOTE_KANTEN: { value: QuoteSide; label: string; title: string }[] = [
  { value: 'links', label: 'Links', title: 'De foto links van het citaat' },
  { value: 'rechts', label: 'Rechts', title: 'De foto rechts van het citaat' },
  { value: 'boven', label: 'Boven', title: 'De foto boven het citaat' },
  { value: 'onder', label: 'Onder', title: 'De foto onder het citaat' },
]

const INDELINGEN: { value: CompareLayout; label: string; title: string }[] = [
  { value: 'twee-beeld-een-tekst', label: '2 beeld, 1 tekst', title: 'Twee beelden naast elkaar, één tekst eronder' },
  { value: 'twee-beeld-twee-tekst', label: '2 beeld, 2 tekst', title: 'Twee beelden, elk met een eigen tekst' },
  { value: 'een-beeld-twee-tekst', label: '1 beeld, 2 tekst', title: 'Eén beeld met twee tekstblokken ernaast' },
]

const PLAATSING: { value: TextPlacement; label: string; title: string }[] = [
  { value: 'over', label: 'Over', title: 'Tekst over het beeld' },
  { value: 'below', label: 'Onder', title: 'Beeld boven, tekst eronder' },
  { value: 'beside', label: 'Naast', title: 'Beeld met tekst ernaast' },
]

export function CardForm({ card, onChange }: Props) {
  const { date } = card
  const isTitel = card.type === 'title'

  const zetDatum = (
    jaar: number | undefined,
    maand: number | undefined,
    dag: number | undefined,
    uur: number | undefined,
    minuut: number | undefined,
  ) => {
    onChange({ date: buildDate(jaar ?? date.year, maand, dag, uur, minuut) }, 'datum')
  }

  return (
    <div className="form">
      <Field label="Soort kaart">
        <Select
          value={card.type}
          onChange={(v) => onChange({ type: v })}
          options={TYPES.map((t) => ({ value: t, label: cardTypeLabel(t) }))}
        />
      </Field>

      {!isTitel && (
        <Field
          group
          label="Datum"
          hint={`Laat velden leeg voor een globalere datum — nu: ${precisionLabel(date.precision)}. De volgorde volgt hieruit.`}
        >
          <div className="datumrij">
            <NumberInput
              value={date.day}
              min={1}
              max={31}
              placeholder="dag"
              ariaLabel="Dag"
              width={62}
              onChange={(v) => zetDatum(date.year, date.month, v, date.hour, date.minute)}
            />
            <NumberInput
              value={date.month}
              min={1}
              max={12}
              placeholder="mnd"
              ariaLabel="Maand"
              width={62}
              onChange={(v) => zetDatum(date.year, v, date.day, date.hour, date.minute)}
            />
            <NumberInput
              value={date.year}
              min={1}
              max={9999}
              placeholder="jaar"
              ariaLabel="Jaar"
              width={74}
              onChange={(v) => zetDatum(v, date.month, date.day, date.hour, date.minute)}
            />
            <span className="datumrij-sep">om</span>
            <NumberInput
              value={date.hour}
              min={0}
              max={23}
              placeholder="uu"
              ariaLabel="Uur"
              width={56}
              onChange={(v) => zetDatum(date.year, date.month, date.day, v, date.minute)}
            />
            <NumberInput
              value={date.minute}
              min={0}
              max={59}
              placeholder="mm"
              ariaLabel="Minuut"
              width={56}
              onChange={(v) =>
                zetDatum(date.year, date.month, date.day, date.hour ?? 0, v)
              }
            />
          </div>
        </Field>
      )}

      <Field label={isTitel ? 'Titel van het dossier' : 'Kop'}>
        <TextArea
          value={card.title}
          rows={2}
          placeholder={isTitel ? 'De wolf in Overijssel' : 'Wat gebeurde er op dit moment?'}
          onChange={(v) => onChange({ title: v }, 'kop')}
        />
      </Field>

      {isTitel && (
        <Field label="Ondertitel">
          <TextArea
            value={card.subtitle}
            rows={2}
            placeholder="Een dossier in zeven momenten."
            onChange={(v) => onChange({ subtitle: v }, 'ondertitel')}
          />
        </Field>
      )}

      {isTitel && (
        <Field
          group
          label="Label bovenaan"
          hint="Het blokje boven de titel. Kies een suggestie of typ je eigen woord. Laat het leeg als je geen blokje wilt."
        >
          <BadgeKiezer value={card.badge} onChange={(v) => onChange({ badge: v }, 'badge')} />
        </Field>
      )}

      {card.type === 'compare' && (
        <Field group label="Indeling" hint="Wat naast elkaar komt te staan.">
          <Segmented
            label="Indeling van de vergelijkkaart"
            value={card.compareLayout}
            onChange={(v) => onChange({ compareLayout: v })}
            options={INDELINGEN}
          />
        </Field>
      )}

      {typeUsesBody(card.type) && !isTitel && (
        <Field
          group
          label={card.type === 'quote' ? 'Het citaat' : 'Tekst'}
          hint="Selecteer een stuk tekst en kies een opmaak of een kleur."
        >
          <RichText
            value={card.body}
            rows={card.type === 'quote' ? 3 : 6}
            ariaLabel={card.type === 'quote' ? 'Het citaat' : 'Tekst'}
            placeholder={
              card.type === 'quote'
                ? 'Ook dan mag je niet zomaar afschieten.'
                : 'De toelichting bij dit moment.'
            }
            onChange={(v) => onChange({ body: v }, 'tekst')}
          />
        </Field>
      )}

      {card.type === 'quote' && (
        <>
          <Field
            group
            label="Vorm van het citaat"
            hint="Over de foto: de foto wordt gedimd zodat de tekst leesbaar blijft. In een kader: de foto blijft vol in kleur en het citaat krijgt een eigen vlak dat je kunt verschuiven. Naast elkaar: citaat en foto elk in een eigen kader op een gekleurd vlak."
          >
            <Segmented
              label="Vorm van het citaat"
              value={card.quoteStyle}
              onChange={(v) => onChange({ quoteStyle: v })}
              options={QUOTE_VORMEN}
            />
          </Field>

          {card.quoteStyle === 'kader' && (
            <Field
              group
              label="Plek van het kader"
              hint="Sleep het kader naar een rustig deel van de foto. Met de pijltjestoetsen gaat het ook, en met Shift erbij in grotere stappen."
            >
              <KaderPlek
                media={card.media}
                x={card.quoteBoxX}
                y={card.quoteBoxY}
                onChange={(x, y) => onChange({ quoteBoxX: x, quoteBoxY: y }, 'kaderplek')}
              />
            </Field>
          )}

          {card.quoteStyle === 'naast' && (
            <Field group label="Kant van de foto" hint="Op een telefoon komt de foto altijd boven of onder de tekst; naast elkaar past daar niet.">
              <Segmented
                label="Kant van de foto"
                value={card.quoteSide}
                onChange={(v) => onChange({ quoteSide: v })}
                options={QUOTE_KANTEN}
              />
            </Field>
          )}

          {card.quoteStyle !== 'over' && (
            <Field group label="Kleur van het citaatkader">
              <Stalen
                kleuren={KADER_KLEUREN}
                waarde={card.quoteFrameColor}
                onKies={(hex) => hex !== null && onChange({ quoteFrameColor: hex })}
              />
            </Field>
          )}

          {card.quoteStyle === 'naast' && (
            <Field group label="Achtergrond van de kaart" hint="Het vlak waarop beide kaders liggen.">
              <Stalen
                kleuren={ACHTERGRONDEN}
                waarde={card.quoteBackdrop}
                onKies={(hex) => hex !== null && onChange({ quoteBackdrop: hex })}
              />
            </Field>
          )}

          {card.quoteStyle !== 'over' && (
            <Field group label="Lijn om de kaders">
              <Toggle
                label="Een dunne lijn om de kaders"
                checked={card.quoteBorder}
                onChange={(v) => onChange({ quoteBorder: v })}
              />
              {card.quoteBorder && (
                <Stalen
                  kleuren={KADER_KLEUREN}
                  waarde={card.quoteBorderColor}
                  volgLabel="Volg de tekstkleur"
                  onKies={(hex) => onChange({ quoteBorderColor: hex })}
                />
              )}
            </Field>
          )}
        </>
      )}

      {card.type === 'image-text' && card.media && (
        <Field group label="Plek van de tekst">
          <Segmented
            label="Plek van de tekst"
            value={card.textPlacement}
            onChange={(v) => onChange({ textPlacement: v })}
            options={PLAATSING}
          />
        </Field>
      )}

      {typeUsesTweedeTekst(card) && (
        <Field
          group
          label="Tweede tekst"
          hint="De tekst bij het rechterdeel van de vergelijking."
        >
          <RichText
            value={card.body2}
            rows={4}
            ariaLabel="Tweede tekst"
            placeholder="De andere kant van de vergelijking."
            onChange={(v) => onChange({ body2: v }, 'tekst2')}
          />
        </Field>
      )}

      {card.type === 'graphic' && (
        <Field
          group
          label="Formaat van de graphic"
          hint="In een kader staat de grafiek op een gekleurd vlak met lucht eromheen; beeldvullend loopt hij door tot de randen van de kaart."
        >
          <Segmented
            label="Formaat van de graphic"
            value={card.graphicFit}
            onChange={(v) => onChange({ graphicFit: v })}
            options={[
              { value: 'kader', label: 'In kader' },
              { value: 'vullend', label: 'Beeldvullend' },
            ]}
          />
          {card.graphicFit === 'kader' && (
            <div className="stalen">
              {KADER_KLEUREN.map((k) => (
                <button
                  key={k.hex}
                  type="button"
                  className={`staal ${
                    k.hex.toLowerCase() === card.graphicFrameColor.toLowerCase() ? 'is-on' : ''
                  }`}
                  style={{ background: k.hex }}
                  onClick={() => onChange({ graphicFrameColor: k.hex })}
                  title={`${k.naam} · ${k.hex}`}
                  aria-label={k.naam}
                  aria-pressed={k.hex.toLowerCase() === card.graphicFrameColor.toLowerCase()}
                />
              ))}
            </div>
          )}
        </Field>
      )}

      {typeUsesMedia(card.type) && (
        <div className="form-block">
          <h3 className="form-h3">{typeUsesTweedeMedia(card) ? 'Eerste beeld' : 'Beeld'}</h3>
          <ImageField
            media={card.media}
            cropped={card.type !== 'graphic'}
            onChange={(media, label) => onChange({ media }, label)}
          />
        </div>
      )}

      {typeUsesTweedeMedia(card) && (
        <div className="form-block">
          <h3 className="form-h3">Tweede beeld</h3>
          <ImageField
            media={card.media2}
            cropped
            onChange={(media2, label) => onChange({ media2 }, label ? `2:${label}` : undefined)}
          />
        </div>
      )}

      <Field label="Bron" hint="Waar komt dit moment vandaan. Wordt niet getoond.">
        <TextInput
          value={card.source}
          placeholder="RTV Oost, Chantal Everaardt"
          onChange={(v) => onChange({ source: v }, 'bron')}
        />
      </Field>
    </div>
  )
}

/**
 * Het label boven de titel: een uitklaplijst met suggesties naast een vrij
 * tekstveld.
 *
 * Eerder stonden de suggesties in een `datalist` achter het tekstveld. Dat is
 * onvindbaar — de lijst verschijnt pas als je begint te typen of het pijltje
 * precies raakt — waardoor het label in de praktijk altijd op 'Dossier' bleef
 * staan. Nu is de keuze meteen zichtbaar, en blijft het tekstveld ernaast
 * staan zodat je er ook je eigen woord in kunt zetten.
 *
 * Leegmaken betekent: geen blokje. Staat er iets eigens in, dan toont de lijst
 * dat als extra regel, zodat de lijst nooit iets anders beweert dan er staat.
 */
function BadgeKiezer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const bekend = BADGES.includes(value)
  return (
    <div className="badgerij">
      <select
        className="inp inp-select"
        aria-label="Suggestie voor het label"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Geen label</option>
        {!bekend && value !== '' && <option value={value}>Eigen tekst: {value}</option>}
        {BADGES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <TextInput
        value={value}
        placeholder="Geen label"
        aria-label="Tekst van het label"
        onChange={onChange}
      />
    </div>
  )
}

/**
 * Een rij kleurstalen. Met `volgLabel` krijgt de rij er een eerste knop bij
 * die de kleur weer loslaat, zodat 'geen eigen keuze' een echte keuze blijft
 * en niet iets dat je alleen bereikt door de kaart opnieuw te maken.
 */
function Stalen({
  kleuren,
  waarde,
  onKies,
  volgLabel,
}: {
  kleuren: Swatch[]
  waarde: string | null
  onKies: (hex: string | null) => void
  volgLabel?: string
}) {
  const gelijk = (hex: string) => waarde !== null && hex.toLowerCase() === waarde.toLowerCase()
  return (
    <div className="stalen">
      {volgLabel && (
        <button
          type="button"
          className={`staal is-thema ${waarde === null ? 'is-on' : ''}`}
          onClick={() => onKies(null)}
          title={volgLabel}
          aria-label={volgLabel}
          aria-pressed={waarde === null}
        />
      )}
      {kleuren.map((k) => (
        <button
          key={k.hex}
          type="button"
          className={`staal ${gelijk(k.hex) ? 'is-on' : ''}`}
          style={{ background: k.hex }}
          onClick={() => onKies(k.hex)}
          title={`${k.naam} · ${k.hex}`}
          aria-label={k.naam}
          aria-pressed={gelijk(k.hex)}
        />
      ))}
    </div>
  )
}

/**
 * Sleepbare plek voor het citaatkader.
 *
 * Rekent net als de speler met de fractie van de vrije ruimte in plaats van
 * met het middelpunt van het kader — zie `kaderPlek()` in CardView. Daardoor
 * komt wat je hier neerzet op elk schermformaat op dezelfde plek uit, en kan
 * het kader nooit half buiten de kaart vallen.
 *
 * Het vlak heeft een vaste verhouding van 16:9. Dat is een benadering van de
 * kaart, niet de kaart zelf; de voorvertoning ernaast toont de echte maat.
 */
function KaderPlek({
  media,
  x,
  y,
  onChange,
}: {
  media: Media | null
  x: number
  y: number
  onChange: (x: number, y: number) => void
}) {
  const vlakRef = useRef<HTMLDivElement>(null)
  const vakRef = useRef<HTMLButtonElement>(null)
  const sleept = useRef(false)

  const klem = (n: number) => Number(Math.min(1, Math.max(0, n)).toFixed(4))

  const fractie = useCallback((clientX: number, clientY: number) => {
    const vlak = vlakRef.current
    const vak = vakRef.current
    if (!vlak || !vak) return null
    const r = vlak.getBoundingClientRect()
    const v = vak.getBoundingClientRect()
    const vrijX = r.width - v.width
    const vrijY = r.height - v.height
    return {
      x: vrijX > 0 ? klem((clientX - r.left - v.width / 2) / vrijX) : 0.5,
      y: vrijY > 0 ? klem((clientY - r.top - v.height / 2) / vrijY) : 0.5,
    }
  }, [])

  const opPointerDown = (e: React.PointerEvent) => {
    // Alleen de linkerknop: met rechts hoort een menu te openen, niet iets te
    // verschuiven.
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    sleept.current = true
    const f = fractie(e.clientX, e.clientY)
    if (f) onChange(f.x, f.y)
  }

  const opPointerMove = (e: React.PointerEvent) => {
    if (!sleept.current || e.buttons === 0) return
    const f = fractie(e.clientX, e.clientY)
    if (f) onChange(f.x, f.y)
  }

  const opToets = (e: React.KeyboardEvent) => {
    const stap = e.shiftKey ? 0.1 : 0.02
    const richting: Record<string, [number, number]> = {
      ArrowLeft: [-stap, 0],
      ArrowRight: [stap, 0],
      ArrowUp: [0, -stap],
      ArrowDown: [0, stap],
    }
    const delta = richting[e.key]
    if (!delta) return
    e.preventDefault()
    onChange(klem(x + delta[0]), klem(y + delta[1]))
  }

  return (
    <div
      className="kaderplek"
      ref={vlakRef}
      onPointerDown={opPointerDown}
      onPointerMove={opPointerMove}
      onPointerUp={() => {
        sleept.current = false
      }}
    >
      {media ? (
        <img src={media.src} alt="" style={mediaStyle(media, 'cover')} />
      ) : (
        <span className="kaderplek-leeg">Nog geen foto</span>
      )}
      <button
        type="button"
        ref={vakRef}
        className="kaderplek-vak"
        style={{
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          transform: `translate(${x * -100}%, ${y * -100}%)`,
        }}
        onKeyDown={opToets}
        aria-label="Plek van het citaatkader; versleep het of gebruik de pijltjestoetsen"
      >
        Citaat
      </button>
    </div>
  )
}

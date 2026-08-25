import type { Card, CardType, TextPlacement } from '../model/types'
import { buildDate, precisionLabel } from '../model/dates'
import { cardTypeLabel, typeUsesBody, typeUsesMedia } from '../model/doc'
import { ImageField } from './ImageField'
import { Field, NumberInput, Segmented, Select, TextArea, TextInput, Toggle } from './controls'
import { KADER_KLEUREN } from '../model/palette'
import { RichText } from './RichText'

interface Props {
  card: Card
  onChange: (patch: Partial<Card>, label?: string) => void
}

const TYPES: CardType[] = ['title', 'image-text', 'image', 'text', 'quote', 'graphic']

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
        <Field label="Wie zegt dit?">
          <TextInput
            value={card.quoteAttribution}
            placeholder="Daniel Tuitert, jurist uit Zwolle"
            onChange={(v) => onChange({ quoteAttribution: v }, 'bron-citaat')}
          />
        </Field>
      )}

      {card.type === 'quote' && (
        <Field
          group
          label="Foto en leesbaarheid"
          hint="Kader uit: de foto wordt gedimd zodat de tekst leesbaar blijft. Kader aan: de foto blijft vol in kleur en het citaat krijgt een eigen vlak."
        >
          <Toggle
            label="Citaat in een gekleurd kader"
            checked={card.quoteFrame}
            onChange={(v) => onChange({ quoteFrame: v })}
          />
          {card.quoteFrame && (
            <div className="stalen">
              {KADER_KLEUREN.map((k) => (
                <button
                  key={k.hex}
                  type="button"
                  className={`staal ${
                    k.hex.toLowerCase() === card.quoteFrameColor.toLowerCase() ? 'is-on' : ''
                  }`}
                  style={{ background: k.hex }}
                  onClick={() => onChange({ quoteFrameColor: k.hex })}
                  title={`${k.naam} · ${k.hex}`}
                  aria-label={k.naam}
                  aria-pressed={k.hex.toLowerCase() === card.quoteFrameColor.toLowerCase()}
                />
              ))}
            </div>
          )}
        </Field>
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

      {typeUsesMedia(card.type) && (
        <div className="form-block">
          <h3 className="form-h3">Beeld</h3>
          <ImageField
            media={card.media}
            cropped={card.type !== 'graphic'}
            onChange={(media, label) => onChange({ media }, label)}
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

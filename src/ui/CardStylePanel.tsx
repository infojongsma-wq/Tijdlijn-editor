import type { Card } from '../model/types'
import { ALLE_KLEUREN, KOP_KLEUREN, afgeleid } from '../model/palette'
import { contrastRatio, contrastVerdict } from '../model/contrast'
import { cardTypeLabel } from '../model/doc'
import { Field } from './controls'
import type { Theme } from '../model/types'

interface Props {
  card: Card | null
  theme: Theme
  onChange: (patch: Partial<Card>, label?: string) => void
}

/**
 * Vormgeving van één kaart.
 *
 * Alles hier is een uitzondering op het thema: standaard volgt de kaart de
 * tijdlijn, en pas als de foto erom vraagt zet je er een eigen kleur op. Daarom
 * staat 'Volg de tijdlijn' overal als eerste keuze, en zie je meteen wat de
 * tijdlijn zelf zou doen.
 */
export function CardStylePanel({ card, theme, onChange }: Props) {
  if (!card) {
    return <p className="panel-empty">Kies links een moment om de vormgeving aan te passen.</p>
  }

  const extra = afgeleid(theme)
  const kopKleur = card.headingColor ?? theme.text
  const tekstKleur = card.bodyColor ?? theme.text
  // Op een kaart met beeld ligt er een sluier in de achtergrondkleur onder de
  // tekst, dus die achtergrond is de eerlijke referentie voor het contrast.
  const kopOordeel = contrastVerdict(contrastRatio(kopKleur, theme.background))
  const tekstOordeel = contrastVerdict(contrastRatio(tekstKleur, theme.background))

  return (
    <div className="settings">
      <section className="settings-block">
        <h3 className="panel-h3">Deze kaart</h3>
        <p className="settings-note">
          {cardTypeLabel(card.type)} — {card.title.trim() || 'zonder kop'}
        </p>
      </section>

      <section className="settings-block">
        <h3 className="panel-h3">Kop</h3>
        <Stalen
          label="Kleur van de kop"
          waarde={card.headingColor}
          stalen={KOP_KLEUREN}
          themaKleur={theme.text}
          onKies={(hex) => onChange({ headingColor: hex }, 'kopkleur')}
        />
        <p className={`msg msg-${kopOordeel.level === 'ok' ? 'info' : 'warn'}`}>
          Op de achtergrond van de tijdlijn: {kopOordeel.text}
        </p>
      </section>

      <section className="settings-block">
        <h3 className="panel-h3">Lopende tekst</h3>
        <Stalen
          label="Kleur van de tekst"
          hint="Voor losse woorden gebruik je de kleurknopjes boven het tekstveld; dit zet de hele tekst van deze kaart."
          waarde={card.bodyColor}
          stalen={ALLE_KLEUREN}
          themaKleur={theme.text}
          onKies={(hex) => onChange({ bodyColor: hex }, 'tekstkleur')}
        />
        <p className={`msg msg-${tekstOordeel.level === 'ok' ? 'info' : 'warn'}`}>
          Op de achtergrond van de tijdlijn: {tekstOordeel.text}
        </p>
      </section>

      <section className="settings-block">
        <h3 className="panel-h3">Volgt de tijdlijn</h3>
        <div className="afgeleid">
          <span className="afgeleid-staal" style={{ background: theme.accent }} title="Accent" />
          <span className="afgeleid-staal" style={{ background: extra.axisLine }} title="Lijn van de as" />
          <span className="afgeleid-tekst">
            Accent, de as en de achtergrond staan onder <strong>Tijdlijn</strong> — die gelden
            voor alle kaarten.
          </span>
        </div>
      </section>
    </div>
  )
}

function Stalen({
  label,
  hint,
  waarde,
  stalen,
  themaKleur,
  onKies,
}: {
  label: string
  hint?: string
  waarde: string | null
  stalen: { naam: string; hex: string }[]
  themaKleur: string
  onKies: (hex: string | null) => void
}) {
  return (
    <Field group label={label} hint={hint}>
      <div className="stalen">
        <button
          type="button"
          className={`staal is-thema ${waarde === null ? 'is-on' : ''}`}
          style={{ background: themaKleur }}
          onClick={() => onKies(null)}
          title="Volg de tijdlijn"
          aria-label="Volg de tijdlijn"
          aria-pressed={waarde === null}
        />
        {stalen.map((s) => (
          <button
            key={s.hex}
            type="button"
            className={`staal ${waarde?.toLowerCase() === s.hex.toLowerCase() ? 'is-on' : ''}`}
            style={{ background: s.hex }}
            onClick={() => onKies(s.hex)}
            title={`${s.naam} · ${s.hex}`}
            aria-label={s.naam}
            aria-pressed={waarde?.toLowerCase() === s.hex.toLowerCase()}
          />
        ))}
      </div>
    </Field>
  )
}

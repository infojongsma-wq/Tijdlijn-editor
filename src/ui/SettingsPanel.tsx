import type { AxisPosition, Settings, Theme, TimelineForm } from '../model/types'
import {
  ACHTERGRONDEN,
  PRESETS,
  SECUNDAIR,
  TEKSTKLEUREN,
  afgeleid,
  tekstVoor,
  type Swatch,
} from '../model/palette'
import { contrastRatio, contrastVerdict } from '../model/contrast'
import { Field, Segmented, Toggle } from './controls'

interface Props {
  settings: Settings
  theme: Theme
  onSettings: (patch: Partial<Settings>) => void
  onTheme: (patch: Partial<Theme>) => void
}

const VORMEN: { value: TimelineForm; label: string; title: string; klaar: boolean }[] = [
  { value: 'vertical', label: 'Verticaal', title: 'Kaarten duwen elkaar omhoog', klaar: true },
  { value: 'filmstrip', label: 'Filmstrip', title: 'Nog niet gebouwd', klaar: false },
  { value: 'duo', label: 'Duo-cards', title: 'Nog niet gebouwd', klaar: false },
  { value: 'magazine', label: 'Magazine', title: 'Nog niet gebouwd', klaar: false },
  { value: 'headlines', label: 'Headlines', title: 'Nog niet gebouwd', klaar: false },
  { value: 'horizontal', label: 'Horizontaal', title: 'Nog niet gebouwd', klaar: false },
]

const ASSEN: { value: AxisPosition; label: string; title: string }[] = [
  { value: 'left', label: 'Links', title: 'Verticale as links' },
  { value: 'right', label: 'Rechts', title: 'Verticale as rechts' },
  { value: 'top', label: 'Boven', title: 'Horizontale as bovenaan' },
  { value: 'bottom', label: 'Onder', title: 'Horizontale as onderaan' },
  { value: 'hidden', label: 'Verborgen', title: 'Geen as tonen' },
]

export function SettingsPanel({ settings, theme, onSettings, onTheme }: Props) {
  const tekstOordeel = contrastVerdict(contrastRatio(theme.text, theme.background))
  const accentOordeel = contrastVerdict(contrastRatio(theme.accent, theme.background))
  const extra = afgeleid(theme)

  return (
    <div className="settings">
      <section className="settings-block">
        <h3 className="panel-h3">Vorm</h3>
        <div className="vormgrid">
          {VORMEN.map((v) => (
            <button
              key={v.value}
              type="button"
              className={`vormbtn ${settings.form === v.value ? 'is-on' : ''} ${
                v.klaar ? '' : 'is-todo'
              }`}
              onClick={() => v.klaar && onSettings({ form: v.value })}
              disabled={!v.klaar}
              title={v.title}
              aria-pressed={settings.form === v.value}
            >
              {v.label}
              {!v.klaar && <span className="vormbtn-todo">later</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <h3 className="panel-h3">Navigatie</h3>

        <Field group label="Waar staat de tijdlijn">
          <Segmented
            label="Positie van de as"
            value={settings.axis}
            onChange={(v) => onSettings({ axis: v })}
            options={ASSEN}
          />
        </Field>

        <Field group label="Richting">
          <Segmented
            label="Sorteerrichting"
            value={settings.direction}
            onChange={(v) => onSettings({ direction: v })}
            options={[
              { value: 'asc', label: 'Vroeger → nu' },
              { value: 'desc', label: 'Nu → vroeger' },
            ]}
          />
        </Field>

        <div className="settings-toggles">
          <Toggle
            label="Voortgangsbalk"
            checked={settings.showProgress}
            onChange={(v) => onSettings({ showProgress: v })}
          />
          <Toggle
            label="Teller (3 / 8)"
            checked={settings.showCounter}
            onChange={(v) => onSettings({ showCounter: v })}
          />
          <Toggle
            label="Duw-overgang"
            checked={settings.pushTransition}
            onChange={(v) => onSettings({ pushTransition: v })}
          />
        </div>
        <p className="settings-note">
          De duw-overgang gaat vanzelf uit bij bezoekers die in hun systeem hebben
          aangegeven zo min mogelijk beweging te willen zien.
        </p>
      </section>

      <section className="settings-block">
        <h3 className="panel-h3">Kleuren</h3>

        <Field group label="Sjabloon">
          <div className="presetrij">
            {PRESETS.map((p) => {
              const actief =
                p.thema.background === theme.background &&
                p.thema.text === theme.text &&
                p.thema.accent === theme.accent
              return (
                <button
                  key={p.naam}
                  type="button"
                  className={`preset ${actief ? 'is-on' : ''}`}
                  onClick={() => onTheme({ ...p.thema })}
                  aria-pressed={actief}
                  style={{
                    background: p.thema.background,
                    color: p.thema.text,
                    borderColor: afgeleid(p.thema).axisLine,
                  }}
                >
                  <span className="preset-stip" style={{ background: p.thema.accent }} />
                  {p.naam}
                </button>
              )
            })}
          </div>
        </Field>

        <Stalen
          label="Achtergrond"
          waarde={theme.background}
          stalen={ACHTERGRONDEN}
          onKies={(hex) =>
            // De tekstkleur meeschakelen: een lichte achtergrond met witte tekst
            // is nooit de bedoeling, en handmatig nabijstellen is een extra stap
            // die niemand mist.
            onTheme({ background: hex, text: tekstVoor(hex) })
          }
        />

        <Stalen
          label="Tekst"
          waarde={theme.text}
          stalen={TEKSTKLEUREN}
          onKies={(hex) => onTheme({ text: hex })}
        />

        <Stalen
          label="Accent"
          hint="De stip bij de datum, de as en de voortgangsbalk."
          waarde={theme.accent}
          stalen={SECUNDAIR}
          onKies={(hex) => onTheme({ accent: hex })}
        />

        <div className="afgeleid">
          <span className="afgeleid-label">Hieruit berekend</span>
          <span className="afgeleid-staal" style={{ background: extra.textMuted }} title="Zachte tekst" />
          <span className="afgeleid-staal" style={{ background: extra.axisLine }} title="Lijn van de as" />
          <span className="afgeleid-tekst">zachte tekst en de lijn van de as</span>
        </div>

        <p className={`msg msg-${tekstOordeel.level === 'ok' ? 'info' : 'warn'}`}>
          Tekst op achtergrond: {tekstOordeel.text}
        </p>
        <p className={`msg msg-${accentOordeel.level === 'fail' ? 'warn' : 'info'}`}>
          Accent op achtergrond: {accentOordeel.text}
        </p>
      </section>
    </div>
  )
}

/** Een rij kleurstalen uit de huisstijl. Geen vrije kiezer: een tijdlijn hoort
 *  herkenbaar van RTV Oost te zijn. */
function Stalen({
  label,
  hint,
  waarde,
  stalen,
  onKies,
}: {
  label: string
  hint?: string
  waarde: string
  stalen: Swatch[]
  onKies: (hex: string) => void
}) {
  return (
    <Field group label={label} hint={hint}>
      <div className="stalen">
        {stalen.map((s) => (
          <button
            key={s.hex}
            type="button"
            className={`staal ${s.hex.toLowerCase() === waarde.toLowerCase() ? 'is-on' : ''}`}
            style={{ background: s.hex }}
            onClick={() => onKies(s.hex)}
            title={`${s.naam} · ${s.hex}`}
            aria-label={s.naam}
            aria-pressed={s.hex.toLowerCase() === waarde.toLowerCase()}
          />
        ))}
      </div>
    </Field>
  )
}

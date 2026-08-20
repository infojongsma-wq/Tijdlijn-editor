import type { AxisPosition, Settings, Theme, TimelineForm } from '../model/types'
import { OOST_THEME, OOST_THEME_LIGHT } from '../model/doc'
import { contrastRatio, contrastVerdict } from '../model/contrast'
import { Button, ColorInput, Field, Segmented, Toggle } from './controls'

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
  const tekstRatio = contrastRatio(theme.text, theme.background)
  const tekstOordeel = contrastVerdict(tekstRatio)
  const accentRatio = contrastRatio(theme.accent, theme.background)
  const accentOordeel = contrastVerdict(accentRatio)

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
        <div className="settings-presets">
          <Button onClick={() => onTheme({ ...OOST_THEME })}>Oost donker</Button>
          <Button onClick={() => onTheme({ ...OOST_THEME_LIGHT })}>Oost licht</Button>
        </div>

        <ColorInput
          label="Achtergrond"
          value={theme.background}
          onChange={(v) => onTheme({ background: v })}
        />
        <ColorInput label="Tekst" value={theme.text} onChange={(v) => onTheme({ text: v })} />
        <ColorInput
          label="Zachte tekst"
          value={theme.textMuted}
          onChange={(v) => onTheme({ textMuted: v })}
        />
        <ColorInput label="Accent" value={theme.accent} onChange={(v) => onTheme({ accent: v })} />
        <ColorInput
          label="Lijn van de as"
          value={theme.axisLine}
          onChange={(v) => onTheme({ axisLine: v })}
        />

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

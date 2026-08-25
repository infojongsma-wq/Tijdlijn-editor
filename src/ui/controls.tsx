import type { ReactNode } from 'react'

/** Gedeelde invoerelementen, zodat elk paneel er hetzelfde uitziet. */

export function Field({
  label,
  hint,
  group,
  children,
}: {
  label: string
  hint?: string
  /** Zet dit aan als de inhoud géén enkel invoerveld is, maar een groep — een
   *  rij keuzeknoppen of losse datumvakjes. Een <label> om knoppen heen zorgt
   *  namelijk dat een klik op de labeltekst de eerste knop indrukt, en dan
   *  verandert er ongemerkt een instelling. */
  group?: boolean
  children: ReactNode
}) {
  const inhoud = (
    <>
      <span className="fld-label">{label}</span>
      {children}
      {hint && <span className="fld-hint">{hint}</span>}
    </>
  )

  if (group) {
    return (
      <div className="fld" role="group" aria-label={label}>
        {inhoud}
      </div>
    )
  }
  return <label className="fld">{inhoud}</label>
}

export function TextInput({
  value,
  onChange,
  placeholder,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      className="inp"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function TextArea({
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      className="inp inp-area"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  placeholder,
  width,
  ariaLabel,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
  max?: number
  placeholder?: string
  width?: number
  /** Voor schermlezers; een placeholder als 'mm' is als enige naam dubbelzinnig. */
  ariaLabel?: string
}) {
  return (
    <input
      className="inp inp-num"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      style={width ? { width } : undefined}
      value={value === undefined ? '' : value}
      onChange={(e) => {
        const raw = e.target.value
        onChange(raw === '' ? undefined : Number(raw))
      }}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className="inp inp-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Rij knoppen waaruit je er één kiest. Sneller te overzien dan een uitklaplijst. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; title?: string }[]
  label: string
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg-btn ${o.value === value ? 'is-on' : ''}`}
          aria-pressed={o.value === value}
          title={o.title ?? o.label}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  reset,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
  reset: number
}) {
  const gewijzigd = Math.abs(value - reset) > 0.001
  return (
    <div className="sld">
      <div className="sld-top">
        <span className="sld-label">{label}</span>
        <span className="sld-value">
          {Math.round(value * (step < 1 ? 100 : 1)) / (step < 1 ? 100 : 1)}
          {suffix}
        </span>
        <button
          type="button"
          className="sld-reset"
          onClick={() => onChange(reset)}
          disabled={!gewijzigd}
          title="Terug naar origineel"
        >
          herstel
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="tgl">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl-box" aria-hidden="true" />
      <span>{label}</span>
    </label>
  )
}

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="clr">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="clr-label">{label}</span>
      <span className="clr-hex">{value.toUpperCase()}</span>
    </label>
  )
}

export function Button({
  children,
  onClick,
  variant = 'quiet',
  disabled,
  title,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'quiet' | 'danger'
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}

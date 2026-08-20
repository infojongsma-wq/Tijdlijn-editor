import type { AxisPosition, Theme } from '../model/types'
import { afgeleid } from '../model/palette'

interface Props {
  labels: string[]
  /** Doorlopende positie (3.4 = tussen kaart 3 en 4), zodat de as meebeweegt
   *  met de duw-overgang in plaats van te verspringen. */
  progress: number
  position: AxisPosition
  theme: Theme
  showProgress: boolean
  showCounter: boolean
  onJump: (index: number) => void
}

/** Boven dit aantal wordt het te druk om alle datums te tonen. */
const ALLE_LABELS_TOT = 12

export function Axis({
  labels,
  progress,
  position,
  theme,
  showProgress,
  showCounter,
  onJump,
}: Props) {
  if (position === 'hidden' || labels.length === 0) return null

  const horizontaal = position === 'top' || position === 'bottom'
  const actief = Math.round(progress)
  const alleLabels = labels.length <= ALLE_LABELS_TOT
  const extra = afgeleid(theme)
  const fractie = labels.length > 1 ? progress / (labels.length - 1) : 0

  return (
    <nav
      className={`ax ax-${position}`}
      style={{ ['--ax-line' as string]: extra.axisLine, ['--ax-accent' as string]: theme.accent }}
      aria-label="Tijdlijn"
    >
      {showCounter && (
        <p className="ax-counter" style={{ color: extra.textMuted }}>
          <span style={{ color: theme.text }}>{Math.min(actief + 1, labels.length)}</span>
          {' / '}
          {labels.length}
        </p>
      )}

      <div className="ax-track">
        <div className="ax-line" />
        {showProgress && (
          <div
            className="ax-fill"
            style={
              horizontaal
                ? { width: `${fractie * 100}%` }
                : { height: `${fractie * 100}%` }
            }
          />
        )}

        <ol className="ax-stops">
          {labels.map((label, i) => {
            const isActief = i === actief
            const toonLabel = alleLabels || isActief || i === 0 || i === labels.length - 1
            return (
              <li key={i} className={`ax-stop ${isActief ? 'is-active' : ''}`}>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  aria-current={isActief ? 'true' : undefined}
                  title={label}
                >
                  <span className="ax-hit" />
                  <span className="ax-dot" />
                  <span
                    className={`ax-label ${toonLabel ? '' : 'is-hidden'}`}
                    style={{ color: isActief ? theme.text : extra.textMuted }}
                  >
                    {label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

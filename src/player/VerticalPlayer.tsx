import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Card, Settings, Theme } from '../model/types'
import { rgba } from '../model/palette'
import { CardView } from './CardView'
import { Axis } from './Axis'

interface Props {
  cards: Card[]
  /** Labels voor de as, in dezelfde volgorde als `axisIndex` verwijst. */
  axisLabels: string[]
  /** Per kaart: de plek op de as, of -1 voor kaarten zonder punt (de titelkaart). */
  axisIndex: number[]
  /** Per kaart: of het tijdstip getoond moet worden. */
  showTime: boolean[]
  settings: Settings
  theme: Theme
  /** Selectie in de editor: hier springt de speler naartoe. */
  focusCardId?: string | null
}

const MemoCard = memo(CardView)

/**
 * Verticaal scrollen met een duw-overgang.
 *
 * De opzet: een scrollbaar vlak met een onzichtbare aanloopstrook die de lengte
 * bepaalt, en daarboven een vastgezet toneel waarop de kaarten staan. De
 * scrollpositie levert één getal op — 2,4 betekent "veertig procent onderweg van
 * kaart 3 naar kaart 4". Elke kaart wordt verschoven met (eigen index − dat
 * getal) × 100%. De vertrekkende kaart schuift omhoog het beeld uit terwijl de
 * volgende van onderen komt: precies de 'duwen'-overgang uit PowerPoint.
 *
 * Het scrollen zelf blijft van de browser. We onderscheppen het wiel niet, want
 * dat breekt zo ongeveer alles: toetsenbordbediening, schermlezers en het
 * gevoel dat je zelf de baas bent.
 */
export function VerticalPlayer({
  cards,
  axisLabels,
  axisIndex,
  showTime,
  settings,
  theme,
  focusCardId,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [hoogte, setHoogte] = useState(0)
  const [progress, setProgress] = useState(0)
  const [duwen, setDuwen] = useState(settings.pushTransition)

  const aantal = cards.length

  // Beweging uit? Dan geen duw-overgang, hoe de instelling ook staat.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const bijwerken = () => setDuwen(settings.pushTransition && !media.matches)
    bijwerken()
    media.addEventListener('change', bijwerken)
    return () => media.removeEventListener('change', bijwerken)
  }, [settings.pushTransition])

  // De hoogte van het vlak bepaalt zowel de aanloopstrook als de omrekening van
  // scrollpositie naar kaartnummer. Meten in plaats van 100vh gebruiken, want in
  // de voorvertoning zit de speler in een kader en op mobiel verspringt 100vh
  // zodra de adresbalk in- of uitschuift.
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setHoogte(entry.contentRect.height)
    })
    observer.observe(el)
    setHoogte(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || hoogte === 0) return

    let frame = 0
    const meten = () => {
      frame = 0
      const p = el.scrollTop / hoogte
      setProgress((vorige) => (Math.abs(vorige - p) < 0.001 ? vorige : p))
    }
    const opScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(meten)
    }

    el.addEventListener('scroll', opScroll, { passive: true })
    meten()
    return () => {
      el.removeEventListener('scroll', opScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [hoogte, aantal])

  const springNaar = useCallback(
    (kaartIndex: number) => {
      const el = scrollerRef.current
      if (!el || hoogte === 0) return
      const doel = Math.max(0, Math.min(aantal - 1, kaartIndex))
      el.scrollTo({ top: doel * hoogte, behavior: 'smooth' })
    },
    [hoogte, aantal],
  )

  // Kiest de redacteur links een moment, dan hoort de voorvertoning die kaart
  // te tonen — anders zit je blind te typen aan iets dat niet in beeld staat.
  const laatsteFocus = useRef<string | null>(null)
  useEffect(() => {
    if (!focusCardId || hoogte === 0) return
    if (laatsteFocus.current === focusCardId) return
    laatsteFocus.current = focusCardId
    const index = cards.findIndex((c) => c.id === focusCardId)
    if (index < 0) return
    const el = scrollerRef.current
    if (!el) return
    // Zonder vloeiend schuiven: bij het doorklikken door een lijst wil je er
    // meteen zijn, niet acht keer een animatie afwachten.
    el.scrollTo({ top: index * hoogte, behavior: 'auto' })
  }, [focusCardId, hoogte, cards])

  const opToets = useCallback(
    (e: React.KeyboardEvent) => {
      const huidig = Math.round(progress)
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          springNaar(huidig + 1)
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          springNaar(huidig - 1)
          break
        case 'Home':
          e.preventDefault()
          springNaar(0)
          break
        case 'End':
          e.preventDefault()
          springNaar(aantal - 1)
          break
      }
    },
    [progress, springNaar, aantal],
  )

  const huidig = Math.round(progress)

  // De as telt alleen kaarten met een datum; de titelkaart heeft geen stop en
  // staat als -1 in de lijst. Voor de balk rekenen we de doorlopende
  // kaartpositie om naar een doorlopende aspositie, zodat de balk meeloopt met
  // de duw-overgang in plaats van te verspringen. Kaarten zonder stop lenen de
  // stop van de eerstvolgende kaart die er wel een heeft.
  const asPositie = asPositieVoor(progress, axisIndex)

  return (
    <div
      className={`vp vp-axis-${settings.axis}`}
      style={{
        background: theme.background,
        color: theme.text,
        // De sluier over foto's krijgt de achtergrondkleur mee, zodat een
        // kleurwijziging meteen op élke kaart te zien is en niet alleen op
        // kaarten zonder beeld.
        ['--veil-1' as string]: rgba(theme.background, 0.86),
        ['--veil-2' as string]: rgba(theme.background, 0.6),
        ['--veil-3' as string]: rgba(theme.background, 0.12),
        ['--veil-4' as string]: rgba(theme.background, 0),
      }}
    >
      <div
        className="vp-scroller"
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label="Tijdlijn, scrol of gebruik de pijltjestoetsen"
        onKeyDown={opToets}
      >
        <div className="vp-stage" aria-live="polite">
          {cards.map((card, i) => {
            const afstand = i - progress
            const inBeeld = duwen ? Math.abs(afstand) < 1 : i === huidig
            return (
              <div
                key={card.id}
                className={`vp-slide ${inBeeld ? 'is-visible' : ''} ${duwen ? '' : 'is-fade'}`}
                style={duwen ? { transform: `translate3d(0, ${afstand * 100}%, 0)` } : undefined}
                aria-hidden={i === huidig ? undefined : true}
                inert={i === huidig ? undefined : ''}
              >
                <MemoCard card={card} theme={theme} showTime={showTime[i]} />
              </div>
            )
          })}
        </div>

        {/* Onzichtbare aanloopstrook: geeft het vlak zijn scrollengte. */}
        <div
          className="vp-runway"
          style={{ height: hoogte * Math.max(0, aantal - 1) }}
          aria-hidden="true"
        />
      </div>

      <Axis
        labels={axisLabels}
        progress={asPositie}
        position={settings.axis}
        theme={theme}
        showProgress={settings.showProgress}
        showCounter={settings.showCounter}
        onJump={(stop) => {
          // Zoeken in de ruwe lijst: de titelkaart staat daar als -1 en kan dus
          // niet per ongeluk als eerste stop worden aangewezen.
          const kaart = axisIndex.indexOf(stop)
          if (kaart >= 0) springNaar(kaart)
        }}
      />
    </div>
  )
}

/**
 * Doorlopende positie op de as, afgeleid van de doorlopende kaartpositie.
 *
 * Kaarten zonder eigen stop (de titelkaart) staan als -1 in de lijst; die
 * lenen de stop van de eerstvolgende kaart die er wel een heeft, of anders van
 * de vorige. Tussen twee kaarten wordt lineair gemengd, zodat de voortgangsbalk
 * meeschuift met de duw-overgang.
 */
function asPositieVoor(progress: number, axisIndex: number[]): number {
  if (axisIndex.length === 0) return 0

  const stopVan = (i: number): number => {
    const geklemd = Math.min(axisIndex.length - 1, Math.max(0, i))
    if (axisIndex[geklemd] >= 0) return axisIndex[geklemd]
    for (let j = geklemd + 1; j < axisIndex.length; j++) {
      if (axisIndex[j] >= 0) return axisIndex[j]
    }
    for (let j = geklemd - 1; j >= 0; j--) {
      if (axisIndex[j] >= 0) return axisIndex[j]
    }
    return 0
  }

  const onder = Math.floor(progress)
  const fractie = progress - onder
  const a = stopVan(onder)
  const b = stopVan(onder + 1)
  return a + (b - a) * Math.min(1, Math.max(0, fractie))
}

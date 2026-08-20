import { useMemo } from 'react'
import type { TimelineDoc } from '../model/types'
import { orderedCards } from '../model/doc'
import { axisLabels as maakAsLabels, sameDay } from '../model/dates'
import { VerticalPlayer } from './VerticalPlayer'
import '../styles/player.css'

interface Props {
  doc: TimelineDoc
}

/**
 * De speler: leest een document en speelt het af.
 *
 * Hier wordt per vorm de juiste weergave gekozen. In deze fase is alleen
 * verticaal scrollen af; de overige vijf vormen krijgen dezelfde kaarten en
 * dezelfde as, maar een andere opmaak eromheen.
 */
export function Player({ doc }: Props) {
  const { cards, asLabels, asIndex, showTime } = useMemo(() => {
    const gesorteerd = orderedCards(doc)

    // De as toont alleen echte momenten. De titelkaart is de opening van het
    // verhaal, geen punt in de tijd.
    const opAs = gesorteerd.filter((c) => c.type !== 'title')
    const labels = maakAsLabels(opAs.map((c) => c.date))

    const index = gesorteerd.map((kaart) =>
      kaart.type === 'title' ? -1 : opAs.indexOf(kaart),
    )

    // Een tijdstip tonen we alleen als het onderscheid maakt: bij twee momenten
    // op dezelfde dag. Kaart en as vertellen zo hetzelfde verhaal.
    const tijden = gesorteerd.map((kaart) => {
      if (kaart.type === 'title' || kaart.date.precision !== 'minute') return false
      return opAs.some((andere) => andere !== kaart && sameDay(andere.date, kaart.date))
    })

    return { cards: gesorteerd, asLabels: labels, asIndex: index, showTime: tijden }
  }, [doc])

  if (cards.length === 0) {
    return (
      <div
        className="vp vp-empty"
        style={{ background: doc.theme.background, color: doc.theme.textMuted }}
      >
        <p>Nog geen kaarten. Voeg links een moment toe.</p>
      </div>
    )
  }

  switch (doc.settings.form) {
    case 'vertical':
    default:
      return (
        <VerticalPlayer
          cards={cards}
          axisLabels={asLabels}
          axisIndex={asIndex}
          showTime={showTime}
          settings={doc.settings}
          theme={doc.theme}
        />
      )
  }
}

import { useEffect, useState } from 'react'
import type { TimelineDoc } from '../model/types'
import { Player } from '../player/Player'
import { Button, Segmented } from './controls'

type Formaat = 'desktop' | 'tablet' | 'mobiel'

/** Breedtes waarop we toetsen. Niet willekeurig: 390 is een gangbare telefoon,
 *  834 een liggende tablet. De speler gebruikt containervragen, dus het kader
 *  bepaalt de opmaak — precies zoals in een echte iframe. */
const MATEN: Record<Formaat, { breedte: number | null; hoogte: number | null }> = {
  desktop: { breedte: null, hoogte: null },
  tablet: { breedte: 834, hoogte: 560 },
  mobiel: { breedte: 390, hoogte: 680 },
}

interface Props {
  doc: TimelineDoc
  focusCardId: string | null
}

export function Preview({ doc, focusCardId }: Props) {
  const [formaat, setFormaat] = useState<Formaat>('desktop')
  const [volledig, setVolledig] = useState(false)
  const maat = MATEN[formaat]

  // Escape sluit de volledige weergave. Zonder dat zit je vast als de knop
  // wegvalt achter de tijdlijn.
  useEffect(() => {
    if (!volledig) return
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVolledig(false)
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [volledig])

  return (
    <div className="preview">
      <div className="preview-bar">
        <Segmented
          label="Schermformaat"
          value={formaat}
          onChange={setFormaat}
          options={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'mobiel', label: 'Mobiel' },
          ]}
        />
        <Button
          onClick={() => setVolledig(true)}
          variant="primary"
          title="Bekijk de tijdlijn zoals het publiek hem straks ziet"
        >
          Bekijken
        </Button>
      </div>

      <div className={`preview-stage is-${formaat}`}>
        <div
          className="preview-frame"
          style={
            maat.breedte
              ? { width: maat.breedte, height: maat.hoogte ?? undefined, maxWidth: '100%' }
              : undefined
          }
        >
          <Player doc={doc} focusCardId={focusCardId} />
        </div>
      </div>

      {volledig && (
        <div className="volledig" role="dialog" aria-modal="true" aria-label="Voorvertoning">
          <div className="volledig-bar">
            <span className="volledig-naam">{doc.name}</span>
            <span className="volledig-hint">Zo ziet het publiek de tijdlijn</span>
            <Button onClick={() => setVolledig(false)} title="Sluiten (Esc)">
              Sluiten
            </Button>
          </div>
          <div className="volledig-speler">
            {/* Zonder focusCardId: in de voorvertoning begin je bij het begin,
                niet bij de kaart die je toevallig aan het bewerken was. */}
            <Player doc={doc} />
          </div>
        </div>
      )}
    </div>
  )
}

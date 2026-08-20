import { useState } from 'react'
import type { TimelineDoc } from '../model/types'
import { Player } from '../player/Player'
import { Segmented } from './controls'

type Formaat = 'desktop' | 'tablet' | 'mobiel'

/** Breedtes waarop we toetsen. Niet willekeurig: 390 is een gangbare telefoon,
 *  834 een liggende tablet. De speler zelf gebruikt containervragen, dus het
 *  kader bepaalt de opmaak — precies zoals in een echte iframe. */
const MATEN: Record<Formaat, { breedte: number | null; hoogte: number | null }> = {
  desktop: { breedte: null, hoogte: null },
  tablet: { breedte: 834, hoogte: 620 },
  mobiel: { breedte: 390, hoogte: 720 },
}

export function Preview({ doc }: { doc: TimelineDoc }) {
  const [formaat, setFormaat] = useState<Formaat>('desktop')
  const maat = MATEN[formaat]

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
        <span className="preview-hint">
          Scrol in het kader, of gebruik de pijltjestoetsen
        </span>
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
          <Player doc={doc} />
        </div>
      </div>
    </div>
  )
}

import type { Card, TimelineDoc } from '../model/types'
import { formatShort } from '../model/dates'
import { cardTypeLabel, orderedCards } from '../model/doc'
import { Button } from './controls'

interface Props {
  doc: TimelineDoc
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

/**
 * De momenten in vertelvolgorde.
 *
 * Er is bewust geen sleepvolgorde: de datum bepaalt de plek. Wie iets wil
 * verplaatsen, verandert de datum — dat houdt tijdlijn en werkelijkheid gelijk.
 */
export function CardList({ doc, selectedId, onSelect, onAdd, onDelete }: Props) {
  const kaarten = orderedCards(doc)

  return (
    <div className="cardlist">
      <div className="cardlist-head">
        <h2 className="panel-h2">Momenten</h2>
        <span className="cardlist-count">{kaarten.length}</span>
      </div>

      <ol className="cardlist-items">
        {kaarten.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              className={`cli ${card.id === selectedId ? 'is-selected' : ''}`}
              onClick={() => onSelect(card.id)}
              aria-current={card.id === selectedId ? 'true' : undefined}
            >
              <span className="cli-thumb">
                {card.media ? (
                  <img src={card.media.src} alt="" />
                ) : (
                  <span className="cli-thumb-empty" aria-hidden="true" />
                )}
              </span>
              <span className="cli-text">
                <span className="cli-date">
                  {card.type === 'title' ? 'Opening' : formatShort(card.date)}
                  <span className="cli-type">{cardTypeLabel(card.type)}</span>
                </span>
                <span className="cli-title">{card.title || <em>Nog geen kop</em>}</span>
              </span>
            </button>
            <button
              type="button"
              className="cli-del"
              onClick={() => onDelete(card.id)}
              title={`Verwijder: ${card.title || 'naamloze kaart'}`}
              aria-label={`Verwijder ${card.title || 'naamloze kaart'}`}
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      {kaarten.length === 0 && (
        <p className="cardlist-empty">
          Nog leeg. Voeg een moment toe, of laad het voorbeelddossier via het menu
          bovenin.
        </p>
      )}

      <div className="cardlist-foot">
        <Button onClick={onAdd} variant="primary">
          + Moment toevoegen
        </Button>
      </div>
    </div>
  )
}

export function cardSummary(card: Card): string {
  return card.title || cardTypeLabel(card.type)
}

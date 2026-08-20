import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card, Settings, Theme, TimelineDoc } from './model/types'
import { emptyCard, emptyDoc, orderedCards } from './model/doc'
import { useHistory, MAX_STEPS } from './model/history'
import { autosave, clearAutosave, loadAutosave, openFromFile, saveToFile } from './model/storage'
import { demoDoc } from './model/demo'
import { CardList } from './ui/CardList'
import { CardForm } from './ui/CardForm'
import { SettingsPanel } from './ui/SettingsPanel'
import { Preview } from './ui/Preview'
import { Button } from './ui/controls'
import './styles/app.css'

type Tab = 'moment' | 'instellingen'

export function App() {
  const bewaard = useRef(loadAutosave()).current
  const history = useHistory<TimelineDoc>(bewaard ?? emptyDoc())
  const doc = history.value

  const [selectedId, setSelectedId] = useState<string | null>(
    () => (bewaard?.cards[0]?.id ?? null),
  )
  const [tab, setTab] = useState<Tab>('moment')
  const [melding, setMelding] = useState<string | null>(null)
  const bestandRef = useRef<HTMLInputElement>(null)
  // Eén melding over mislukt bewaren is genoeg; hem elke wijziging herhalen
  // maakt de editor onbruikbaar.
  const opslagGemeld = useRef(false)
  const opruimen = useRef<(() => void) | null>(null)

  // Tussentijds bewaren, maar niet bij elke toetsaanslag: het document bevat de
  // foto's als tekst, dus het omzetten kost bij een vol dossier al gauw een paar
  // megabyte werk. Ruim wachten en het dan in een rustig moment doen houdt het
  // typen soepel. Mislukt het, dan melden we het één keer en blijven we het niet
  // elke ronde herhalen.
  useEffect(() => {
    const bewaar = () => {
      const resultaat = autosave(doc)
      if (resultaat.ok) {
        opslagGemeld.current = false
      } else if (!opslagGemeld.current) {
        opslagGemeld.current = true
        setMelding(resultaat.reason)
      }
    }

    const timer = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        const idle = requestIdleCallback(bewaar, { timeout: 2000 })
        opruimen.current = () => cancelIdleCallback(idle)
      } else {
        bewaar()
      }
    }, 1500)

    return () => {
      clearTimeout(timer)
      opruimen.current?.()
      opruimen.current = null
    }
  }, [doc])

  const selected =
    doc.cards.find((c) => c.id === selectedId) ?? orderedCards(doc)[0] ?? null

  const patchCard = useCallback(
    (patch: Partial<Card>, label?: string) => {
      if (!selected) return
      history.set(
        (huidig) => ({
          ...huidig,
          cards: huidig.cards.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)),
        }),
        label ? `${selected.id}:${label}` : undefined,
      )
    },
    [history, selected],
  )

  const voegToe = useCallback(() => {
    const kaart = emptyCard(doc.cards.length === 0 ? 'title' : 'image-text')
    history.set((huidig) => ({ ...huidig, cards: [...huidig.cards, kaart] }))
    setSelectedId(kaart.id)
    setTab('moment')
  }, [history, doc.cards.length])

  const verwijder = useCallback(
    (id: string) => {
      const kaart = doc.cards.find((c) => c.id === id)
      const naam = kaart?.title?.trim()
      const zeker = window.confirm(
        naam
          ? `"${naam}" verwijderen?\n\nJe kunt dit ongedaan maken met Ctrl+Z.`
          : 'Deze kaart verwijderen?\n\nJe kunt dit ongedaan maken met Ctrl+Z.',
      )
      if (!zeker) return
      history.set((huidig) => ({ ...huidig, cards: huidig.cards.filter((c) => c.id !== id) }))
      if (selectedId === id) setSelectedId(null)
    },
    [history, doc.cards, selectedId],
  )

  const patchSettings = useCallback(
    (patch: Partial<Settings>) =>
      history.set((huidig) => ({ ...huidig, settings: { ...huidig.settings, ...patch } })),
    [history],
  )

  const patchTheme = useCallback(
    (patch: Partial<Theme>) =>
      history.set((huidig) => ({ ...huidig, theme: { ...huidig.theme, ...patch } }), 'kleur'),
    [history],
  )

  const nieuw = useCallback(() => {
    if (doc.cards.length > 0 && !window.confirm('Nieuwe tijdlijn beginnen? Niet-opgeslagen werk gaat verloren.')) {
      return
    }
    clearAutosave()
    history.reset(emptyDoc())
    setSelectedId(null)
    setMelding(null)
  }, [history, doc.cards.length])

  const laadVoorbeeld = useCallback(() => {
    if (doc.cards.length > 0 && !window.confirm('Het voorbeelddossier laden? Je huidige tijdlijn wordt vervangen.')) {
      return
    }
    const voorbeeld = demoDoc()
    history.reset(voorbeeld)
    setSelectedId(voorbeeld.cards[0]?.id ?? null)
    setMelding(null)
  }, [history, doc.cards.length])

  const open = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        const geladen = await openFromFile(file)
        history.reset(geladen)
        setSelectedId(geladen.cards[0]?.id ?? null)
        setMelding(null)
      } catch (e) {
        setMelding(e instanceof Error ? e.message : 'Dit bestand kon niet geopend worden.')
      } finally {
        if (bestandRef.current) bestandRef.current.value = ''
      }
    },
    [history],
  )

  // Sneltoetsen. Niet onderscheppen terwijl iemand in een tekstveld typt —
  // daar heeft de browser zijn eigen ongedaan-maken.
  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const doel = e.target as HTMLElement | null
      const inVeld =
        doel?.tagName === 'INPUT' || doel?.tagName === 'TEXTAREA' || doel?.isContentEditable
      if (e.key.toLowerCase() === 'z' && !inVeld) {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveToFile(doc)
      }
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [history, doc])

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand" aria-label="RTV Oost">
          oost
        </span>
        <input
          className="docname"
          value={doc.name}
          aria-label="Naam van de tijdlijn"
          onChange={(e) =>
            history.set((huidig) => ({ ...huidig, name: e.target.value }), 'naam')
          }
        />

        <div className="topbar-group">
          <Button onClick={history.undo} disabled={!history.canUndo} title={`Ongedaan maken (tot ${MAX_STEPS} stappen) — Ctrl+Z`}>
            ↩ Ongedaan
          </Button>
          <Button onClick={history.redo} disabled={!history.canRedo} title="Opnieuw — Ctrl+Shift+Z">
            ↪ Opnieuw
          </Button>
        </div>

        <div className="topbar-group topbar-right">
          <Button onClick={laadVoorbeeld} title="Vult de editor met het wolvendossier">
            Voorbeeld
          </Button>
          <Button onClick={nieuw}>Nieuw</Button>
          <Button onClick={() => bestandRef.current?.click()}>Openen</Button>
          <Button onClick={() => void saveToFile(doc)} variant="primary" title="Ctrl+S">
            Opslaan
          </Button>
          <input
            ref={bestandRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => void open(e.target.files?.[0])}
          />
        </div>
      </header>

      {melding && (
        <div className="banner" role="status">
          <span>{melding}</span>
          <button type="button" onClick={() => setMelding(null)} aria-label="Melding sluiten">
            ×
          </button>
        </div>
      )}

      <div className="workspace">
        <aside className="panel panel-left">
          <CardList
            doc={doc}
            selectedId={selected?.id ?? null}
            onSelect={(id) => {
              setSelectedId(id)
              setTab('moment')
            }}
            onAdd={voegToe}
            onDelete={verwijder}
          />
        </aside>

        <main className="stage">
          <Preview doc={doc} focusCardId={selected?.id ?? null} />
        </main>

        <aside className="panel panel-right">
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'moment'}
              className={tab === 'moment' ? 'is-on' : ''}
              onClick={() => setTab('moment')}
            >
              Dit moment
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'instellingen'}
              className={tab === 'instellingen' ? 'is-on' : ''}
              onClick={() => setTab('instellingen')}
            >
              Vormgeving
            </button>
          </div>

          <div className="panel-scroll">
            {tab === 'moment' ? (
              selected ? (
                // De sleutel dwingt een verse invulling af bij het wisselen van
                // kaart. Zonder dat blijven meldingen over een foto van de vorige
                // kaart staan bij de volgende.
                <CardForm key={selected.id} card={selected} onChange={patchCard} />
              ) : (
                <p className="panel-empty">
                  Kies links een moment, of voeg er een toe.
                </p>
              )
            ) : (
              <SettingsPanel
                settings={doc.settings}
                theme={doc.theme}
                onSettings={patchSettings}
                onTheme={patchTheme}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

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
import { Player } from './player/Player'
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
  const [bekijk, setBekijk] = useState(false)
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
      // Een patch die niets verandert — de blur van een tekstveld, een klik op
      // een al gekozen optie — hoort geen geschiedenis-stap te worden: die
      // stap is leeg én gooit de redo-stapel weg.
      if (Object.keys(patch).every((k) => Object.is(patch[k as keyof Card], selected[k as keyof Card]))) {
        return
      }
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
    (patch: Partial<Settings>) => {
      if (Object.keys(patch).every((k) => Object.is(patch[k as keyof Settings], doc.settings[k as keyof Settings]))) {
        return
      }
      history.set((huidig) => ({ ...huidig, settings: { ...huidig.settings, ...patch } }))
    },
    [history, doc.settings],
  )

  const patchTheme = useCallback(
    (patch: Partial<Theme>) => {
      if (Object.keys(patch).every((k) => Object.is(patch[k as keyof Theme], doc.theme[k as keyof Theme]))) {
        return
      }
      // Label per veld: schuiven binnen één kleur voegt samen, maar een
      // wijziging van accent en daarna achtergrond blijven aparte stappen.
      history.set(
        (huidig) => ({ ...huidig, theme: { ...huidig.theme, ...patch } }),
        `kleur:${Object.keys(patch).sort().join(',')}`,
      )
    },
    [history, doc.theme],
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

  const volledigRef = useRef<HTMLDivElement>(null)
  const bekijkKnopRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!bekijk) return
    // Focus de dialoog in, houd Tab erbinnen, en geef de focus bij het sluiten
    // terug aan de knop die hem opende — anders belandt een toetsenbord-
    // gebruiker na Escape ergens onderin de pagina.
    volledigRef.current?.focus()
    const opToets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBekijk(false)
        return
      }
      if (e.key !== 'Tab') return
      const dialoog = volledigRef.current
      if (!dialoog) return
      const focusbaar = dialoog.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusbaar.length === 0) return
      const eerste = focusbaar[0]
      const laatste = focusbaar[focusbaar.length - 1]
      const actief = document.activeElement
      if (e.shiftKey && (actief === eerste || actief === dialoog)) {
        e.preventDefault()
        laatste.focus()
      } else if (!e.shiftKey && actief === laatste) {
        e.preventDefault()
        eerste.focus()
      }
    }
    window.addEventListener('keydown', opToets)
    return () => {
      window.removeEventListener('keydown', opToets)
      bekijkKnopRef.current?.focus()
    }
  }, [bekijk])

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
          <button
            type="button"
            className="btn btn-primary"
            ref={bekijkKnopRef}
            onClick={() => setBekijk(true)}
            title="De hele tijdlijn schermvullend, zoals het publiek hem ziet"
          >
            ▶ Bekijken
          </button>
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

      {bekijk && (
        <div
          className="volledig"
          role="dialog"
          aria-modal="true"
          aria-label="Voorvertoning"
          ref={volledigRef}
          tabIndex={-1}
        >
          <div className="volledig-bar">
            <span className="volledig-naam">{doc.name}</span>
            <span className="volledig-hint">Zo ziet het publiek de tijdlijn — Esc om te sluiten</span>
            <Button onClick={() => setBekijk(false)} title="Sluiten (Esc)">
              Sluiten
            </Button>
          </div>
          <div className="volledig-speler">
            {/* Zonder focusCardId: hier begin je bij het begin van het verhaal,
                niet bij de kaart die je toevallig aan het bewerken was. */}
            <Player doc={doc} />
          </div>
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
          {/* Bewust géén role=tablist: zonder tabpanel-koppeling en
              pijltjesbediening belooft dat patroon meer dan het waarmaakt. */}
          <div className="tabs" role="group" aria-label="Paneelkeuze">
            <button
              type="button"
              aria-pressed={tab === 'moment'}
              className={tab === 'moment' ? 'is-on' : ''}
              onClick={() => setTab('moment')}
            >
              Dit moment
            </button>
            <button
              type="button"
              aria-pressed={tab === 'instellingen'}
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

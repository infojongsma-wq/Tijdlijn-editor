import { useCallback, useEffect, useRef } from 'react'
import { LICHT_CLASS, sanitizeRich } from '../model/richtext'
import { SECUNDAIR } from '../model/palette'

interface Props {
  value: string
  onChange: (html: string) => void
  rows?: number
  placeholder?: string
  ariaLabel: string
}

/**
 * Tekstveld met opmaak: vet, cursief, dun en een kleuraccent op losse woorden.
 *
 * Het veld is bewust niet aangestuurd vanuit React: bij elke toetsaanslag de
 * inhoud terugschrijven zou de cursor telkens naar het einde gooien. In plaats
 * daarvan zetten we de inhoud alleen als die van buitenaf verandert terwijl er
 * niet in getypt wordt — bij het wisselen van kaart of na ongedaan maken.
 */
export function RichText({ value, onChange, rows = 6, placeholder, ariaLabel }: Props) {
  const veldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = veldRef.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.innerHTML !== value) el.innerHTML = value
  }, [value])

  const meld = useCallback(() => {
    const el = veldRef.current
    if (!el) return
    const schoon = sanitizeRich(el.innerHTML)
    onChange(schoon)
  }, [onChange])

  /** Zet de selectie in een omhulsel. Voor vet en cursief kan de browser dit
   *  zelf; voor dun en kleur bestaat geen ingebouwde opdracht. */
  const omhul = useCallback(
    (maak: () => HTMLElement) => {
      const el = veldRef.current
      const selectie = window.getSelection()
      if (!el || !selectie || selectie.rangeCount === 0) return

      const bereik = selectie.getRangeAt(0)
      if (bereik.collapsed) return
      if (!el.contains(bereik.commonAncestorContainer)) return

      const omhulsel = maak()
      omhulsel.appendChild(bereik.extractContents())
      bereik.insertNode(omhulsel)

      // De selectie over het nieuwe stuk laten staan, zodat je meteen nog een
      // opmaak kunt stapelen.
      selectie.removeAllRanges()
      const nieuw = document.createRange()
      nieuw.selectNodeContents(omhulsel)
      selectie.addRange(nieuw)

      meld()
    },
    [meld],
  )

  const opdracht = useCallback(
    (naam: 'bold' | 'italic') => {
      veldRef.current?.focus()
      document.execCommand(naam)
      meld()
    },
    [meld],
  )

  const wisKleur = useCallback(() => {
    const el = veldRef.current
    const selectie = window.getSelection()
    if (!el || !selectie || selectie.rangeCount === 0) return
    const bereik = selectie.getRangeAt(0)

    // Alle gekleurde omhulsels binnen de selectie ontdoen van hun kleur.
    el.querySelectorAll('span[data-kleur], span.' + LICHT_CLASS).forEach((span) => {
      if (!bereik.intersectsNode(span)) return
      const ouder = span.parentNode
      if (!ouder) return
      while (span.firstChild) ouder.insertBefore(span.firstChild, span)
      ouder.removeChild(span)
    })
    meld()
  }, [meld])

  return (
    <div className="rt">
      <div className="rt-bar" role="toolbar" aria-label="Tekstopmaak">
        <button type="button" className="rt-btn rt-bold" onClick={() => opdracht('bold')} title="Vet (Ctrl+B)">
          B
        </button>
        <button type="button" className="rt-btn rt-ital" onClick={() => opdracht('italic')} title="Cursief (Ctrl+I)">
          I
        </button>
        <button
          type="button"
          className="rt-btn rt-light"
          title="Dun"
          onClick={() =>
            omhul(() => {
              const span = document.createElement('span')
              span.className = LICHT_CLASS
              return span
            })
          }
        >
          L
        </button>

        <span className="rt-sep" aria-hidden="true" />

        {SECUNDAIR.map((s) => {
          const sleutel = s.naam.replace('Oost ', '').toLowerCase()
          return (
            <button
              key={sleutel}
              type="button"
              className="rt-kleur"
              style={{ background: s.hex }}
              title={`Uitlichten in ${s.naam}`}
              aria-label={`Uitlichten in ${s.naam}`}
              onClick={() =>
                omhul(() => {
                  const span = document.createElement('span')
                  span.setAttribute('data-kleur', sleutel)
                  return span
                })
              }
            />
          )
        })}

        <button type="button" className="rt-btn rt-wis" onClick={wisKleur} title="Opmaak weghalen">
          ⌫
        </button>
      </div>

      <div
        ref={veldRef}
        className="inp inp-area rt-veld"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        style={{ minHeight: rows * 22 }}
        onInput={meld}
        onBlur={meld}
        onPaste={(e) => {
          // Uit Word of een website komt een berg opmaak mee. Alleen de tekst
          // overnemen; opmaken doe je hier met de knoppen.
          e.preventDefault()
          const tekst = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, tekst)
        }}
      />
    </div>
  )
}

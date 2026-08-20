import { useCallback, useRef, useState } from 'react'
import { DEFAULT_ADJUST, type Annotation, type Media } from '../model/types'
import {
  ACCEPTED,
  dataUrlBytes,
  formatBytes,
  importIcon,
  importImage,
  type ImageWarning,
} from '../model/image'
import { newId } from '../model/doc'
import { Button, Field, Slider, TextArea, TextInput, Toggle } from './controls'

interface Props {
  media: Media | null
  onChange: (media: Media | null, label?: string) => void
  /** Bij een grafiek wordt niets bijgesneden, dus brandpunt en zoom hebben
   *  daar geen betekenis. */
  cropped: boolean
}

/** Verhouding van een staand telefoonscherm, voor de uitsnede-hulplijn. */
const MOBIEL = 9 / 16

/** Hoogte waarop het voorbeeldkader wordt afgetopt. */
const MAX_PREVIEW_HOOGTE = 240

export function ImageField({ media, onChange, cropped }: Props) {
  const [bezig, setBezig] = useState(false)
  const [meldingen, setMeldingen] = useState<ImageWarning[]>([])
  const [fout, setFout] = useState<string | null>(null)
  const [toonUitsnede, setToonUitsnede] = useState(false)
  const [actieveAanwijzer, setActieveAanwijzer] = useState<string | null>(null)
  const invoerRef = useRef<HTMLInputElement>(null)

  const kies = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setFout(null)
      setBezig(true)
      try {
        const resultaat = await importImage(file)
        // Bijschrift, rechten, alt en aanwijzers overnemen als er al iets stond:
        // je vervangt meestal de foto, niet de verantwoording eromheen.
        if (media) {
          resultaat.media.alt = media.alt
          resultaat.media.caption = media.caption
          resultaat.media.credit = media.credit
          resultaat.media.adjust = { ...media.adjust }
          resultaat.media.annotations = media.annotations
        }
        setMeldingen(resultaat.warnings)
        onChange(resultaat.media, 'beeld')
      } catch (e) {
        setFout(e instanceof Error ? e.message : 'Deze afbeelding kon niet worden geladen.')
      } finally {
        setBezig(false)
        if (invoerRef.current) invoerRef.current.value = ''
      }
    },
    [media, onChange],
  )

  const pasAan = useCallback(
    (patch: Partial<Media['adjust']>, label: string) => {
      if (!media) return
      onChange({ ...media, adjust: { ...media.adjust, ...patch } }, label)
    },
    [media, onChange],
  )

  const zetAanwijzers = useCallback(
    (annotations: Annotation[], label: string) => {
      if (!media) return
      onChange({ ...media, annotations }, label)
    },
    [media, onChange],
  )

  if (!media) {
    return (
      <div
        className={`imgdrop ${bezig ? 'is-busy' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void kies(e.dataTransfer.files[0])
        }}
      >
        <p className="imgdrop-title">Sleep een foto hierheen</p>
        <p className="imgdrop-sub">JPEG, PNG, WebP, GIF of SVG</p>
        <Button onClick={() => invoerRef.current?.click()} variant="primary">
          {bezig ? 'Bezig…' : 'Kies een bestand'}
        </Button>
        <input
          ref={invoerRef}
          type="file"
          accept={ACCEPTED}
          hidden
          onChange={(e) => void kies(e.target.files?.[0])}
        />
        {fout && <p className="msg msg-error">{fout}</p>}
      </div>
    )
  }

  const gewicht = dataUrlBytes(media.src)

  return (
    <div className="imgfield">
      <FocalPicker
        media={media}
        interactief={cropped}
        toonUitsnede={cropped && toonUitsnede}
        actieveAanwijzer={actieveAanwijzer}
        onFocal={(x, y) => pasAan({ focalX: x, focalY: y }, 'brandpunt')}
        onAanwijzer={(id, x, y) => {
          setActieveAanwijzer(id)
          zetAanwijzers(
            media.annotations.map((a) => (a.id === id ? { ...a, x, y } : a)),
            `aanwijzer:${id}`,
          )
        }}
        onBallon={(id, bx, by) => {
          setActieveAanwijzer(id)
          zetAanwijzers(
            media.annotations.map((a) => (a.id === id ? { ...a, bx, by } : a)),
            `ballon:${id}`,
          )
        }}
      />

      <div className="imgfield-bar">
        <span className="imgfield-info">
          {media.width}×{media.height}
          {gewicht > 0 && ` · ${formatBytes(gewicht)}`}
        </span>
        <div className="imgfield-actions">
          {cropped && (
            <Button
              onClick={() => setToonUitsnede((v) => !v)}
              title="Toont wat er op een staand telefoonscherm overblijft"
            >
              {toonUitsnede ? 'Verberg uitsnede' : 'Uitsnede mobiel'}
            </Button>
          )}
          <Button onClick={() => invoerRef.current?.click()}>Vervang</Button>
          <Button onClick={() => onChange(null, 'beeld')} variant="danger">
            Verwijder
          </Button>
        </div>
        <input
          ref={invoerRef}
          type="file"
          accept={ACCEPTED}
          hidden
          onChange={(e) => void kies(e.target.files?.[0])}
        />
      </div>

      {meldingen.map((m, i) => (
        <p key={i} className={`msg ${m.level === 'warn' ? 'msg-warn' : 'msg-info'}`}>
          {m.text}
        </p>
      ))}
      {fout && <p className="msg msg-error">{fout}</p>}

      <Aanwijzers
        annotations={media.annotations}
        actief={actieveAanwijzer}
        onActief={setActieveAanwijzer}
        onWijzig={zetAanwijzers}
      />

      <div className="imgfield-sliders">
        {cropped && (
          <Slider
            label="Inzoomen"
            value={media.adjust.zoom}
            onChange={(v) => pasAan({ zoom: v }, 'zoom')}
            min={1}
            max={2.5}
            step={0.01}
            suffix="×"
            reset={DEFAULT_ADJUST.zoom}
          />
        )}
        <Slider
          label="Doorzichtigheid"
          value={media.adjust.opacity}
          onChange={(v) => pasAan({ opacity: v }, 'doorzicht')}
          min={0.15}
          max={1}
          step={0.01}
          reset={DEFAULT_ADJUST.opacity}
        />
        <Slider
          label="Belichting"
          value={media.adjust.brightness}
          onChange={(v) => pasAan({ brightness: v }, 'belichting')}
          min={40}
          max={180}
          suffix="%"
          reset={DEFAULT_ADJUST.brightness}
        />
        <Slider
          label="Contrast"
          value={media.adjust.contrast}
          onChange={(v) => pasAan({ contrast: v }, 'contrast')}
          min={40}
          max={200}
          suffix="%"
          reset={DEFAULT_ADJUST.contrast}
        />
        <Slider
          label="Verzadiging"
          value={media.adjust.saturation}
          onChange={(v) => pasAan({ saturation: v }, 'verzadiging')}
          min={0}
          max={200}
          suffix="%"
          reset={DEFAULT_ADJUST.saturation}
        />
      </div>

      <Field
        label="Alternatieve tekst"
        hint="Wat is er te zien? Nodig voor wie de foto niet kan zien."
      >
        <TextArea
          value={media.alt}
          rows={2}
          placeholder="Een wolf staat in het hoge gras en kijkt in de camera."
          onChange={(v) => onChange({ ...media, alt: v }, 'alt')}
        />
      </Field>

      <div className="row2">
        <Field label="Bijschrift">
          <TextInput
            value={media.caption}
            placeholder="Wolf gesignaleerd in Borne."
            onChange={(v) => onChange({ ...media, caption: v }, 'bijschrift')}
          />
        </Field>
        <Field label="Rechten" hint="Los veld — plakt nooit meer aan het bijschrift vast.">
          <TextInput
            value={media.credit}
            placeholder="Getty Images"
            onChange={(v) => onChange({ ...media, credit: v }, 'rechten')}
          />
        </Field>
      </div>

      {!media.alt.trim() && (
        <p className="msg msg-warn">
          Nog geen alternatieve tekst. Zonder die tekst is de foto onzichtbaar voor
          mensen met een schermlezer.
        </p>
      )}
    </div>
  )
}

/**
 * De lijst met tekstballonnen bij deze foto.
 *
 * Ditzelfde mechanisme dient straks voor een aanklikbare kaart van Overijssel en
 * voor toelichtingen op een grafiek: het is steeds een punt met inhoud eraan.
 */
function Aanwijzers({
  annotations,
  actief,
  onActief,
  onWijzig,
}: {
  annotations: Annotation[]
  actief: string | null
  onActief: (id: string | null) => void
  onWijzig: (a: Annotation[], label: string) => void
}) {
  const pictoRef = useRef<HTMLInputElement>(null)
  const pictoVoor = useRef<string | null>(null)
  const [pictoFout, setPictoFout] = useState<string | null>(null)

  const kiesPicto = async (file: File | undefined) => {
    const doel = pictoVoor.current
    pictoVoor.current = null
    if (!file || !doel) return
    setPictoFout(null)
    try {
      const icon = await importIcon(file)
      onWijzig(
        annotations.map((x) => (x.id === doel ? { ...x, icon } : x)),
        `aanwijzer-picto:${doel}`,
      )
    } catch (e) {
      setPictoFout(e instanceof Error ? e.message : 'Deze picto kon niet worden geladen.')
    } finally {
      if (pictoRef.current) pictoRef.current.value = ''
    }
  }

  const voegToe = () => {
    const nieuw: Annotation = {
      id: newId(),
      // Anker iets links van het midden, ballon er rechtsboven naast; allebei
      // daarna vrij te verslepen in het voorbeeldkader.
      x: 0.38,
      y: 0.55,
      bx: 0.62,
      by: 0.3,
      text: '',
      reveal: 'always',
      line: true,
      icon: null,
    }
    onActief(nieuw.id)
    onWijzig([...annotations, nieuw], 'aanwijzer-toevoegen')
  }

  return (
    <div className="anlist">
      <div className="anlist-head">
        <span className="anlist-title">Tekstballonnen</span>
        <Button onClick={voegToe} title="Een punt op de foto met een tekstje eraan">
          + Toevoegen
        </Button>
      </div>

      {annotations.length === 0 ? (
        <p className="anlist-leeg">
          Zet een punt op de foto met een tekstje ernaast, verbonden door een
          lijntje. In het voorbeeld hierboven sleep je de stip (het anker) en
          het genummerde label (de ballon) elk naar hun eigen plek.
        </p>
      ) : (
        <ol className="anlist-items">
          {annotations.map((a, i) => (
            <li key={a.id} className={a.id === actief ? 'is-active' : ''}>
              <div className="anitem-top">
                <span className="anitem-nr">{i + 1}</span>
                <TextInput
                  value={a.text}
                  placeholder="Waar wijs je naar?"
                  onFocus={() => onActief(a.id)}
                  onChange={(v) =>
                    onWijzig(
                      annotations.map((x) => (x.id === a.id ? { ...x, text: v } : x)),
                      `aanwijzer-tekst:${a.id}`,
                    )
                  }
                />
                <button
                  type="button"
                  className="anitem-del"
                  title="Deze tekstballon verwijderen"
                  aria-label={`Tekstballon ${i + 1} verwijderen`}
                  onClick={() =>
                    onWijzig(
                      annotations.filter((x) => x.id !== a.id),
                      'aanwijzer-verwijderen',
                    )
                  }
                >
                  ×
                </button>
              </div>
              <div className="anitem-opties">
                <Toggle
                  label="Punt met verbindingslijn"
                  checked={a.line}
                  onChange={(v) =>
                    onWijzig(
                      annotations.map((x) => (x.id === a.id ? { ...x, line: v } : x)),
                      `aanwijzer-lijn:${a.id}`,
                    )
                  }
                />
                {a.line && (
                  <Toggle
                    label="Pas tonen bij aanwijzen"
                    checked={a.reveal === 'hover'}
                    onChange={(v) =>
                      onWijzig(
                        annotations.map((x) =>
                          x.id === a.id ? { ...x, reveal: v ? 'hover' : 'always' } : x,
                        ),
                        `aanwijzer-tonen:${a.id}`,
                      )
                    }
                  />
                )}
                {a.line && (
                  <div className="anitem-picto">
                    {a.icon && <img src={a.icon} alt="" className="anitem-picto-thumb" />}
                    <Button
                      onClick={() => {
                        pictoVoor.current = a.id
                        pictoRef.current?.click()
                      }}
                      title="Vervangt de stip door een eigen afbeelding, bijvoorbeeld een pictogram"
                    >
                      {a.icon ? 'Andere picto…' : 'Eigen picto…'}
                    </Button>
                    {a.icon && (
                      <Button
                        onClick={() =>
                          onWijzig(
                            annotations.map((x) => (x.id === a.id ? { ...x, icon: null } : x)),
                            `aanwijzer-picto:${a.id}`,
                          )
                        }
                      >
                        Stip terug
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <input
        ref={pictoRef}
        type="file"
        accept={ACCEPTED}
        hidden
        onChange={(e) => void kiesPicto(e.target.files?.[0])}
      />
      {pictoFout && <p className="msg msg-error">{pictoFout}</p>}
    </div>
  )
}

/**
 * Het brandpunt bepaalt wat er in beeld blijft als de foto wordt bijgesneden.
 * Je sleept het punt naar wat er hoe dan ook te zien moet zijn — meestal een
 * gezicht. Het wordt bewaard als fractie, dus het klopt op elk schermformaat.
 *
 * In hetzelfde kader sleep je de tekstballonnen naar hun plek.
 */
function FocalPicker({
  media,
  interactief,
  toonUitsnede,
  actieveAanwijzer,
  onFocal,
  onAanwijzer,
  onBallon,
}: {
  media: Media
  interactief: boolean
  toonUitsnede: boolean
  actieveAanwijzer: string | null
  onFocal: (x: number, y: number) => void
  onAanwijzer: (id: string, x: number, y: number) => void
  onBallon: (id: string, x: number, y: number) => void
}) {
  const vlakRef = useRef<HTMLDivElement>(null)
  /** Wat er versleept wordt: 'focal', 'a:<id>' (anker) of 'b:<id>' (ballon). */
  const sleept = useRef<string | null>(null)

  const fractie = useCallback((clientX: number, clientY: number) => {
    const vlak = vlakRef.current
    if (!vlak) return null
    const r = vlak.getBoundingClientRect()
    return {
      x: Number(Math.min(1, Math.max(0, (clientX - r.left) / r.width)).toFixed(4)),
      y: Number(Math.min(1, Math.max(0, (clientY - r.top) / r.height)).toFixed(4)),
    }
  }, [])

  const opPointerDown = (e: React.PointerEvent) => {
    const el = e.target as HTMLElement
    const ballon = el.closest('[data-ballon]')?.getAttribute('data-ballon')
    const anker = el.closest('[data-aanwijzer]')?.getAttribute('data-aanwijzer')

    if (!ballon && !anker && !interactief) return
    e.currentTarget.setPointerCapture(e.pointerId)
    sleept.current = ballon ? `b:${ballon}` : anker ? `a:${anker}` : 'focal'

    const f = fractie(e.clientX, e.clientY)
    if (!f) return
    if (ballon) onBallon(ballon, f.x, f.y)
    else if (anker) onAanwijzer(anker, f.x, f.y)
    else onFocal(f.x, f.y)
  }

  const opPointerMove = (e: React.PointerEvent) => {
    if (!sleept.current || e.buttons === 0) return
    const f = fractie(e.clientX, e.clientY)
    if (!f) return
    if (sleept.current === 'focal') onFocal(f.x, f.y)
    else if (sleept.current.startsWith('b:')) onBallon(sleept.current.slice(2), f.x, f.y)
    else onAanwijzer(sleept.current.slice(2), f.x, f.y)
  }

  const opPointerUp = () => {
    sleept.current = null
  }

  const opToets = (e: React.KeyboardEvent) => {
    if (!interactief) return
    const stap = e.shiftKey ? 0.1 : 0.02
    const { focalX: x, focalY: y } = media.adjust
    const richting: Record<string, [number, number]> = {
      ArrowLeft: [-stap, 0],
      ArrowRight: [stap, 0],
      ArrowUp: [0, -stap],
      ArrowDown: [0, stap],
    }
    const delta = richting[e.key]
    if (!delta) return
    e.preventDefault()
    onFocal(
      Number(Math.min(1, Math.max(0, x + delta[0])).toFixed(4)),
      Number(Math.min(1, Math.max(0, y + delta[1])).toFixed(4)),
    )
  }

  const beeldVerhouding = media.width && media.height ? media.width / media.height : 16 / 9

  // Het kader krijgt exact de verhouding van de foto. Anders staat er bij een
  // staande foto zwart naast het beeld, en klopt de omrekening van muispositie
  // naar brandpunt niet meer: je klikt dan naast de foto en het punt springt.
  const kaderStijl = {
    aspectRatio: `${beeldVerhouding}`,
    maxWidth: `${Math.round(MAX_PREVIEW_HOOGTE * beeldVerhouding)}px`,
  }

  // Bij 'cover' op een staand scherm blijft hiervan horizontaal maar een strook over.
  const strookBreedte = Math.min(1, MOBIEL / beeldVerhouding)
  const strookLinks = Math.min(
    1 - strookBreedte,
    Math.max(0, media.adjust.focalX - strookBreedte / 2),
  )

  return (
    <div
      className={`focal ${interactief ? 'is-interactive' : ''}`}
      ref={vlakRef}
      onPointerDown={opPointerDown}
      onPointerMove={opPointerMove}
      onPointerUp={opPointerUp}
      onPointerCancel={opPointerUp}
      onKeyDown={opToets}
      style={kaderStijl}
      tabIndex={interactief ? 0 : -1}
      role={interactief ? 'application' : undefined}
      aria-label={
        interactief
          ? 'Brandpunt van de foto. Sleep, of gebruik de pijltjestoetsen.'
          : undefined
      }
    >
      <img src={media.src} alt="" draggable={false} />

      {toonUitsnede && (
        <>
          <div className="focal-mask" style={{ left: 0, width: `${strookLinks * 100}%` }} />
          <div
            className="focal-mask"
            style={{
              left: `${(strookLinks + strookBreedte) * 100}%`,
              right: 0,
              width: 'auto',
            }}
          />
          <div
            className="focal-cropline"
            style={{ left: `${strookLinks * 100}%`, width: `${strookBreedte * 100}%` }}
          >
            <span>staand telefoonscherm</span>
          </div>
        </>
      )}

      {interactief && (
        <span
          className="focal-dot"
          style={{
            left: `${media.adjust.focalX * 100}%`,
            top: `${media.adjust.focalY * 100}%`,
          }}
        />
      )}

      {media.annotations.some((a) => a.line) && (
        <svg className="focal-lijnen" aria-hidden="true">
          {media.annotations
            .filter((a) => a.line)
            .map((a) => (
              <line
                key={a.id}
                x1={`${a.x * 100}%`}
                y1={`${a.y * 100}%`}
                x2={`${a.bx * 100}%`}
                y2={`${a.by * 100}%`}
              />
            ))}
        </svg>
      )}

      {media.annotations
        .filter((a) => a.line)
        .map((a, i) =>
          a.icon ? (
            <img
              key={a.id}
              src={a.icon}
              alt=""
              data-aanwijzer={a.id}
              className={`focal-an is-icon ${a.id === actieveAanwijzer ? 'is-active' : ''}`}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
              title={`Picto ${i + 1} — sleep naar waar hij moet staan`}
              draggable={false}
            />
          ) : (
            <span
              key={a.id}
              data-aanwijzer={a.id}
              className={`focal-an ${a.id === actieveAanwijzer ? 'is-active' : ''}`}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
              title={`Anker van ballon ${i + 1} — sleep naar waar de lijn moet wijzen`}
            />
          ),
        )}

      {media.annotations.map((a, i) => (
        <span
          key={a.id}
          data-ballon={a.id}
          className={`focal-bal ${a.id === actieveAanwijzer ? 'is-active' : ''}`}
          style={{ left: `${a.bx * 100}%`, top: `${a.by * 100}%` }}
          title={`Ballon ${i + 1}${a.text ? ` — ${a.text}` : ''} — sleep naar waar de tekst moet staan`}
        >
          {i + 1}
        </span>
      ))}
    </div>
  )
}

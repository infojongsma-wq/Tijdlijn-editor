import { useCallback, useRef, useState } from 'react'
import { DEFAULT_ADJUST, type Media } from '../model/types'
import {
  ACCEPTED,
  dataUrlBytes,
  formatBytes,
  importImage,
  type ImageWarning,
} from '../model/image'
import { Button, Field, Slider, TextArea, TextInput } from './controls'

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
  const invoerRef = useRef<HTMLInputElement>(null)

  const kies = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setFout(null)
      setBezig(true)
      try {
        const resultaat = await importImage(file)
        // Bijschrift, rechten en alt overnemen als er al iets stond: je vervangt
        // meestal de foto, niet de verantwoording eromheen.
        if (media) {
          resultaat.media.alt = media.alt
          resultaat.media.caption = media.caption
          resultaat.media.credit = media.credit
          resultaat.media.adjust = { ...media.adjust }
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
        onFocal={(x, y) => pasAan({ focalX: x, focalY: y }, 'brandpunt')}
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
              {toonUitsnede ? 'Verberg uitsnede' : 'Toon uitsnede mobiel'}
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
 * Het brandpunt bepaalt wat er in beeld blijft als de foto wordt bijgesneden.
 * Je sleept het punt naar wat er hoe dan ook te zien moet zijn — meestal een
 * gezicht. Het wordt bewaard als fractie, dus het klopt op elk schermformaat.
 */
function FocalPicker({
  media,
  interactief,
  toonUitsnede,
  onFocal,
}: {
  media: Media
  interactief: boolean
  toonUitsnede: boolean
  onFocal: (x: number, y: number) => void
}) {
  const vlakRef = useRef<HTMLDivElement>(null)

  const verplaats = useCallback(
    (clientX: number, clientY: number) => {
      const vlak = vlakRef.current
      if (!vlak) return
      const r = vlak.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height))
      onFocal(Number(x.toFixed(4)), Number(y.toFixed(4)))
    },
    [onFocal],
  )

  const opPointerDown = (e: React.PointerEvent) => {
    if (!interactief) return
    e.currentTarget.setPointerCapture(e.pointerId)
    verplaats(e.clientX, e.clientY)
  }
  const opPointerMove = (e: React.PointerEvent) => {
    if (!interactief || e.buttons === 0) return
    verplaats(e.clientX, e.clientY)
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
    </div>
  )
}

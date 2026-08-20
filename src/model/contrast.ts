/** Contrastberekening volgens WCAG 2.1. Wordt gebruikt om te waarschuwen,
 *  nooit om te blokkeren — de redacteur beslist. */

export function contrastRatio(voorgrond: string, achtergrond: string): number {
  const l1 = relativeLuminance(voorgrond)
  const l2 = relativeLuminance(achtergrond)
  const licht = Math.max(l1, l2)
  const donker = Math.min(l1, l2)
  return (licht + 0.05) / (donker + 0.05)
}

/** AA vraagt 4,5:1 voor gewone tekst en 3:1 voor grote tekst. Koppen in de
 *  speler zijn ruim boven 24 pixels, dus die vallen onder 'groot'. */
export function contrastVerdict(ratio: number): {
  level: 'ok' | 'large-only' | 'fail'
  text: string
} {
  if (ratio >= 4.5) {
    return { level: 'ok', text: `Contrast ${ratio.toFixed(1)}:1 — voldoet aan AA.` }
  }
  if (ratio >= 3) {
    return {
      level: 'large-only',
      text: `Contrast ${ratio.toFixed(1)}:1 — genoeg voor grote koppen, te weinig voor lopende tekst.`,
    }
  }
  return {
    level: 'fail',
    text: `Contrast ${ratio.toFixed(1)}:1 — te weinig. Kies een lichtere of donkerdere kleur.`,
  }
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((kanaal) => {
    const v = kanaal / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

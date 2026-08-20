import type { CSSProperties } from 'react'
import type { Media } from '../model/types'

/**
 * De beeldinstellingen omgezet naar CSS.
 *
 * Niets hiervan raakt de foto zelf aan: bijsnijden gebeurt met object-position,
 * inzoomen met een schaal, en licht/contrast/verzadiging met filters. Daardoor
 * kun je een half jaar later alles nog bijstellen, en blijft het origineel heel.
 */
export function mediaStyle(media: Media, fit: 'cover' | 'contain'): CSSProperties {
  const { adjust } = media

  const filters = [
    `brightness(${adjust.brightness}%)`,
    `contrast(${adjust.contrast}%)`,
    `saturate(${adjust.saturation}%)`,
  ].join(' ')

  return {
    objectFit: fit,
    // Bij 'contain' — een grafiek — is bijsnijden zinloos: die moet in zijn
    // geheel te zien zijn, anders mis je juist de cijfers.
    objectPosition:
      fit === 'cover'
        ? `${adjust.focalX * 100}% ${adjust.focalY * 100}%`
        : 'center',
    transform: fit === 'cover' && adjust.zoom !== 1 ? `scale(${adjust.zoom})` : undefined,
    // Zonder eigen oorsprong zoomt de browser vanuit het midden en verdwijnt
    // juist het gekozen brandpunt uit beeld.
    transformOrigin:
      fit === 'cover' ? `${adjust.focalX * 100}% ${adjust.focalY * 100}%` : undefined,
    opacity: adjust.opacity,
    filter: filters,
  }
}

/** Bijschrift en rechten horen los; hier worden ze pas voor weergave samengevoegd. */
export function creditLine(media: Media): string {
  const delen = [media.caption.trim(), media.credit.trim() ? `© ${media.credit.trim()}` : '']
  return delen.filter(Boolean).join(' ')
}

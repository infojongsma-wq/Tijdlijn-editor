import { useCallback, useMemo, useRef, useState } from 'react'

export const MAX_STEPS = 20

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface History<T> {
  value: T
  /** Legt een stap vast. `label` groepeert snel op elkaar volgende wijzigingen:
   *  tikken in hetzelfde tekstveld wordt één stap, niet twintig. */
  set: (next: T | ((prev: T) => T), label?: string) => void
  /** Vervangt alles zonder geschiedenis — voor het openen van een bestand. */
  reset: (next: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/** Samenvoegvenster: wijzigingen met hetzelfde label binnen deze tijd tellen
 *  als één stap. Lang genoeg om een zin te typen, kort genoeg om een bewuste
 *  tweede wijziging apart te houden. */
const MERGE_MS = 700

export function useHistory<T>(initial: T): History<T> {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  })

  const laatste = useRef<{ label: string; tijd: number } | null>(null)

  const set = useCallback((next: T | ((prev: T) => T), label?: string) => {
    const nu = Date.now()
    const vorige = laatste.current
    const samenvoegen =
      label !== undefined &&
      vorige !== null &&
      vorige.label === label &&
      nu - vorige.tijd < MERGE_MS

    laatste.current = label === undefined ? null : { label, tijd: nu }

    setState((huidig) => {
      const waarde =
        typeof next === 'function'
          ? (next as (prev: T) => T)(huidig.present)
          : next

      if (Object.is(waarde, huidig.present)) return huidig

      if (samenvoegen) {
        // De vorige stap overschrijven in plaats van er een nieuwe bij te zetten.
        return { past: huidig.past, present: waarde, future: [] }
      }

      const past = [...huidig.past, huidig.present]
      if (past.length > MAX_STEPS) past.shift()
      return { past, present: waarde, future: [] }
    })
  }, [])

  const reset = useCallback((next: T) => {
    laatste.current = null
    setState({ past: [], present: next, future: [] })
  }, [])

  const undo = useCallback(() => {
    laatste.current = null
    setState((huidig) => {
      if (huidig.past.length === 0) return huidig
      const vorige = huidig.past[huidig.past.length - 1]
      return {
        past: huidig.past.slice(0, -1),
        present: vorige,
        future: [huidig.present, ...huidig.future].slice(0, MAX_STEPS),
      }
    })
  }, [])

  const redo = useCallback(() => {
    laatste.current = null
    setState((huidig) => {
      if (huidig.future.length === 0) return huidig
      const volgende = huidig.future[0]
      const past = [...huidig.past, huidig.present]
      if (past.length > MAX_STEPS) past.shift()
      return { past, present: volgende, future: huidig.future.slice(1) }
    })
  }, [])

  return useMemo(
    () => ({
      value: state.present,
      set,
      reset,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, set, reset, undo, redo],
  )
}

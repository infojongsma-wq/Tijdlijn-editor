import type { PartialDate, DatePrecision } from './types'

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/**
 * Sorteerwaarde. Ontbrekende delen worden met hun laagste waarde aangevuld:
 * "1953" telt als 1 januari 1953, 00:00. Zo staat een jaartal vóór alle
 * gedateerde momenten in dat jaar, wat voor een dossier de juiste volgorde is.
 */
export function sortKey(d: PartialDate): number {
  // Niet Date.UTC(year, ...): die rekent jaar 1 t/m 99 om naar 1901-1999, en
  // buildDate laat zulke jaartallen toe. Een dossier over het jaar 70 hoort
  // niet ineens in de twintigste eeuw te belanden.
  const datum = new Date(0)
  datum.setUTCFullYear(d.year, (d.month ?? 1) - 1, d.day ?? 1)
  datum.setUTCHours(d.hour ?? 0, d.minute ?? 0, 0, 0)
  return datum.getTime()
}

/** Twee momenten op dezelfde kalenderdag? Bepaalt of we het tijdstip tonen. */
export function sameDay(a: PartialDate, b: PartialDate): boolean {
  return (
    a.year === b.year &&
    (a.month ?? 0) === (b.month ?? 0) &&
    (a.day ?? 0) === (b.day ?? 0) &&
    a.day !== undefined &&
    b.day !== undefined
  )
}

/**
 * Voluit, voor in de kaart: "13 maart 2025", "maart 2025", "1953".
 * Het tijdstip komt er alleen bij als `withTime` waar is — zie `axisLabels`.
 */
export function formatDate(d: PartialDate, withTime = false): string {
  const jaar = String(d.year)
  if (d.precision === 'year') return jaar

  const maand = MAANDEN[(d.month ?? 1) - 1]
  if (d.precision === 'month') return `${maand} ${jaar}`

  const dag = `${d.day} ${maand} ${jaar}`
  if (d.precision === 'day' || !withTime) return dag

  return `${dag}, ${pad(d.hour ?? 0)}:${pad(d.minute ?? 0)}`
}

/** Kort, voor op de as: "13 maart", "maart 2025", "1953". */
export function formatShort(d: PartialDate, withTime = false): string {
  if (d.precision === 'year') return String(d.year)
  const maand = MAANDEN[(d.month ?? 1) - 1]
  if (d.precision === 'month') return `${maand} ${d.year}`
  const dag = `${d.day} ${maand}`
  if (!withTime || d.precision !== 'minute') return dag
  return `${dag} ${pad(d.hour ?? 0)}:${pad(d.minute ?? 0)}`
}

/**
 * Labels voor de as, in de volgorde waarin de kaarten staan.
 *
 * Het wolvendossier bevat twee artikelen op 13 maart (10:27 en 17:00). Zonder
 * ingreep staat er dan twee keer "13 maart" op de as en lijkt het één moment.
 * Daarom: zodra een dag meer dan één keer voorkomt, krijgen álle momenten van
 * die dag hun tijdstip erbij — voor beide dezelfde behandeling, dat leest
 * rustiger dan alleen de tweede van een tijd voorzien.
 */
export function axisLabels(dates: PartialDate[]): string[] {
  const perDag = new Map<string, number>()
  for (const d of dates) {
    const sleutel = dayKey(d)
    if (sleutel) perDag.set(sleutel, (perDag.get(sleutel) ?? 0) + 1)
  }
  return dates.map((d) => {
    const sleutel = dayKey(d)
    const gedeeld = sleutel !== null && (perDag.get(sleutel) ?? 0) > 1
    return formatShort(d, gedeeld && d.precision === 'minute')
  })
}

function dayKey(d: PartialDate): string | null {
  if (d.day === undefined) return null
  return `${d.year}-${d.month}-${d.day}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * De datumvelden in de editor zijn losse invoervakjes. Dit maakt daar een
 * geldige PartialDate van: leeg gelaten velden bepalen de precisie.
 */
export function buildDate(
  year: number,
  month?: number,
  day?: number,
  hour?: number,
  minute?: number,
): PartialDate {
  const jaar = clamp(Math.round(year) || new Date().getFullYear(), 1, 9999)

  if (!month) return { year: jaar, precision: 'year' }
  const maand = clamp(month, 1, 12)

  if (!day) return { year: jaar, month: maand, precision: 'month' }
  const dag = clamp(day, 1, daysInMonth(jaar, maand))

  if (hour === undefined || hour === null) {
    return { year: jaar, month: maand, day: dag, precision: 'day' }
  }
  return {
    year: jaar,
    month: maand,
    day: dag,
    hour: clamp(hour, 0, 23),
    minute: clamp(minute ?? 0, 0, 59),
    precision: 'minute',
  }
}

export function daysInMonth(year: number, month: number): number {
  // Zelfde valkuil als in sortKey: via setUTCFullYear om jaar 1-99 te sparen.
  const datum = new Date(0)
  datum.setUTCFullYear(year, month, 0)
  return datum.getUTCDate()
}

export function precisionLabel(p: DatePrecision): string {
  switch (p) {
    case 'year': return 'alleen jaar'
    case 'month': return 'maand en jaar'
    case 'day': return 'hele dag'
    case 'minute': return 'met tijdstip'
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

// Utilidades de fecha/hora. Todos los partidos se muestran en ET (America/New_York)
// para mantener consistencia con el calendario oficial publicado.

const ET = 'America/New_York'

/** "Hoy", "Mañana" o "vie 11 jun" */
export function formatMatchDay(utcDatetime: string): string {
  const date = new Date(utcDatetime)
  const now = new Date()

  const dateET = toETDate(date)
  const todayET = toETDate(now)
  const tomorrowET = new Date(todayET)
  tomorrowET.setDate(tomorrowET.getDate() + 1)

  if (dateET.toDateString() === todayET.toDateString()) return 'Hoy'
  if (dateET.toDateString() === tomorrowET.toDateString()) return 'Mañana'

  return date.toLocaleDateString('es-UY', {
    timeZone: ET,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "vie 11 jun 2026" — para cabeceras de grupo de fecha */
export function formatMatchDayFull(utcDatetime: string): string {
  return new Date(utcDatetime).toLocaleDateString('es-UY', {
    timeZone: ET,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "15:00" en ET */
export function formatMatchTime(utcDatetime: string): string {
  return new Date(utcDatetime).toLocaleTimeString('es-UY', {
    timeZone: ET,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Clave de agrupación: fecha en ET como YYYY-MM-DD */
export function matchDateKey(utcDatetime: string): string {
  return new Date(utcDatetime).toLocaleDateString('en-CA', { timeZone: ET }) // en-CA da YYYY-MM-DD
}

/** ¿El partido ya empezó? */
export function matchStarted(utcDatetime: string): boolean {
  return new Date(utcDatetime) <= new Date()
}

// Helper interno
function toETDate(d: Date): Date {
  return new Date(d.toLocaleString('en-US', { timeZone: ET }))
}

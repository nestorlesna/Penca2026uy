// Utilidades de fecha/hora.
// Las horas se muestran en la zona horaria local del dispositivo del usuario,
// con la abreviación de zona explícita (ej: "UYT", "CEST", "EST").
// La seguridad de bloqueo de predicciones es 100% server-side (RLS en Supabase).

/** "Hoy", "Mañana" o "vie 11 jun" — en zona local del usuario */
export function formatMatchDay(utcDatetime: string): string {
  const date = new Date(utcDatetime)
  const now = new Date()

  const localDate = toLocalDate(date)
  const todayLocal = toLocalDate(now)
  const tomorrowLocal = new Date(todayLocal)
  tomorrowLocal.setDate(tomorrowLocal.getDate() + 1)

  if (localDate.toDateString() === todayLocal.toDateString()) return 'Hoy'
  if (localDate.toDateString() === tomorrowLocal.toDateString()) return 'Mañana'

  return date.toLocaleDateString('es-UY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "viernes 11 de junio de 2026" — para cabeceras de grupo de fecha */
export function formatMatchDayFull(utcDatetime: string): string {
  return new Date(utcDatetime).toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** "15:00 UYT" — hora local del usuario con zona explícita */
export function formatMatchTime(utcDatetime: string): string {
  return new Date(utcDatetime).toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  })
}

/** Clave de agrupación: fecha local como YYYY-MM-DD */
export function matchDateKey(utcDatetime: string): string {
  return new Date(utcDatetime).toLocaleDateString('en-CA') // en-CA da YYYY-MM-DD en zona local
}

/** ¿El partido ya empezó? (solo para UI — el control real es server-side via RLS) */
export function matchStarted(utcDatetime: string): boolean {
  return new Date(utcDatetime) <= new Date()
}

// Helper interno: fecha en zona local del dispositivo
function toLocalDate(d: Date): Date {
  return new Date(d.toLocaleDateString('en-CA'))
}

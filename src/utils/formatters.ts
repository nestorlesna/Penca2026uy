import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatMatchDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Hoy'
  if (isTomorrow(date)) return 'Mañana'
  if (isYesterday(date)) return 'Ayer'
  return format(date, "d 'de' MMMM", { locale: es })
}

export function formatMatchDateFull(dateStr: string): string {
  const date = parseISO(dateStr)
  return format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
}

export function formatMatchTime(timeStr: string): string {
  // timeStr: 'HH:MM' → '15:00'
  return timeStr.slice(0, 5)
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { locale: es, addSuffix: true })
}

export function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '- : -'
  return `${home} : ${away}`
}

/** Capitaliza primera letra */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

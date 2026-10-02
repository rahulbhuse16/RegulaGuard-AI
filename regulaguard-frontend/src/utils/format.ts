import { format, parseISO } from 'date-fns'

export function formatDate(value?: string | null): string {
  if (!value) return 'Not set'
  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return value
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Not set'
  try {
    return format(parseISO(value), 'd MMM yyyy, HH:mm')
  } catch {
    return value
  }
}

export function humanize(value: string): string {
  const s = value.replaceAll('_', ' ').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

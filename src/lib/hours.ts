import type { Shop } from './storefront'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function cuiabaWeekday(): number {
  const label = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Cuiaba' }).format(new Date())
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(label)
}

function periodLabel(hour: { opens: string; closes: string }): string {
  // Fechamento menor ou igual à abertura = fecha depois da meia-noite.
  return hour.closes <= hour.opens
    ? `${hour.opens} às ${hour.closes} (dia seguinte)`
    : `${hour.opens} às ${hour.closes}`
}

export function todayHoursLabel(shop: Shop): string | null {
  const hours = shop.opening_hours.filter((hour) => hour.enabled !== false)
  if (!hours.length) return null
  const today = hours.filter((hour) => hour.weekday === cuiabaWeekday())
  if (!today.length) return 'Fechado hoje'
  return today.map(periodLabel).join(' · ')
}

export function weekHoursRows(shop: Shop): { day: string; label: string }[] {
  return WEEKDAYS.map((day, weekday) => {
    const slots = shop.opening_hours.filter((hour) => hour.weekday === weekday && hour.enabled !== false)
    return { day, label: slots.length ? slots.map(periodLabel).join(' · ') : 'Fechado' }
  })
}

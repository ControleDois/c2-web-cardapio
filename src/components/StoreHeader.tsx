import { useState } from 'react'
import { todayHoursLabel, weekHoursRows } from '../lib/hours'
import { formatCurrency } from '../lib/format'
import type { Shop } from '../lib/storefront'
import { BikeIcon, ClockIcon, ReceiptIcon } from './icons'
import { Sheet } from './Sheet'

interface StoreHeaderProps {
  shop: Shop
  onOrders: () => void
}

function deliveryFeeLabel(shop: Shop): string {
  if (shop.neighborhoods.length) {
    const fees = shop.neighborhoods.map((n) => n.delivery_fee)
    const min = Math.min(...fees)
    const max = Math.max(...fees)
    if (min === max) return min === 0 ? 'Entrega grátis' : formatCurrency(min)
    return `${formatCurrency(min)} a ${formatCurrency(max)}`
  }
  return shop.delivery_fee === 0 ? 'Entrega grátis' : formatCurrency(shop.delivery_fee)
}

function deliveryTimeLabel(shop: Shop): string | null {
  const times = shop.neighborhoods
    .map((n) => n.estimated_minutes)
    .filter((minutes): minutes is number => minutes != null)
  if (times.length) {
    const min = Math.min(...times)
    const max = Math.max(...times)
    return min === max ? `${min} min` : `${min}–${max} min`
  }
  return shop.estimated_delivery_minutes ? `${shop.estimated_delivery_minutes} min` : null
}

export function StoreHeader({ shop, onOrders }: StoreHeaderProps) {
  const [hoursOpen, setHoursOpen] = useState(false)
  const time = deliveryTimeLabel(shop)
  const today = todayHoursLabel(shop)

  return (
    <header className="bg-[var(--surface)]">
      <div className="relative h-32 w-full bg-[var(--brand)] sm:h-44">
        {shop.banner_url && <img src={shop.banner_url} alt="" className="h-full w-full object-cover" />}
        <button
          type="button"
          onClick={onOrders}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-[12.5px] font-bold text-[var(--ink)] shadow"
        >
          <ReceiptIcon className="h-4 w-4" />
          Meus pedidos
        </button>
      </div>

      <div className="mx-auto max-w-[760px] px-4 pb-4">
        <div className="flex items-start justify-between gap-3 pt-4">
          <h1 className="text-[22px] leading-tight font-extrabold text-[var(--ink)]">{shop.name}</h1>
          <span
            className="mt-1 flex-none rounded-full px-3 py-1 text-[12px] font-bold"
            style={{
              background: shop.is_open_now ? 'rgba(31,143,78,0.12)' : 'rgba(194,59,59,0.12)',
              color: shop.is_open_now ? 'var(--green)' : 'var(--red)',
            }}
          >
            {shop.is_open_now ? 'Aberto' : 'Fechado'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[var(--ink-soft)]">
          <span className="flex items-center gap-1.5">
            <BikeIcon className="h-4 w-4 text-[var(--brand)]" />
            {deliveryFeeLabel(shop)}
          </span>
          {time && (
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4 text-[var(--brand)]" />
              {time}
            </span>
          )}
          {shop.minimum_order_value > 0 && <span>Pedido mínimo {formatCurrency(shop.minimum_order_value)}</span>}
        </div>

        {today && (
          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            className="mt-2 text-[12.5px] font-semibold text-[var(--brand)] underline-offset-2 hover:underline"
          >
            Hoje: {today} · ver horários
          </button>
        )}

        {!shop.is_open_now && (
          <p className="mt-3 rounded-xl bg-[rgba(194,59,59,0.08)] px-3.5 py-2.5 text-[13px] text-[var(--red)]">
            {shop.accepting_orders
              ? 'A loja está fechada agora. Você pode montar o carrinho, mas só consegue finalizar quando abrir.'
              : 'A loja não está aceitando pedidos no momento.'}
          </p>
        )}
      </div>

      <Sheet open={hoursOpen} title="Horário de funcionamento" onClose={() => setHoursOpen(false)}>
        <ul className="divide-y divide-[var(--border)]">
          {weekHoursRows(shop).map((row) => (
            <li key={row.day} className="flex items-center justify-between px-5 py-3 text-[14px]">
              <span className="font-semibold text-[var(--ink)]">{row.day}</span>
              <span className="text-[var(--ink-soft)]">{row.label}</span>
            </li>
          ))}
        </ul>
      </Sheet>
    </header>
  )
}

import { lineTotal, lineUnitPrice } from '../lib/cart'
import { formatCurrency } from '../lib/format'
import { useStore } from '../store/StoreContext'
import { BagIcon, ImageIcon, MinusIcon, PlusIcon } from './icons'
import { Sheet } from './Sheet'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

export function CartBar({ onOpen }: { onOpen: () => void }) {
  const { cartCount, cartSubtotal } = useStore()
  if (!cartCount) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto flex h-14 w-full max-w-[560px] items-center justify-between rounded-full bg-[var(--brand)] px-5 text-white shadow-xl"
      >
        <span className="flex items-center gap-2.5 text-[14px] font-bold">
          <span className="relative">
            <BagIcon className="h-5 w-5" />
            <span className="absolute -top-2 -right-2.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-white px-1 text-[10.5px] font-extrabold text-[var(--brand)]">
              {cartCount}
            </span>
          </span>
          <span className="ml-1">Ver sacola</span>
        </span>
        <span className="text-[14.5px] font-extrabold">{formatCurrency(cartSubtotal)}</span>
      </button>
    </div>
  )
}

export function CartSheet({ open, onClose, onCheckout }: CartSheetProps) {
  const { cart, cartSubtotal, setLineQuantity, clearCart, shop } = useStore()
  const minimum = shop?.minimum_order_value ?? 0
  const belowMinimum = minimum > 0 && cartSubtotal < minimum
  const closed = shop ? !shop.is_open_now : false

  return (
    <Sheet
      open={open}
      title="Sua sacola"
      onClose={onClose}
      footer={
        cart.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[var(--ink-soft)]">Subtotal</span>
              <span className="font-extrabold text-[var(--ink)]">{formatCurrency(cartSubtotal)}</span>
            </div>
            {belowMinimum && (
              <p className="text-[12.5px] text-[var(--amber)]">
                Faltam {formatCurrency(minimum - cartSubtotal)} para o pedido mínimo de {formatCurrency(minimum)}.
              </p>
            )}
            {closed && <p className="text-[12.5px] text-[var(--red)]">A loja está fechada no momento.</p>}
            <button
              type="button"
              onClick={onCheckout}
              disabled={belowMinimum || closed}
              className="h-12 rounded-full bg-[var(--brand)] text-[14.5px] font-bold text-white disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )
      }
    >
      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <BagIcon className="h-10 w-10 text-[var(--muted)]" />
          <p className="text-[15px] font-bold text-[var(--ink)]">Sua sacola está vazia</p>
          <p className="text-[13px] text-[var(--ink-soft)]">Escolha alguns produtos do cardápio.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)] px-5">
            {cart.map((line) => (
              <li key={line.key} className="flex gap-3 py-4">
                <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-lg bg-[var(--page)] text-[var(--muted)]">
                  {line.image_url ? (
                    <img src={line.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 opacity-60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-snug font-bold text-[var(--ink)]">{line.name}</p>
                  {line.complements.length > 0 && (
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--ink-soft)]">
                      {line.complements.map((c) => (c.quantity > 1 ? `${c.label} x${c.quantity}` : c.label)).join(', ')}
                    </p>
                  )}
                  {line.note && <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">Obs: {line.note}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-extrabold text-[var(--ink)]">
                      {formatCurrency(lineTotal(line))}
                      {line.quantity > 1 && (
                        <span className="ml-1.5 text-[11.5px] font-medium text-[var(--muted)]">
                          ({formatCurrency(lineUnitPrice(line))} cada)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 rounded-full bg-[var(--page)] p-0.5">
                      <button
                        type="button"
                        onClick={() => setLineQuantity(line.key, line.quantity - 1)}
                        aria-label="Diminuir"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--brand)]"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-5 text-center text-[14px] font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setLineQuantity(line.key, line.quantity + 1)}
                        aria-label="Aumentar"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--brand)]"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Esvaziar a sacola?')) clearCart()
              }}
              className="text-[12.5px] font-semibold text-[var(--red)]"
            >
              Esvaziar sacola
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

import { useEffect, useState } from 'react'
import { ArrowLeftIcon } from '../components/icons'
import { LoginPanel } from '../components/LoginPanel'
import { ApiError } from '../lib/api'
import { formatCurrency, formatDateTime } from '../lib/format'
import { listOrders, ORDER_STATUS, type OrderSummary } from '../lib/storefront'
import { useStore } from '../store/StoreContext'

interface OrdersPageProps {
  navigate: (path: string) => void
}

export function OrdersPage({ navigate }: OrdersPageProps) {
  const { slug, session, signOut } = useStore()
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    listOrders(slug, session.session_token)
      .then((list) => {
        if (!cancelled) setOrders(list)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) signOut()
        else setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seus pedidos.')
      })
    return () => {
      cancelled = true
    }
  }, [slug, session, signOut])

  return (
    <div className="min-h-svh pb-10">
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(`/${slug}`)}
            aria-label="Voltar ao cardápio"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--page)]"
          >
            <ArrowLeftIcon className="h-4.5 w-4.5" />
          </button>
          <h1 className="text-[16px] font-extrabold">Meus pedidos</h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {!session ? (
          <LoginPanel />
        ) : error ? (
          <p className="text-[14px] font-medium text-[var(--red)]">{error}</p>
        ) : !orders ? (
          <p className="py-16 text-center text-[14px] text-[var(--muted)]">Carregando…</p>
        ) : orders.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[var(--ink-soft)]">Você ainda não fez nenhum pedido.</p>
        ) : (
          orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => navigate(`/${slug}/pedidos/${order.id}`)}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface)] p-4 text-left ring-1 ring-[var(--border)]"
            >
              <div>
                <p className="text-[14.5px] font-bold">{ORDER_STATUS[order.status]?.label ?? order.status}</p>
                <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
                  {formatDateTime(order.created_at)} · {order.fulfillment_type === 'pickup' ? 'Retirada' : 'Entrega'}
                </p>
              </div>
              <span className="text-[14.5px] font-extrabold">{formatCurrency(order.total)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

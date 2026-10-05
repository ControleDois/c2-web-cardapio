import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftIcon, CheckIcon } from '../components/icons'
import { LoginPanel } from '../components/LoginPanel'
import { ApiError } from '../lib/api'
import { formatCurrency, formatDateTime } from '../lib/format'
import { fetchOrder, ORDER_STATUS, PAYMENT_LABEL, type OrderDetail } from '../lib/storefront'
import { useStore } from '../store/StoreContext'

interface OrderPageProps {
  orderId: string
  navigate: (path: string) => void
}

const POLL_MS = 20000

function stepLabels(fulfillment: OrderDetail['fulfillment_type']): string[] {
  return fulfillment === 'pickup'
    ? ['Recebido', 'Confirmado', 'Em preparo', 'Pronto para retirar', 'Concluído']
    : ['Recebido', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue']
}

export function OrderPage({ orderId, navigate }: OrderPageProps) {
  const { slug, session, signOut } = useStore()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!session) return Promise.resolve()
    return fetchOrder(slug, session.session_token, orderId)
      .then((data) => {
        setOrder(data)
        setError(null)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) signOut()
        else setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o pedido.')
      })
  }, [slug, session, orderId, signOut])

  useEffect(() => {
    load()
  }, [load])

  const finished = order?.status === 'completed' || order?.status === 'canceled'

  useEffect(() => {
    if (!session || finished) return
    const timer = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(timer)
  }, [session, finished, load])

  const info = order ? ORDER_STATUS[order.status] : null
  const canceled = order?.status === 'canceled'
  const labels = order ? stepLabels(order.fulfillment_type) : []

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
          <h1 className="text-[16px] font-extrabold">Acompanhar pedido</h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-4">
        {!session ? (
          <LoginPanel />
        ) : error ? (
          <p className="rounded-2xl bg-[var(--surface)] p-5 text-[14px] font-medium text-[var(--red)] ring-1 ring-[var(--border)]">
            {error}
          </p>
        ) : !order ? (
          <p className="py-16 text-center text-[14px] text-[var(--muted)]">Carregando…</p>
        ) : (
          <>
            <section className="rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
              <p className="text-[12.5px] text-[var(--muted)]">Pedido feito em {formatDateTime(order.created_at)}</p>
              <h2 className="mt-1 text-[21px] font-extrabold" style={{ color: canceled ? 'var(--red)' : 'var(--ink)' }}>
                {info?.label ?? order.status}
              </h2>
              {!finished && order.estimated_delivery_minutes && (
                <p className="mt-1 text-[13.5px] text-[var(--ink-soft)]">
                  Previsão: cerca de {order.estimated_delivery_minutes} min
                </p>
              )}

              {!canceled && (
                <ol className="mt-5 flex flex-col gap-3">
                  {labels.map((label, index) => {
                    const done = (info?.step ?? 0) >= index
                    const current = (info?.step ?? 0) === index
                    return (
                      <li key={label} className="flex items-center gap-3">
                        <span
                          className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white"
                          style={{ background: done ? 'var(--brand)' : 'rgba(31,35,40,0.14)' }}
                        >
                          {done && <CheckIcon className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className={`text-[14px] ${current ? 'font-extrabold' : done ? 'font-semibold' : ''}`}
                          style={{ color: done ? 'var(--ink)' : 'var(--muted)' }}
                        >
                          {label}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
              {canceled && (
                <p className="mt-2 text-[13.5px] text-[var(--ink-soft)]">
                  Este pedido foi cancelado. Se tiver dúvidas, fale com a loja.
                </p>
              )}
            </section>

            <section className="rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
              <h3 className="mb-3 text-[15px] font-extrabold">Itens</h3>
              <ul className="flex flex-col gap-3">
                {order.items.map((item, index) => (
                  <li key={index} className="flex justify-between gap-3 text-[13.5px]">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">
                        {item.quantity}x {item.name}
                      </p>
                      {item.observation && (
                        <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">{item.observation}</p>
                      )}
                    </div>
                    <span className="flex-none font-semibold">{formatCurrency(item.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-[var(--border)] pt-3 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-soft)]">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-soft)]">Taxa de entrega</span>
                  <span>{order.delivery_fee ? formatCurrency(order.delivery_fee) : 'Grátis'}</span>
                </div>
                <div className="flex justify-between pt-1 text-[16px] font-extrabold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-[var(--surface)] p-5 text-[13.5px] ring-1 ring-[var(--border)]">
              <h3 className="mb-2 text-[15px] font-extrabold">
                {order.fulfillment_type === 'pickup' ? 'Retirada na loja' : 'Entrega'}
              </h3>
              {order.delivery_address && (
                <p className="text-[var(--ink-soft)]">
                  {order.delivery_address.address}
                  {order.delivery_address.number ? `, ${order.delivery_address.number}` : ''}
                  {order.delivery_address.complement ? ` · ${order.delivery_address.complement}` : ''}
                  {order.delivery_address.district ? ` · ${order.delivery_address.district}` : ''}
                </p>
              )}
              <p className="mt-2 text-[var(--ink-soft)]">
                Pagamento: {PAYMENT_LABEL[order.payment_method]} (na entrega)
              </p>
              {order.customer_notes && <p className="mt-2 text-[var(--ink-soft)]">Obs: {order.customer_notes}</p>}
            </section>

            <button
              type="button"
              onClick={() => navigate(`/${slug}/pedidos`)}
              className="h-12 rounded-full bg-[var(--surface)] text-[14px] font-bold text-[var(--ink)] ring-1 ring-[var(--border)]"
            >
              Ver todos os meus pedidos
            </button>
          </>
        )}
      </div>
    </div>
  )
}

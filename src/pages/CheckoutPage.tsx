import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AddressForm } from '../components/AddressForm'
import { ArrowLeftIcon, PinIcon } from '../components/icons'
import { LoginPanel } from '../components/LoginPanel'
import { ApiError } from '../lib/api'
import { lineTotal } from '../lib/cart'
import { formatCpfCnpj, formatCurrency, normalizeName } from '../lib/format'
import {
  checkout,
  listAddresses,
  PAYMENT_LABEL,
  type CustomerAddress,
  type FulfillmentType,
  type PaymentMethod,
} from '../lib/storefront'
import { useStore } from '../store/StoreContext'

interface CheckoutPageProps {
  navigate: (path: string, options?: { replace?: boolean }) => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
      <h2 className="mb-3 text-[15px] font-extrabold text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  )
}

function Choice({
  active,
  onClick,
  title,
  subtitle,
  disabled,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition disabled:opacity-50 ${
        active ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,white)]' : 'border-[var(--border)]'
      }`}
    >
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
          active ? 'border-[var(--brand)]' : 'border-[var(--muted)]'
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-[var(--ink)]">{title}</span>
        {subtitle && <span className="block text-[12.5px] text-[var(--ink-soft)]">{subtitle}</span>}
      </span>
    </button>
  )
}

function addressLine(address: CustomerAddress): string {
  return [
    `${address.address}${address.number ? `, ${address.number}` : ''}`,
    address.complement,
    address.district,
    address.city && address.state ? `${address.city}/${address.state}` : address.city,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function CheckoutPage({ navigate }: CheckoutPageProps) {
  const { slug, shop, cart, cartSubtotal, clearCart, session, customer, signOut } = useStore()
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery')
  const [payment, setPayment] = useState<PaymentMethod>('pix')
  const [changeFor, setChangeFor] = useState('')
  const [cpf, setCpf] = useState('')
  const [notes, setNotes] = useState('')
  const [disposables, setDisposables] = useState(true)
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null)
  const [addressId, setAddressId] = useState<string | null>(null)
  const [addingAddress, setAddingAddress] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    listAddresses(slug, session.session_token)
      .then((list) => {
        if (cancelled) return
        setAddresses(list)
        setAddressId((current) => current ?? list.find((item) => item.is_default)?.id ?? list[0]?.id ?? null)
        if (list.length === 0) setAddingAddress(true)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) signOut()
        else setAddresses([])
      })
    return () => {
      cancelled = true
    }
  }, [slug, session, signOut])

  const neighborhoods = shop?.neighborhoods ?? []
  const selectedAddress = addresses?.find((item) => item.id === addressId) ?? null

  const delivery = useMemo(() => {
    if (!shop) return { fee: 0, minutes: null as number | null, blocked: null as string | null }
    if (fulfillment === 'pickup') return { fee: 0, minutes: shop.estimated_delivery_minutes, blocked: null }
    if (!neighborhoods.length) {
      return { fee: shop.delivery_fee, minutes: shop.estimated_delivery_minutes, blocked: null }
    }
    if (!selectedAddress) return { fee: 0, minutes: null, blocked: null }
    const match = neighborhoods.find((item) => normalizeName(item.name) === normalizeName(selectedAddress.district))
    if (!match) {
      return {
        fee: 0,
        minutes: null,
        blocked: `Ainda não entregamos no bairro ${selectedAddress.district || 'informado'}. Escolha outro endereço ou retire na loja.`,
      }
    }
    return {
      fee: match.delivery_fee,
      minutes: match.estimated_minutes ?? shop.estimated_delivery_minutes,
      blocked: null,
    }
  }, [shop, fulfillment, neighborhoods, selectedAddress])

  if (!shop) return null

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[560px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[16px] font-bold">Sua sacola está vazia.</p>
        <button
          type="button"
          onClick={() => navigate(`/${slug}`)}
          className="h-12 rounded-full bg-[var(--brand)] px-8 text-[14.5px] font-bold text-white"
        >
          Voltar ao cardápio
        </button>
      </div>
    )
  }

  const total = cartSubtotal + delivery.fee
  const belowMinimum = shop.minimum_order_value > 0 && cartSubtotal < shop.minimum_order_value
  const needsAddress = fulfillment === 'delivery' && !selectedAddress
  const canSubmit = !!session && shop.is_open_now && !belowMinimum && !needsAddress && !delivery.blocked && !submitting

  async function handleSubmit() {
    if (!session || !canSubmit) return
    setSubmitting(true)
    setError(null)

    const noteParts: string[] = []
    if (payment === 'cash' && changeFor.trim()) noteParts.push(`Troco para R$ ${changeFor.trim()}`)
    if (notes.trim()) noteParts.push(notes.trim())

    try {
      const result = await checkout(slug, session.session_token, {
        items: cart.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
          note: line.note || undefined,
          complements: line.complements.map((c) => ({
            complement_id: c.complement_id,
            complement_product_id: c.complement_product_id,
            quantity: c.quantity,
          })),
        })),
        fulfillment_type: fulfillment,
        payment_method: payment,
        delivery_customer_address_id: fulfillment === 'delivery' ? (addressId ?? undefined) : undefined,
        customer_notes: noteParts.join(' | ') || undefined,
        customer_document: cpf.replace(/\D/g, '') || undefined,
        include_disposables: disposables,
      })
      clearCart()
      navigate(`/${slug}/pedidos/${result.delivery_order_id}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut()
        setError('Sua sessão expirou. Entre novamente para finalizar.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Não foi possível finalizar o pedido.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh pb-10">
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(`/${slug}`)}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--page)]"
          >
            <ArrowLeftIcon className="h-4.5 w-4.5" />
          </button>
          <h1 className="text-[16px] font-extrabold">Finalizar pedido</h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-4">
        {!session ? (
          <LoginPanel />
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)] px-5 py-3.5 ring-1 ring-[var(--border)]">
            <div>
              <p className="text-[12px] text-[var(--muted)]">Pedido em nome de</p>
              <p className="text-[14.5px] font-bold">{customer?.name}</p>
            </div>
            <button type="button" onClick={signOut} className="text-[12.5px] font-semibold text-[var(--ink-soft)]">
              Trocar
            </button>
          </div>
        )}

        <Section title="Como você quer receber?">
          <div className="flex flex-col gap-2">
            <Choice
              active={fulfillment === 'delivery'}
              onClick={() => setFulfillment('delivery')}
              title="Entrega"
              subtitle={
                delivery.minutes && fulfillment === 'delivery'
                  ? `Cerca de ${delivery.minutes} min`
                  : 'Receba no seu endereço'
              }
            />
            <Choice
              active={fulfillment === 'pickup'}
              onClick={() => setFulfillment('pickup')}
              title="Retirar na loja"
              subtitle="Sem taxa de entrega"
            />
          </div>
        </Section>

        {session && fulfillment === 'delivery' && (
          <Section title="Endereço de entrega">
            {addresses === null ? (
              <p className="text-[13px] text-[var(--muted)]">Carregando…</p>
            ) : (
              <div className="flex flex-col gap-2">
                {addresses.map((address) => (
                  <Choice
                    key={address.id}
                    active={address.id === addressId}
                    onClick={() => setAddressId(address.id)}
                    title={address.label || `${address.address}${address.number ? `, ${address.number}` : ''}`}
                    subtitle={addressLine(address)}
                  />
                ))}
                {addingAddress ? (
                  <AddressForm
                    neighborhoods={neighborhoods}
                    onCancel={() => setAddingAddress(false)}
                    onSaved={(saved) => {
                      setAddresses((current) => [saved, ...(current ?? [])])
                      setAddressId(saved.id)
                      setAddingAddress(false)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingAddress(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-3 text-[13.5px] font-bold text-[var(--brand)]"
                  >
                    <PinIcon className="h-4 w-4" />
                    Adicionar novo endereço
                  </button>
                )}
              </div>
            )}
            {delivery.blocked && <p className="mt-3 text-[13px] font-medium text-[var(--red)]">{delivery.blocked}</p>}
          </Section>
        )}

        <Section title="Pagamento na entrega">
          <div className="flex flex-col gap-2">
            {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((method) => (
              <Choice
                key={method}
                active={payment === method}
                onClick={() => setPayment(method)}
                title={PAYMENT_LABEL[method]}
                subtitle={
                  method === 'card'
                    ? 'Débito ou crédito na maquininha'
                    : method === 'pix'
                      ? 'Pague na entrega ou na retirada'
                      : 'Pague em dinheiro ao receber'
                }
              />
            ))}
          </div>
          {payment === 'cash' && (
            <label className="mt-3 block">
              <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Precisa de troco para quanto?</span>
              <input
                value={changeFor}
                onChange={(event) => setChangeFor(event.target.value.replace(/[^\d.,]/g, '').slice(0, 10))}
                inputMode="decimal"
                placeholder="Ex.: 100"
                className="mt-1 h-12 w-full rounded-xl bg-[var(--page)] px-4 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </label>
          )}
        </Section>

        <Section title="Detalhes">
          <label className="block">
            <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">CPF/CNPJ na nota (opcional)</span>
            <input
              value={cpf}
              onChange={(event) => setCpf(formatCpfCnpj(event.target.value))}
              inputMode="numeric"
              className="mt-1 h-12 w-full rounded-xl bg-[var(--page)] px-4 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Observações do pedido</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 120))}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl bg-[var(--page)] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </label>
          <label className="mt-3 flex items-center gap-3 text-[14px]">
            <input
              type="checkbox"
              checked={disposables}
              onChange={(event) => setDisposables(event.target.checked)}
              className="h-5 w-5 accent-[var(--brand)]"
            />
            Enviar copos e descartáveis
          </label>
        </Section>

        <Section title="Resumo">
          <ul className="flex flex-col gap-2 text-[13.5px]">
            {cart.map((line) => (
              <li key={line.key} className="flex justify-between gap-3">
                <span className="text-[var(--ink-soft)]">
                  {line.quantity}x {line.name}
                </span>
                <span className="flex-none font-semibold">{formatCurrency(lineTotal(line))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--border)] pt-3 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">Subtotal</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ink-soft)]">Taxa de entrega</span>
              <span>
                {fulfillment === 'pickup'
                  ? 'Grátis'
                  : delivery.blocked || (neighborhoods.length && !selectedAddress)
                    ? '—'
                    : delivery.fee === 0
                      ? 'Grátis'
                      : formatCurrency(delivery.fee)}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-[16px] font-extrabold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </Section>

        {belowMinimum && (
          <p className="text-[13px] font-medium text-[var(--amber)]">
            Pedido mínimo de {formatCurrency(shop.minimum_order_value)}.
          </p>
        )}
        {!shop.is_open_now && (
          <p className="text-[13px] font-medium text-[var(--red)]">A loja está fechada no momento.</p>
        )}
        {error && <p className="text-[13.5px] font-medium text-[var(--red)]">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-14 rounded-full bg-[var(--brand)] text-[15px] font-bold text-white disabled:opacity-50"
        >
          {submitting ? 'Enviando pedido…' : `Fazer pedido · ${formatCurrency(total)}`}
        </button>
      </div>
    </div>
  )
}

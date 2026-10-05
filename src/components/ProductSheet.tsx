import { useMemo, useState } from 'react'
import { effectiveMinimum, productCover, type CartComplementChoice, type CartLine } from '../lib/cart'
import { formatCurrency } from '../lib/format'
import type { ComplementGroup, MenuProduct } from '../lib/storefront'
import { CheckIcon, ImageIcon, MinusIcon, PlusIcon } from './icons'
import { Sheet } from './Sheet'

interface ProductSheetProps {
  product: MenuProduct | null
  canOrder: boolean
  onClose: () => void
  onAdd: (line: Omit<CartLine, 'key'>) => void
}

type Selection = Record<string, Record<string, number>>

function groupCounts(group: ComplementGroup, selection: Selection) {
  const chosen = selection[group.id] ?? {}
  let total = 0
  let free = 0
  for (const option of group.options) {
    const quantity = chosen[option.id] ?? 0
    total += quantity
    if (option.sale_value === 0) free += quantity
  }
  return { total, free }
}

function groupHint(group: ComplementGroup): string {
  const minimum = effectiveMinimum(group)
  if (minimum > 0 && group.maximum > 0 && minimum === group.maximum)
    return `Escolha ${minimum} ${minimum === 1 ? 'opção' : 'opções'}`
  if (minimum > 0) return `Escolha no mínimo ${minimum}`
  if (group.maximum > 0) return `Escolha até ${group.maximum}`
  return 'Opcional'
}

export function ProductSheet({ product, canOrder, onClose, onAdd }: ProductSheetProps) {
  if (!product) return null
  return <ProductSheetBody key={product.id} product={product} canOrder={canOrder} onClose={onClose} onAdd={onAdd} />
}

function ProductSheetBody({ product, canOrder, onClose, onAdd }: ProductSheetProps & { product: MenuProduct }) {
  const minQuantity = Math.max(product.minimum_sales_quantity || 1, 1)
  const [quantity, setQuantity] = useState(minQuantity)
  const [note, setNote] = useState('')
  const [selection, setSelection] = useState<Selection>({})
  const [imageIndex, setImageIndex] = useState(0)

  const images = product.images.length ? product.images : []
  const cover = images[imageIndex]?.image_url ?? productCover(product)

  const extras = useMemo(() => {
    let total = 0
    for (const group of product.complements) {
      for (const option of group.options) {
        total += option.sale_value * (selection[group.id]?.[option.id] ?? 0)
      }
    }
    return total
  }, [product.complements, selection])

  const missingGroup = product.complements.find((group) => {
    const { total } = groupCounts(group, selection)
    return total < effectiveMinimum(group)
  })

  function toggleSingle(group: ComplementGroup, optionId: string) {
    setSelection((current) => {
      const selected = current[group.id]?.[optionId]
      return { ...current, [group.id]: selected ? {} : { [optionId]: 1 } }
    })
  }

  function changeOption(group: ComplementGroup, optionId: string, delta: number) {
    setSelection((current) => {
      const groupSelection = { ...(current[group.id] ?? {}) }
      const option = group.options.find((item) => item.id === optionId)
      const next = Math.max((groupSelection[optionId] ?? 0) + delta, 0)
      const { free } = groupCounts(group, current)
      if (delta > 0 && option?.sale_value === 0 && group.maximum > 0 && free >= group.maximum) return current
      if (next === 0) delete groupSelection[optionId]
      else groupSelection[optionId] = next
      return { ...current, [group.id]: groupSelection }
    })
  }

  function handleAdd() {
    if (missingGroup) return
    const complements: CartComplementChoice[] = []
    for (const group of product.complements) {
      for (const option of group.options) {
        const optionQuantity = selection[group.id]?.[option.id] ?? 0
        if (optionQuantity > 0) {
          complements.push({
            complement_id: group.id,
            complement_product_id: option.id,
            label: option.description,
            quantity: optionQuantity,
            unit_price: option.sale_value,
          })
        }
      }
    }
    onAdd({
      product_id: product.id,
      name: product.name,
      image_url: productCover(product),
      base_price: product.sale_value,
      quantity,
      note: note.trim(),
      complements,
    })
    onClose()
  }

  const total = (product.sale_value + extras) * quantity

  return (
    <Sheet
      open
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex flex-none items-center gap-1 rounded-full bg-[var(--page)] p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(q - 1, minQuantity))}
              disabled={quantity <= minQuantity}
              aria-label="Diminuir"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--brand)] disabled:text-[var(--muted)]"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-[15px] font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Aumentar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--brand)]"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canOrder || !!missingGroup}
            className="flex h-12 flex-1 items-center justify-between rounded-full bg-[var(--brand)] px-5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            <span>{missingGroup ? `Escolha: ${missingGroup.name}` : 'Adicionar'}</span>
            <span>{formatCurrency(total)}</span>
          </button>
        </div>
      }
    >
      <div className="relative aspect-[16/10] w-full bg-[var(--page)]">
        {cover ? (
          <img src={cover} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            <ImageIcon className="h-12 w-12 opacity-50" />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[var(--ink)] shadow"
        >
          ✕
        </button>
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setImageIndex(index)}
              className={`h-14 w-14 flex-none overflow-hidden rounded-lg ring-2 ${
                index === imageIndex ? 'ring-[var(--brand)]' : 'ring-transparent'
              }`}
            >
              <img src={image.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="px-5 pt-4 pb-5">
        <h2 className="text-[19px] leading-tight font-extrabold text-[var(--ink)]">{product.name}</h2>
        {product.description && (
          <p className="mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ink-soft)]">
            {product.description}
          </p>
        )}
        <p className="mt-2 text-[16px] font-extrabold text-[var(--ink)]">{formatCurrency(product.sale_value)}</p>
        {minQuantity > 1 && <p className="mt-1 text-[12.5px] text-[var(--amber)]">Quantidade mínima: {minQuantity}</p>}

        {product.complements.map((group) => {
          const counts = groupCounts(group, selection)
          const single = group.maximum === 1
          const satisfied = counts.total >= effectiveMinimum(group)
          return (
            <section key={group.id} className="mt-6">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--page)] px-4 py-3">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--ink)]">{group.name}</h3>
                  <p className="text-[12px] text-[var(--ink-soft)]">{groupHint(group)}</p>
                </div>
                {effectiveMinimum(group) > 0 && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background: satisfied ? 'rgba(31,143,78,0.12)' : 'rgba(31,35,40,0.08)',
                      color: satisfied ? 'var(--green)' : 'var(--ink-soft)',
                    }}
                  >
                    {satisfied ? 'OK' : 'Obrigatório'}
                  </span>
                )}
              </div>

              <ul className="divide-y divide-[var(--border)]">
                {group.options.map((option) => {
                  const chosen = selection[group.id]?.[option.id] ?? 0
                  return (
                    <li key={option.id} className="flex items-center gap-3 py-3">
                      {option.image_url && (
                        <img src={option.image_url} alt="" className="h-11 w-11 flex-none rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[var(--ink)]">{option.description}</p>
                        {option.sale_value > 0 && (
                          <p className="text-[12.5px] text-[var(--ink-soft)]">+ {formatCurrency(option.sale_value)}</p>
                        )}
                      </div>
                      {single ? (
                        <button
                          type="button"
                          onClick={() => toggleSingle(group, option.id)}
                          aria-pressed={chosen > 0}
                          className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 ${
                            chosen > 0
                              ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                              : 'border-[var(--border)] text-transparent'
                          }`}
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="flex flex-none items-center gap-2">
                          {chosen > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => changeOption(group, option.id, -1)}
                                aria-label="Diminuir"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--page)] text-[var(--brand)]"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <span className="w-4 text-center text-[14px] font-bold">{chosen}</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => changeOption(group, option.id, 1)}
                            aria-label="Aumentar"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--page)] text-[var(--brand)]"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        <label className="mt-6 block">
          <span className="text-[13px] font-bold text-[var(--ink)]">Alguma observação?</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 150))}
            rows={2}
            placeholder="Ex.: bem gelada, sem gelo, trocar o sabor..."
            className="mt-1.5 w-full resize-none rounded-xl bg-[var(--page)] px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </label>
      </div>
    </Sheet>
  )
}

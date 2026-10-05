import { formatCurrency } from '../lib/format'
import { productCover } from '../lib/cart'
import type { MenuProduct } from '../lib/storefront'
import { ImageIcon } from './icons'

interface ProductCardProps {
  product: MenuProduct
  onSelect: (product: MenuProduct) => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const cover = productCover(product)
  const hasOptions = product.complements.length > 0

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="flex w-full items-stretch gap-3 rounded-2xl bg-[var(--surface)] p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[var(--border)] transition active:scale-[0.99]"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-[14.5px] leading-snug font-bold text-[var(--ink)]">{product.name}</h3>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[var(--ink-soft)]">{product.description}</p>
        )}
        <p className="mt-auto pt-2 text-[14px] font-extrabold text-[var(--ink)]">
          {hasOptions && <span className="mr-1 text-[11.5px] font-semibold text-[var(--muted)]">a partir de</span>}
          {formatCurrency(product.sale_value)}
        </p>
      </div>
      <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-xl bg-[var(--page)] text-[var(--muted)]">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-7 w-7 opacity-60" />
        )}
      </div>
    </button>
  )
}

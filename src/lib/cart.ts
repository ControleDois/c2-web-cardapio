import type { ComplementGroup, MenuProduct } from './storefront'

export interface CartComplementChoice {
  complement_id: string
  complement_product_id: string
  label: string
  quantity: number
  unit_price: number
}

export interface CartLine {
  key: string
  product_id: string
  name: string
  image_url: string | null
  base_price: number
  quantity: number
  note: string
  complements: CartComplementChoice[]
}

export function lineUnitPrice(line: CartLine): number {
  return line.base_price + line.complements.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)
}

export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}

export function lineSignature(productId: string, note: string, complements: CartComplementChoice[]): string {
  const chosen = complements
    .map((c) => `${c.complement_id}:${c.complement_product_id}x${c.quantity}`)
    .sort()
    .join(',')
  return `${productId}|${note.trim()}|${chosen}`
}

export function effectiveMinimum(group: ComplementGroup): number {
  return group.required ? Math.max(group.minimum, 1) : group.minimum
}

export function productCover(product: MenuProduct): string | null {
  const cover = product.images.find((image) => image.is_cover) ?? product.images[0]
  return cover?.image_url ?? null
}

const storageKey = (slug: string) => `cardapio/cart/${slug}`

export function loadCart(slug: string): CartLine[] {
  try {
    const raw = localStorage.getItem(storageKey(slug))
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function persistCart(slug: string, lines: CartLine[]) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(lines))
  } catch {
    // sem armazenamento: o carrinho vale só nesta aba
  }
}

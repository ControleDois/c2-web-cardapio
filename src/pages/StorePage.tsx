import { useEffect, useMemo, useRef, useState } from 'react'
import { CartBar, CartSheet } from '../components/CartSheet'
import { CategoryNav } from '../components/CategoryNav'
import { SearchIcon } from '../components/icons'
import { ProductCard } from '../components/ProductCard'
import { ProductSheet } from '../components/ProductSheet'
import { StoreHeader } from '../components/StoreHeader'
import { normalizeName } from '../lib/format'
import type { MenuCategory, MenuProduct } from '../lib/storefront'
import { useStore } from '../store/StoreContext'

const FIRST_CATEGORIES = ['ofertas', 'novidades']

function orderCategories(categories: MenuCategory[]): MenuCategory[] {
  const weight = (category: MenuCategory) => {
    const name = normalizeName(category.name)
    const first = FIRST_CATEGORIES.indexOf(name)
    if (first >= 0) return first
    if (category.id === 'uncategorized') return 1000
    return 100
  }
  return [...categories]
    .filter((category) => category.products.length > 0)
    .sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name, 'pt-BR'))
}

interface StorePageProps {
  navigate: (path: string) => void
}

export function StorePage({ navigate }: StorePageProps) {
  const { slug, shop, menu, addLine } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MenuProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map())

  const categories = useMemo(() => {
    const ordered = orderCategories(menu?.categories ?? [])
    const term = normalizeName(query)
    if (!term) return ordered
    return ordered
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) => normalizeName(product.name).includes(term) || normalizeName(product.description).includes(term)
        ),
      }))
      .filter((category) => category.products.length > 0)
  }, [menu, query])

  useEffect(() => {
    if (query) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
          setActiveId(top.target.getAttribute('data-category'))
        }
      },
      { rootMargin: '-120px 0px -70% 0px' }
    )
    sectionsRef.current.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [categories, query])

  if (!shop) return null

  const canOrder = shop.accepting_orders

  function scrollToCategory(id: string) {
    setActiveId(id)
    sectionsRef.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-svh pb-28">
      <StoreHeader shop={shop} onOrders={() => navigate(`/${slug}/pedidos`)} />

      <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[760px]">
          <div className="px-4 pt-3">
            <label className="flex items-center gap-2.5 rounded-full bg-[var(--page)] px-4 py-2.5">
              <SearchIcon className="h-4 w-4 flex-none text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar no cardápio"
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]"
              />
            </label>
          </div>
          {!query && <CategoryNav categories={categories} activeId={activeId} onSelect={scrollToCategory} />}
        </div>
      </div>

      <main className="mx-auto max-w-[760px] px-4">
        {categories.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[var(--ink-soft)]">
            {query ? 'Nenhum produto encontrado para essa busca.' : 'O cardápio ainda não tem produtos publicados.'}
          </p>
        ) : (
          categories.map((category) => (
            <section
              key={category.id}
              data-category={category.id}
              ref={(element) => {
                if (element) sectionsRef.current.set(category.id, element)
                else sectionsRef.current.delete(category.id)
              }}
              className="category-section scroll-mt-[120px] pt-6"
            >
              <h2 className="mb-3 text-[17px] font-extrabold text-[var(--ink)]">{category.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {category.products.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={setSelected} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <ProductSheet
        product={selected}
        canOrder={canOrder}
        onClose={() => setSelected(null)}
        onAdd={(line) => {
          addLine(line)
        }}
      />
      <CartBar onOpen={() => setCartOpen(true)} />
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false)
          navigate(`/${slug}/finalizar`)
        }}
      />
    </div>
  )
}

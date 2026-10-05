import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../lib/api'
import { cartCount, cartSubtotal, lineSignature, loadCart, persistCart, type CartLine } from '../lib/cart'
import { clearSession, getSession, saveSession } from '../lib/session'
import {
  fetchMenu,
  fetchShop,
  restoreSession,
  type Customer,
  type CustomerSession,
  type Menu,
  type Shop,
} from '../lib/storefront'

type LoadStatus = 'loading' | 'ready' | 'notfound' | 'error'

interface StoreContextValue {
  slug: string
  status: LoadStatus
  errorMessage: string | null
  shop: Shop | null
  menu: Menu | null
  reload: () => void
  cart: CartLine[]
  cartCount: number
  cartSubtotal: number
  addLine: (line: Omit<CartLine, 'key'>) => void
  setLineQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  session: CustomerSession | null
  customer: Customer | null
  signIn: (session: CustomerSession) => void
  signOut: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [cart, setCart] = useState<CartLine[]>(() => loadCart(slug))
  const [session, setSession] = useState<CustomerSession | null>(() => getSession(slug))
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    Promise.all([fetchShop(slug), fetchMenu(slug)])
      .then(([shopData, menuData]) => {
        if (cancelled) return
        setShop(shopData)
        setMenu(menuData)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setStatus('notfound')
          return
        }
        setErrorMessage(error instanceof ApiError ? error.message : 'Não foi possível carregar o cardápio.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [slug, reloadKey])

  useEffect(() => {
    if (!session) return
    restoreSession(slug, session.session_token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        clearSession(slug)
        setSession(null)
      }
    })
    // valida a sessão guardada só uma vez, ao abrir a loja
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (!shop?.color_default) return
    document.documentElement.style.setProperty('--brand', shop.color_default)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', shop.color_default)
  }, [shop?.color_default])

  useEffect(() => {
    if (shop?.name) document.title = shop.name
  }, [shop?.name])

  const updateCart = useCallback(
    (updater: (lines: CartLine[]) => CartLine[]) => {
      setCart((current) => {
        const next = updater(current)
        persistCart(slug, next)
        return next
      })
    },
    [slug]
  )

  const addLine = useCallback(
    (line: Omit<CartLine, 'key'>) => {
      const key = lineSignature(line.product_id, line.note, line.complements)
      updateCart((current) => {
        const existing = current.find((item) => item.key === key)
        if (existing) {
          return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + line.quantity } : item))
        }
        return [...current, { ...line, key }]
      })
    },
    [updateCart]
  )

  const setLineQuantity = useCallback(
    (key: string, quantity: number) => {
      updateCart((current) =>
        quantity <= 0
          ? current.filter((item) => item.key !== key)
          : current.map((item) => (item.key === key ? { ...item, quantity } : item))
      )
    },
    [updateCart]
  )

  const clearCart = useCallback(() => updateCart(() => []), [updateCart])

  const signIn = useCallback(
    (next: CustomerSession) => {
      saveSession(slug, next)
      setSession(next)
    },
    [slug]
  )

  const signOut = useCallback(() => {
    clearSession(slug)
    setSession(null)
  }, [slug])

  const value = useMemo<StoreContextValue>(
    () => ({
      slug,
      status,
      errorMessage,
      shop,
      menu,
      reload: () => setReloadKey((key) => key + 1),
      cart,
      cartCount: cartCount(cart),
      cartSubtotal: cartSubtotal(cart),
      addLine,
      setLineQuantity,
      clearCart,
      session,
      customer: session?.people ?? null,
      signIn,
      signOut,
    }),
    [slug, status, errorMessage, shop, menu, cart, addLine, setLineQuantity, clearCart, session, signIn, signOut]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore precisa estar dentro de StoreProvider')
  return value
}

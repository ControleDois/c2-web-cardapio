import type { CustomerSession } from './storefront'

const key = (slug: string) => `cardapio/session/${slug}`

export function getSession(slug: string): CustomerSession | null {
  try {
    const raw = localStorage.getItem(key(slug))
    if (!raw) return null
    const session = JSON.parse(raw) as CustomerSession
    if (new Date(session.expires_at).getTime() < Date.now()) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(slug: string, session: CustomerSession) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(session))
  } catch {
    // armazenamento indisponível: a sessão vale só até recarregar
  }
}

export function clearSession(slug: string) {
  try {
    localStorage.removeItem(key(slug))
  } catch {
    // sem armazenamento
  }
}

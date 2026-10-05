import { useRoute } from './hooks/useRoute'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderPage } from './pages/OrderPage'
import { OrdersPage } from './pages/OrdersPage'
import { StorePage } from './pages/StorePage'
import { StoreProvider, useStore } from './store/StoreContext'

const DEFAULT_SLUG = import.meta.env.VITE_DEFAULT_SLUG as string | undefined

function Message({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: { label: string; run: () => void }
}) {
  return (
    <div className="mx-auto flex min-h-svh max-w-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-[20px] font-extrabold text-[var(--ink)]">{title}</h1>
      <p className="text-[14px] text-[var(--ink-soft)]">{text}</p>
      {action && (
        <button
          type="button"
          onClick={action.run}
          className="mt-2 h-12 rounded-full bg-[var(--brand)] px-8 text-[14.5px] font-bold text-white"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

function Screens({
  rest,
  navigate,
}: {
  rest: string[]
  navigate: (path: string, options?: { replace?: boolean }) => void
}) {
  const { status, errorMessage, reload } = useStore()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center text-[14px] text-[var(--muted)]">
        Carregando cardápio…
      </div>
    )
  }
  if (status === 'notfound') {
    return <Message title="Loja não encontrada" text="Confira o link ou fale com a loja." />
  }
  if (status === 'error') {
    return (
      <Message
        title="Não foi possível abrir o cardápio"
        text={errorMessage ?? ''}
        action={{ label: 'Tentar de novo', run: reload }}
      />
    )
  }

  if (rest[0] === 'finalizar') return <CheckoutPage navigate={navigate} />
  if (rest[0] === 'pedidos' && rest[1]) return <OrderPage orderId={rest[1]} navigate={navigate} />
  if (rest[0] === 'pedidos') return <OrdersPage navigate={navigate} />
  return <StorePage navigate={navigate} />
}

export default function App() {
  const { path, navigate } = useRoute()
  const parts = path.split('/').filter(Boolean)
  const slug = parts[0] ?? DEFAULT_SLUG

  if (!slug) {
    return <Message title="Cardápio digital" text="Abra o link completo da loja para ver o cardápio." />
  }

  const rest = parts[0] ? parts.slice(1) : []

  return (
    <StoreProvider key={slug} slug={slug}>
      <Screens rest={rest} navigate={navigate} />
    </StoreProvider>
  )
}

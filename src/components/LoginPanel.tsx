import { useState } from 'react'
import { ApiError } from '../lib/api'
import { formatPhone } from '../lib/format'
import { requestCode, verifyCode } from '../lib/storefront'
import { useStore } from '../store/StoreContext'

export function LoginPanel() {
  const { slug, signIn } = useStore()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const digits = phone.replace(/\D/g, '')

  async function sendCode() {
    if (digits.length < 10) {
      setError('Informe o DDD e o número do seu WhatsApp.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestCode(slug, digits)
      setCodeSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o código.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmCode() {
    setBusy(true)
    setError(null)
    try {
      signIn(await verifyCode(slug, digits, code.trim(), name.trim() || undefined))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar o código.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
      <h2 className="text-[16px] font-extrabold text-[var(--ink)]">Entre para finalizar o pedido</h2>
      <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
        Enviamos um código de 6 dígitos para o seu WhatsApp. Sem senha e sem cadastro demorado.
      </p>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">WhatsApp</span>
        <input
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(65) 90000-0000"
          disabled={codeSent}
          className="mt-1 h-12 w-full rounded-xl bg-[var(--page)] px-4 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60"
        />
      </label>

      {codeSent && (
        <>
          <label className="mt-3 block">
            <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Seu nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Como podemos te chamar?"
              className="mt-1 h-12 w-full rounded-xl bg-[var(--page)] px-4 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Código recebido no WhatsApp</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="mt-1 h-12 w-full rounded-xl bg-[var(--page)] px-4 text-center text-[20px] tracking-[0.4em] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </label>
        </>
      )}

      {error && <p className="mt-3 text-[13px] font-medium text-[var(--red)]">{error}</p>}

      <button
        type="button"
        onClick={codeSent ? confirmCode : sendCode}
        disabled={busy || (codeSent && code.length < 6)}
        className="mt-4 h-12 w-full rounded-full bg-[var(--brand)] text-[14.5px] font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Aguarde…' : codeSent ? 'Entrar' : 'Receber código no WhatsApp'}
      </button>

      {codeSent && (
        <button
          type="button"
          onClick={() => {
            setCodeSent(false)
            setCode('')
            setError(null)
          }}
          className="mt-2 w-full text-[13px] font-semibold text-[var(--ink-soft)]"
        >
          Trocar número ou reenviar código
        </button>
      )}
    </div>
  )
}

import { useState } from 'react'
import { ApiError } from '../lib/api'
import { formatCep, normalizeName } from '../lib/format'
import { lookupCep, saveAddress, type CustomerAddress, type Neighborhood } from '../lib/storefront'
import { useStore } from '../store/StoreContext'

interface AddressFormProps {
  neighborhoods: Neighborhood[]
  onSaved: (address: CustomerAddress) => void
  onCancel: () => void
}

const inputClass =
  'mt-1 h-12 w-full rounded-xl bg-[var(--page)] px-4 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]'

export function AddressForm({ neighborhoods, onSaved, onCancel }: AddressFormProps) {
  const { slug, session } = useStore()
  const [zip, setZip] = useState('')
  const [address, setAddress] = useState('')
  const [number, setNumber] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [complement, setComplement] = useState('')
  const [reference, setReference] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fixedDistricts = neighborhoods.length > 0

  async function handleCep(value: string) {
    const formatted = formatCep(value)
    setZip(formatted)
    if (formatted.replace(/\D/g, '').length !== 8) return
    try {
      const result = await lookupCep(slug, formatted)
      setAddress(result.address || '')
      setCity(result.city || '')
      setState(result.state || '')
      if (fixedDistricts) {
        const match = neighborhoods.find((item) => normalizeName(item.name) === normalizeName(result.district))
        if (match) setDistrict(match.name)
      } else {
        setDistrict(result.district || '')
      }
    } catch {
      // CEP não encontrado: o cliente preenche à mão
    }
  }

  async function handleSave() {
    if (!session) return
    if (!address.trim() || !number.trim()) {
      setError('Informe a rua e o número.')
      return
    }
    if (!district.trim()) {
      setError('Informe o bairro.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await saveAddress(slug, session.session_token, {
        label: label.trim() || undefined,
        zip_code: zip.replace(/\D/g, '') || undefined,
        address: address.trim(),
        number: number.trim(),
        district: district.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        complement: complement.trim() || undefined,
        reference: reference.trim() || undefined,
        is_default: true,
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o endereço.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--page)] p-4">
      <div className="grid grid-cols-6 gap-3">
        <label className="col-span-2 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">CEP</span>
          <input
            value={zip}
            onChange={(event) => handleCep(event.target.value)}
            inputMode="numeric"
            placeholder="00000-000"
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-4 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Rua</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-2 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Número</span>
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-4 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Bairro</span>
          {fixedDistricts ? (
            <select
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              className={`${inputClass} bg-[var(--surface)]`}
            >
              <option value="">Selecione o bairro</option>
              {neighborhoods.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              className={`${inputClass} bg-[var(--surface)]`}
            />
          )}
        </label>
        <label className="col-span-4 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Cidade</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-2 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">UF</span>
          <input
            value={state}
            onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))}
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-6 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Complemento</span>
          <input
            value={complement}
            onChange={(event) => setComplement(event.target.value)}
            placeholder="Apto, bloco, casa…"
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-6 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Ponto de referência</span>
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
        <label className="col-span-6 block">
          <span className="text-[12.5px] font-bold text-[var(--ink-soft)]">Apelido (opcional)</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Casa, Trabalho…"
            className={`${inputClass} bg-[var(--surface)]`}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-[13px] font-medium text-[var(--red)]">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-full bg-[var(--surface)] text-[14px] font-bold text-[var(--ink-soft)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="h-11 flex-1 rounded-full bg-[var(--brand)] text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Salvar endereço'}
        </button>
      </div>
    </div>
  )
}

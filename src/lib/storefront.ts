import { apiGet, apiPost } from './api'

export interface OpeningHour {
  weekday: number
  enabled?: boolean
  opens: string
  closes: string
}

export interface Neighborhood {
  name: string
  delivery_fee: number
  estimated_minutes: number | null
}

export interface Shop {
  link_url: string
  name: string
  color_default: string | null
  banner_url: string | null
  accepting_orders: boolean
  is_open_now: boolean
  delivery_fee: number
  minimum_order_value: number
  estimated_delivery_minutes: number | null
  opening_hours: OpeningHour[]
  neighborhoods: Neighborhood[]
}

export interface ComplementOption {
  id: string
  description: string
  sale_value: number
  image_url: string | null
}

export interface ComplementGroup {
  id: string
  name: string
  required: boolean
  minimum: number
  maximum: number
  options: ComplementOption[]
}

export interface MenuProduct {
  id: string
  name: string
  description: string | null
  sale_value: number
  minimum_sales_quantity: number
  images: { id: string; image_url: string; is_cover: boolean }[]
  complements: ComplementGroup[]
}

export interface MenuCategory {
  id: string
  name: string
  products: MenuProduct[]
}

export interface Menu {
  categories: MenuCategory[]
}

export interface Customer {
  id: string
  name: string
  phone: string
}

export interface CustomerSession {
  session_token: string
  expires_at: string
  people: Customer
}

export interface CustomerAddress {
  id: string
  label: string | null
  zip_code: string | null
  address: string
  number: string | null
  district: string | null
  city: string | null
  state: string | null
  complement: string | null
  reference: string | null
  is_default: boolean
}

export interface NewAddress {
  label?: string
  zip_code?: string
  address: string
  number?: string
  district?: string
  city?: string
  state?: string
  complement?: string
  reference?: string
  is_default?: boolean
}

export interface CepResult {
  zip_code: string
  address: string
  district: string
  city: string
  state: string
}

export type PaymentMethod = 'pix' | 'card' | 'cash'
export type FulfillmentType = 'delivery' | 'pickup'

export interface CheckoutItem {
  product_id: string
  quantity: number
  note?: string
  complements: { complement_id: string; complement_product_id: string; quantity: number }[]
}

export interface CheckoutPayload {
  items: CheckoutItem[]
  fulfillment_type: FulfillmentType
  payment_method: PaymentMethod
  delivery_customer_address_id?: string
  customer_notes?: string
  customer_document?: string
  include_disposables: boolean
}

export interface CheckoutResult {
  delivery_order_id: string
  food_table_number: number
  status: string
  subtotal: number
  delivery_fee: number
  total: number
  estimated_delivery_minutes: number | null
}

export interface OrderItem {
  name: string
  quantity: number
  unit_price: number
  total: number
  observation: string | null
}

export interface OrderDetail {
  id: string
  status: string
  subtotal: number
  delivery_fee: number
  total: number
  fulfillment_type: FulfillmentType
  payment_method: PaymentMethod
  customer_notes: string | null
  food_table_number: number | null
  created_at: string
  estimated_delivery_minutes: number | null
  delivery_address: {
    address: string
    number: string | null
    district: string | null
    city: string | null
    complement: string | null
  } | null
  items: OrderItem[]
}

export interface OrderSummary {
  id: string
  status: string
  total: number
  fulfillment_type: FulfillmentType
  created_at: string
}

const base = (slug: string) => `/connect/delivery/${encodeURIComponent(slug)}`

export const fetchShop = (slug: string) => apiGet<Shop>(base(slug))
export const fetchMenu = (slug: string) => apiGet<Menu>(`${base(slug)}/menu`)

export const requestCode = (slug: string, phone: string) =>
  apiPost<{ message: string }>(`${base(slug)}/customer/request-code`, { phone })

export const verifyCode = (slug: string, phone: string, code: string, name?: string) =>
  apiPost<CustomerSession>(`${base(slug)}/customer/verify-code`, { phone, code, name })

export const restoreSession = (slug: string, sessionToken: string) =>
  apiPost<{ people: Customer }>(`${base(slug)}/customer/session`, { session_token: sessionToken })

export const listAddresses = (slug: string, sessionToken: string) =>
  apiGet<CustomerAddress[]>(`${base(slug)}/customer/addresses`, { session_token: sessionToken })

export const saveAddress = (slug: string, sessionToken: string, address: NewAddress) =>
  apiPost<CustomerAddress>(`${base(slug)}/customer/addresses`, { ...address, session_token: sessionToken })

export const lookupCep = (slug: string, cep: string) =>
  apiGet<CepResult>(`${base(slug)}/customer/cep/${cep.replace(/\D/g, '')}`)

export const checkout = (slug: string, sessionToken: string, payload: CheckoutPayload) =>
  apiPost<CheckoutResult>(`${base(slug)}/checkout`, { ...payload, session_token: sessionToken })

export const fetchOrder = (slug: string, sessionToken: string, orderId: string) =>
  apiGet<OrderDetail>(`${base(slug)}/orders/${orderId}`, { session_token: sessionToken })

export const listOrders = (slug: string, sessionToken: string) =>
  apiGet<OrderSummary[]>(`${base(slug)}/orders`, { session_token: sessionToken })

export const ORDER_STATUS: Record<string, { label: string; step: number }> = {
  pending: { label: 'Aguardando confirmação', step: 0 },
  confirmed: { label: 'Pedido confirmado', step: 1 },
  preparing: { label: 'Em preparo', step: 2 },
  ready_for_pickup: { label: 'Pronto', step: 3 },
  out_for_delivery: { label: 'Saiu para entrega', step: 3 },
  completed: { label: 'Entregue', step: 4 },
  canceled: { label: 'Cancelado', step: -1 },
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  card: 'Cartão',
  cash: 'Dinheiro',
}

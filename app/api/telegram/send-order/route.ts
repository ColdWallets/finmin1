import { NextResponse } from "next/server"

// === ENV ===
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
  process.env.TELEGRAM_BOT_USERNAME ||
  ""

const ADMIN_IDS: string[] = String(process.env.TELEGRAM_ADMIN_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean)

// --- helpers
async function tg(method: string, payload: any) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const txt = await res.text()
  let data: any
  try { data = JSON.parse(txt) } catch {}
  if (!res.ok || (data && data.ok === false)) {
    const desc = data?.description || txt
    console.error(`[telegram] ${method} failed: ${desc}`)
    throw new Error(desc)
  }
  return data?.result
}

async function notifyAdmins(text: string, extra: Record<string, any> = {}) {
  if (!ADMIN_IDS.length) {
    console.warn("[send-order] No TELEGRAM_ADMIN_IDS configured")
    return
  }
  await Promise.allSettled(
    ADMIN_IDS.map(id => tg("sendMessage", { chat_id: id, text, ...extra }))
  )
}

// --- markdown escape
function md2(s: string) {
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!]/g, (m) => "\\" + m)
}
function money(n: number | string | undefined, currency = "₸") {
  if (n === undefined || n === null || n === "") return ""
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n)
  return new Intl.NumberFormat("ru-RU").format(num) + currency
}

// --- deep link helpers
function buildStartParam(orderId?: string | number) {
  const raw = `order_${String(orderId ?? "")}`
  return raw.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "order_unknown"
}
function buildBotLink(username: string | undefined, orderId?: string | number) {
  if (!username) return null
  const start = buildStartParam(orderId)
  return `https://t.me/${username}?start=${encodeURIComponent(start)}`
}

// --- types
type Product = { id: number; name: string; price: number; images?: any }
type CartItem = { product: Product; size?: string; quantity: number }
type Customer = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  city?: string
  address?: string
}
type OrderPayload = {
  orderId?: string
  items: CartItem[]
  total?: number
  shippingCost?: number
  customer?: Customer
}

// --- build message
function buildMessage(o: {
  id?: string
  items: CartItem[]
  customer?: Customer
  total?: number
  shippingCost?: number
}) {
  const { id, items, customer, total, shippingCost } = o

  const lines: string[] = []
  lines.push(`*Новый заказ*${id ? ` \\#${md2(id)}` : ""}`)
  lines.push("")
  lines.push("*Товары:*")

  for (const it of items || []) {
    const name = md2(it.product?.name ?? "Без названия")
    const qty = it.quantity ?? 1
    const size = it.size ? `, размер: ${md2(it.size)}` : ""
    const price = money(it.product?.price ?? "")
    lines.push(`• ${name} — ${qty} шт${size} — ${md2(price)}`)
  }

  if (typeof shippingCost === "number") {
    lines.push(`Доставка: ${md2(money(shippingCost))}`)
  }
  if (typeof total === "number") {
    lines.push(`*Итого:* ${md2(money(total))}`)
  }

  if (customer) {
    const fio = [customer.firstName, customer.lastName].filter(Boolean).join(" ")
    lines.push("")
    lines.push("*Покупатель:*")
    if (fio) lines.push(`• ${md2(fio)}`)
    if (customer.phone) lines.push(`• ${md2(customer.phone)}`)
    if (customer.email) lines.push(`• ${md2(customer.email)}`)
    if (customer.city) lines.push(`• ${md2(customer.city)}`)
    if (customer.address) lines.push(`• ${md2(customer.address)}`)
  }

  return lines.join("\n")
}

// --- API handler
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as OrderPayload
    const { orderId, items = [], total, shippingCost = 0, customer } = payload

    if (!items.length) {
      return NextResponse.json({ success: false, error: "empty_items" }, { status: 400 })
    }

    const text = buildMessage({ id: orderId, items, customer, total, shippingCost })
    await notifyAdmins(text, { parse_mode: "MarkdownV2" })

    const startParam = buildStartParam(orderId)
    const botLink = buildBotLink(BOT_USERNAME, orderId)

    return NextResponse.json({ success: true, orderId, startParam, botLink })
  } catch (e: any) {
    console.error("send-order error:", e?.message || e)
    return NextResponse.json(
      { success: false, error: e?.message || "internal_error" },
      { status: 500 }
    )
  }
}

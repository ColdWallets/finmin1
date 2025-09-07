// app/api/telegram/send-order/route.ts
import { NextResponse } from "next/server"

/**
 * ENV на Vercel (Project → Settings → Environment Variables)
 * TELEGRAM_BOT_TOKEN        — токен бота
 * TELEGRAM_BOT_USERNAME     — username бота БЕЗ @ (например: OtrodyaBot)
 * TELEGRAM_ADMIN_IDS        — числовые ID админов через запятую: "111,222"
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
  process.env.TELEGRAM_BOT_USERNAME ||
  ""

// Парсим CSV в массив строковых ID (так надёжнее: телега принимает и строки, и числа)
const ADMIN_IDS: string[] = String(process.env.TELEGRAM_ADMIN_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean)

export const dynamic = "force-dynamic"

// --- низкоуровневый вызов Telegram API
async function tg(method: string, payload: any) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Без keepalive, чтобы Vercel не срезал запросы
  })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { /* noop */ }
  if (!res.ok || (data && data.ok === false)) {
    const desc = data?.description || text
    throw new Error(`TG ${method} ${res.status}: ${desc}`)
  }
  return data?.result ?? null
}

async function notifyAdmins(text: string, extra: Record<string, any> = {}) {
  if (!ADMIN_IDS.length) {
    console.warn("[send-order] no TELEGRAM_ADMIN_IDS configured")
    return
  }
  await Promise.allSettled(
    ADMIN_IDS.map(chat_id => tg("sendMessage", { chat_id, text, ...extra }))
  )
}

// --- утилиты форматирования
function md2(s: string) {
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!]/g, (m) => "\\" + m)
}
function money(n: number | string | undefined, currency = "₸") {
  if (n === undefined || n === null || n === "") return ""
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n)
  return new Intl.NumberFormat("ru-RU").format(num) + currency
}

// Типы из фронта
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

// Формируем сообщение MarkdownV2
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

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as OrderPayload

    const { orderId, items = [], total, shippingCost = 0, customer } = payload
    if (!items.length) {
      return NextResponse.json({ success: false, error: "empty_items" }, { status: 400 })
    }

    const text = buildMessage({ id: orderId, items, customer, total, shippingCost })

    await notifyAdmins(text, { parse_mode: "MarkdownV2" })

    const botLink =
      BOT_USERNAME && orderId ? `https://t.me/${BOT_USERNAME}?start=order_${orderId}` : null

    return NextResponse.json({ success: true, orderId, botLink })
  } catch (e: any) {
    console.error("send-order error:", e?.message || e)
    return NextResponse.json(
      { success: false, error: e?.message || "internal_error" },
      { status: 500 }
    )
  }
}

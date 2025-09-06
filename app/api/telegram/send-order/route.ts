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
const ADMIN_IDS: number[] = (process.env.TELEGRAM_ADMIN_IDS || "")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))

if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required")

export const dynamic = "force-dynamic"

async function tg(method: string, payload: any) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TG ${method} ${res.status}: ${text}`)
  }
}

async function notifyAdmins(text: string, extra: Record<string, any> = {}) {
  if (!ADMIN_IDS.length) return
  await Promise.allSettled(
    ADMIN_IDS.map((chat_id) => tg("sendMessage", { chat_id, text, ...extra }))
  )
}

// экранирование под MarkdownV2
function md2(s: string) {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (m) => "\\" + m)
}

function money(n: number | string | undefined, currency = "₸") {
  if (n === undefined || n === null || n === "") return ""
  const num = typeof n === "string" ? Number(n) : n
  if (!Number.isFinite(num)) return String(n)
  return new Intl.NumberFormat("ru-RU").format(num) + currency
}

type Product = { id: number; name: string; price: number; images?: any }
type CartItem = { product: Product; size: string; quantity: number }
type OrderForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  address: string
  apartment: string
  postalCode: string
  comments: string
}

function buildMessage({
  id,
  items,
  customer,
  total,
  shippingCost,
}: {
  id: string | number
  items: CartItem[]
  customer: OrderForm
  total: number
  shippingCost?: number
}) {
  const lines: string[] = []

  // заголовок
  lines.push("🧾 *Новый заказ*")
  lines.push(`ID: \`${md2(String(id))}\``)
  lines.push("")

  // клиент
  lines.push("👤 Клиент:")
  const customerPairs: Array<[string, string | undefined]> = [
    ["Имя", customer?.firstName],
    ["Фамилия", customer?.lastName],
    ["Телефон", customer?.phone],
    ["Email", customer?.email],
    ["Город", customer?.city],
    ["Адрес", customer?.address],
    ["Квартира/офис", customer?.apartment],
    ["Индекс", customer?.postalCode],
    ["Комментарий", customer?.comments],
  ]
  lines.push(
    customerPairs
      .filter(([, v]) => v && String(v).trim().length)
      .map(([k, v]) => `${md2(k)}: ${md2(String(v))}`)
      .join("\n")
  )
  lines.push("")

  // позиции
  lines.push("📦 Позиции:")
  if (Array.isArray(items) && items.length) {
    lines.push(
      items
        .map((it, i) => {
          const name = it?.product?.name ?? "товар"
          const price = it?.product?.price ?? 0
          const qty = it?.quantity ?? 1
          const size = it?.size ? `, размер: ${it.size}` : ""
          const line =
            `${i + 1}. ${name}${size} × ${qty} — ${money(price, "₸")} (= ${money(qty * price, "₸")})`
          return md2(line)
        })
        .join("\n")
    )
  } else {
    lines.push(md2("• (без позиций)"))
  }
  lines.push("")

  // итоги
  const ship = shippingCost ? `Доставка: ${md2(money(shippingCost, "₸"))}\n` : ""
  lines.push(`Итого: *${md2(money(total, "₸"))}*`)
  if (ship) lines.push(ship.trim())

  return lines.join("\n")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // формируем orderId, даже если фронт не прислал (на всякий случай)
    const orderId = body.id ?? Date.now()

    const items: CartItem[] = Array.isArray(body.items) ? body.items : []
    const customer: OrderForm = body.customer || {}
    const total: number = body.total ?? 0
    const shippingCost: number | undefined = body.shippingCost

    // отправляем всем админам
    const text = buildMessage({ id: orderId, items, customer, total, shippingCost })
    await notifyAdmins(text, { parse_mode: "MarkdownV2" })

    // отдаём фронту корректный deep-link
    const botLink =
      BOT_USERNAME && orderId ? `https://t.me/${BOT_USERNAME}?start=order_${orderId}` : null

    return NextResponse.json({ success: true, orderId, botLink })
  } catch (e: any) {
    console.error("send-order error:", e?.message || e)
    return NextResponse.json({ success: false, error: e?.message || "internal_error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"

// ⚠️ In production store secrets in env vars
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "REPLACE_ME_BOT_TOKEN"
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || "REPLACE_ME_ADMIN_ID"      // numeric string
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "REPLACE_ME_BOT_USERNAME" // without @

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

async function notifyAdmin(orderId: string, orderData: any) {
  const itemsStr = (orderData.items || [])
    .map((it: any, idx: number) => `${idx+1}. ${it.name || it.title || "Товар"} — ${it.size || ""} × ${it.quantity || 1} = ${it.price || 0}`)
    .join("\n")

  const customer = orderData.customer || {}
  const total = orderData.total ?? 0
  const shipping = orderData.shippingCost ?? 0

  const deepLink = `https://t.me/${BOT_USERNAME}?start=order_${orderId}`

  const text = [
    "🛒 <b>Новый заказ</b>",
    `№: <code>${orderId}</code>`,
    "",
    "<b>Товары:</b>",
    itemsStr || "—",
    "",
    "<b>Клиент:</b>",
    `Имя: ${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim(),
    customer.phone ? `Телефон: ${customer.phone}` : "",
    customer.email ? `Email: ${customer.email}` : "",
    customer.city ? `Город: ${customer.city}` : "",
    customer.address ? `Адрес: ${customer.address}` : "",
    customer.apartment ? `Кв/Офис: ${customer.apartment}` : "",
    customer.postalCode ? `Индекс: ${customer.postalCode}` : "",
    customer.comments ? `Комментарий: ${customer.comments}` : "",
    "",
    `<b>Доставка:</b> ${shipping}`,
    `<b>Итого:</b> ${total}`,
    "",
    `🔗 <a href="${deepLink}">Открыть/создать чат с клиентом</a>`,
  ].filter(Boolean).join("\n")

  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    // @ts-ignore
    cache: "no-store",
  })
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()
    const orderId = Date.now().toString()

    // TODO: persist to DB in production

    // Notify admin in Telegram with deep-link to chat
    await notifyAdmin(orderId, orderData)

    // Reply to frontend with order id and deep-link to bot
    const botLink = `https://t.me/${BOT_USERNAME}?start=order_${orderId}`
    return NextResponse.json({ success: true, orderId, botLink })
  } catch (error) {
    console.error("Error processing order:", error)
    return NextResponse.json({ success: false, error: "Failed to process order" }, { status: 500 })
  }
}

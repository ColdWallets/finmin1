import { NextResponse } from "next/server"

export const runtime = "nodejs"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
  process.env.TELEGRAM_BOT_USERNAME ||
  ""
const ADMIN_IDS: string[] = String(
  process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || ""
)
  .split(",")
  .map(s => s.trim())
  .filter(Boolean)

const API = `https://api.telegram.org/bot${BOT_TOKEN}`

// админ -> userId (in-memory)
const adminConnections = new Map<string, string>()

async function tg(method: string, payload: any) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const txt = await r.text()
  let data: any
  try { data = JSON.parse(txt) } catch {}
  if (!r.ok || (data && data.ok === false)) {
    const desc = data?.description || txt
    console.error(`[telegram] ${method} failed: ${desc}`)
    throw new Error(desc)
  }
  return data?.result
}

function isAdmin(id?: number | string | null) {
  return id ? ADMIN_IDS.includes(String(id)) : false
}

async function sendMessage(chat_id: string | number, text: string, extra: Record<string, any> = {}) {
  return tg("sendMessage", { chat_id, text, parse_mode: "HTML", ...extra })
}

async function answerCallbackQuery(id: string, text?: string) {
  return tg("answerCallbackQuery", { callback_query_id: id, text })
}

async function notifyAdmins(text: string, extra: Record<string, any> = {}) {
  if (!ADMIN_IDS.length) return
  await Promise.allSettled(ADMIN_IDS.map(id => sendMessage(id, text, extra || {})))
}

function makeAdminConnectKeyboard(userId: string) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "Ответить пользователю", callback_data: `connect:${userId}` }]],
    },
  }
}

function formatUser(u: any) {
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim()
  const handle = u?.username ? `@${u.username}` : ""
  return `${name || "Без имени"} ${handle}`.trim()
}

export async function POST(req: Request) {
  const update = await req.json()

  try {
    // === кнопки
    if (update.callback_query) {
      const cb = update.callback_query
      const adminId = String(cb.from?.id)
      if (!isAdmin(adminId)) {
        await answerCallbackQuery(cb.id, "Недостаточно прав")
        return NextResponse.json({ ok: true })
      }
      const data = String(cb.data || "")
      if (data.startsWith("connect:")) {
        const userId = data.split(":")[1]
        adminConnections.set(adminId, userId)
        await answerCallbackQuery(cb.id)
        await sendMessage(
          adminId,
          `Подключено. Теперь ваши сообщения будут отправляться пользователю <code>${userId}</code>.`
        )
        return NextResponse.json({ ok: true })
      }
      await answerCallbackQuery(cb.id)
      return NextResponse.json({ ok: true })
    }

    // === сообщения
    const msg = update.message || update.edited_message
    if (!msg) return NextResponse.json({ ok: true })

    const from = msg.from
    const fromId = String(from?.id)
    const chatId = String(msg.chat?.id)
    const text: string = msg.text ?? msg.caption ?? ""

    // deep-link /start order_123
    if (text?.startsWith?.("/start")) {
      const arg = text.split(" ").slice(1).join(" ")
      if (arg && arg.startsWith("order_")) {
        await sendMessage(chatId, "Спасибо! Напишите ваш вопрос — оператор подключится.")
      }
      return NextResponse.json({ ok: true })
    }

    // --- от админа
    if (isAdmin(fromId)) {
      if (text.startsWith("/reply")) {
        const [, userId, ...rest] = text.split(" ")
        const replyText = rest.join(" ").trim()
        if (!userId || !replyText) {
          await sendMessage(chatId, "Формат: <code>/reply &lt;user_id&gt; &lt;текст&gt;</code>")
        } else {
          await sendMessage(userId, replyText)
          await sendMessage(chatId, `✅ Отправлено пользователю <code>${userId}</code>`)
        }
        return NextResponse.json({ ok: true })
      }

      const connectedUser = adminConnections.get(fromId)
      if (connectedUser) {
        if (text) await sendMessage(connectedUser, text)
        return NextResponse.json({ ok: true })
      }

      await sendMessage(
        chatId,
        [
          "Вы администратор. Чтобы ответить пользователю:",
          "— нажмите кнопку <b>Ответить пользователю</b> в уведомлении",
          "или используйте команду:",
          "<code>/reply &lt;user_id&gt; &lt;текст&gt;</code>",
        ].join("\n")
      )
      return NextResponse.json({ ok: true })
    }

    // --- от пользователя
    const userCard =
      `<b>Новое сообщение от клиента</b>\n` +
      `ID: <code>${fromId}</code>\n` +
      `Имя: ${formatUser(from)}\n\n` +
      `Текст:\n${text || "(без текста)"}`

    await notifyAdmins(userCard, makeAdminConnectKeyboard(fromId))
    await sendMessage(chatId, "Спасибо! Сообщение отправлено оператору. Скоро ответим.")

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[telegram webhook] error:", e)
    return NextResponse.json({ ok: true })
  }
}

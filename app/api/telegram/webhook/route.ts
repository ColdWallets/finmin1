import { type NextRequest, NextResponse } from "next/server"

// ⚠️ Move tokens and secrets to environment variables in production!
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8369763130:AAFDJGzAw36tiPdLfBkD610knG_pGUwQ47o"
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || "6772742245"      // numeric string
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "OtrodyaBot" // without @

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// In‑memory storage (stateless hosts will lose this on redeploy; use DB/Redis in prod)
type UserSession = {
  chatId: number
  orderId?: string
  status: "new" | "waiting_for_operator" | "connected_to_operator"
}

const userSessions = new Map<number, UserSession>()
const adminState: { currentUserId?: number } = {}

// Helpers
async function sendMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
    // @ts-ignore
    cache: "no-store",
  })
  return res.json()
}

async function answerCallbackQuery(id: string, text?: string) {
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  })
}

function makeAdminConnectKeyboard(userId: number) {
  return {
    inline_keyboard: [
      [{ text: "✉️ Начать чат с клиентом", callback_data: `admin_connect:${userId}` }],
      [{ text: "📋 Список активных", callback_data: "admin_list" }],
    ],
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Handle callback buttons (admin actions)
    if (update.callback_query) {
      const cb = update.callback_query
      const fromId: number = cb.from.id
      const data: string = cb.data

      if (String(fromId) === String(ADMIN_ID)) {
        if (data.startsWith("admin_connect:")) {
          const userId = Number(data.split(":")[1])
          if (userSessions.has(userId)) {
            adminState.currentUserId = userId
            await answerCallbackQuery(cb.id, "Подключено к клиенту")
            await sendMessage(ADMIN_ID, `✅ Подключено к чату с пользователем <code>${userId}</code>. Напишите сообщение — я перешлю.`)
          } else {
            await answerCallbackQuery(cb.id, "Пользователь не найден")
          }
        } else if (data === "admin_list") {
          await answerCallbackQuery(cb.id, "Открываю список")
          if (userSessions.size === 0) {
            await sendMessage(ADMIN_ID, "Список пуст.")
          } else {
            let list = "Активные клиенты:\n\n"
            for (const [uid, s] of userSessions) {
              list += `• <code>${uid}</code> — статус: <b>${s.status}</b>${s.orderId ? `, заказ: <code>${s.orderId}</code>` : ""}\n`
            }
            await sendMessage(ADMIN_ID, list, {
              inline_keyboard: [
                ...[...userSessions.keys()].map((uid) => [{ text: `Подключиться к ${uid}`, callback_data: `admin_connect:${uid}` }]),
              ],
            })
          }
        }
      }
      return NextResponse.json({ ok: true })
    }

    // Handle regular messages
    if (update.message) {
      const msg = update.message
      const chatId: number = msg.chat.id
      const fromId: number = msg.from.id
      const text: string = msg.text || ""

      // User started bot via deep-link: /start order_<id>
      if (text.startsWith("/start")) {
        const payload = text.split(" ").slice(1).join(" ")
        if (payload && payload.startsWith("order_")) {
          const orderId = payload.replace("order_", "")
          userSessions.set(fromId, { chatId, orderId, status: "waiting_for_operator" })

          // Message to customer
          await sendMessage(chatId, [
            "✅ <b>Ваш заказ принят!</b>",
            "Для дальнейшего оформления и оплаты с вами свяжется наш оператор прямо в этом чате.",
            "",
            "Если у вас есть вопросы — просто напишите здесь."
          ].join("\n"))

          // Notify admin with quick-connect button
          await sendMessage(ADMIN_ID, [
            "🆕 <b>Новый клиент в боте</b>",
            `Пользователь: <code>${fromId}</code>`,
            `Заказ: <code>${orderId}</code>`,
            "",
            "Нажмите кнопку ниже, чтобы начать переписку."
          ].join("\n"), makeAdminConnectKeyboard(fromId))
        } else {
          // Generic /start
          userSessions.set(fromId, { chatId, status: "new" })
          await sendMessage(chatId, "Здравствуйте! Напишите вопрос — оператор свяжется с вами.")
        }
        return NextResponse.json({ ok: true })
      }

      // Relay logic
      const isAdmin = String(fromId) == String(ADMIN_ID)

      if (isAdmin) {
        // Admin is writing — send to selected user if present
        const current = adminState.currentUserId
        if (!current || !userSessions.has(current)) {
          await sendMessage(ADMIN_ID, "Вы не выбрали клиента. Нажмите «Список активных» и подключитесь, либо используйте /list.", {
            inline_keyboard: [[{ text: "📋 Список активных", callback_data: "admin_list" }]],
          })
        } else {
          const session = userSessions.get(current)!
          session.status = "connected_to_operator"
          await sendMessage(session.chatId, `👨‍💼 <b>Оператор:</b>\n\n${text}`)
        }
      } else {
        // Message from a user
        const sess = userSessions.get(fromId) || { chatId, status: "new" as const }
        userSessions.set(fromId, sess)
        if (sess.status !== "connected_to_operator") {
          sess.status = "waiting_for_operator"
        }
        await sendMessage(ADMIN_ID, [
          "💬 <b>Сообщение от клиента</b>",
          `Пользователь: <code>${fromId}</code>`,
          sess.orderId ? `Заказ: <code>${sess.orderId}</code>` : "",
          "",
          text,
        ].filter(Boolean).join("\n"), makeAdminConnectKeyboard(fromId))
        await sendMessage(chatId, "Спасибо! Оператор скоро ответит здесь.")
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Telegram webhook error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

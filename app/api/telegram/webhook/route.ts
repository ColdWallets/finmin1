// app/api/telegram/webhook/route.ts
import { NextResponse } from "next/server";

// === Runtime (можно оставить nodejs для fetch/crypto) ===
export const runtime = "nodejs";

// === ENV ===
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");

const ADMIN_IDS: string[] = (
  process.env.TELEGRAM_ADMIN_IDS ??
  process.env.TELEGRAM_ADMIN_ID ??
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (ADMIN_IDS.length === 0) {
  console.warn(
    "[telegram] No ADMIN IDS configured. Set TELEGRAM_ADMIN_IDS or TELEGRAM_ADMIN_ID"
  );
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// === Простая in-memory таблица подключений (на Vercel может сбрасываться на холодном старте) ===
/**
 * adminConnections: карта активных подключений админ → userId
 * Когда админ нажимает кнопку "Ответить пользователю", мы сюда пишем userId.
 * Далее все его обычные сообщения летят этому пользователю.
 */
const adminConnections = new Map<string, string>();

// === helpers ===
async function call<T = any>(method: string, payload: Record<string, any>) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    console.error(`[telegram] ${method} failed:`, data.description, payload);
  }
  return data;
}

async function sendMessage(
  chat_id: string | number,
  text: string,
  extra: Record<string, any> = {}
) {
  return call("sendMessage", {
    chat_id,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function answerCallbackQuery(callback_query_id: string, text?: string) {
  return call("answerCallbackQuery", {
    callback_query_id,
    text,
    show_alert: !!text && text.length > 40,
  });
}

async function notifyAdmins(text: string, extra?: Record<string, any>) {
  await Promise.all(ADMIN_IDS.map((id) => sendMessage(id, text, extra)));
}

function isAdmin(userId?: number | string | null) {
  if (!userId) return false;
  return ADMIN_IDS.includes(String(userId));
}

// === форматируем превью пользователя для админа ===
function formatUser(u: any) {
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
  const handle = u?.username ? `@${u.username}` : "";
  return `${name || "Без имени"} ${handle}`.trim();
}

// === основной обработчик ===
export async function POST(req: Request) {
  const update = await req.json();

  try {
    // 1) callback_query (кнопки админки)
    if (update.callback_query) {
      const cb = update.callback_query;
      const from = cb.from;
      const data: string = cb.data || "";
      const adminId = String(from?.id);

      // только админы
      if (!isAdmin(adminId)) {
        await answerCallbackQuery(cb.id, "Недостаточно прав");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("connect:")) {
        const userId = data.split(":")[1];
        adminConnections.set(adminId, userId);
        await answerCallbackQuery(cb.id);
        await sendMessage(adminId, `Подключено. Теперь все ваши сообщения будут отправляться пользователю <code>${userId}</code>.`);
        return NextResponse.json({ ok: true });
      }

      await answerCallbackQuery(cb.id);
      return NextResponse.json({ ok: true });
    }

    // 2) обычные сообщения
    const msg = update.message || update.edited_message;
    if (!msg) return NextResponse.json({ ok: true });

    const from = msg.from;
    const fromId = String(from?.id);
    const chatId = String(msg.chat?.id);
    const text: string = msg.text ?? msg.caption ?? "";

    // --- Сообщение пришло от АДМИНА
    if (isAdmin(fromId)) {
      // команда /reply <userId> <text...>
      if (text?.startsWith("/reply")) {
        const [, userId, ...rest] = text.split(" ");
        const replyText = rest.join(" ").trim();
        if (!userId || !replyText) {
          await sendMessage(
            chatId,
            "Формат: <code>/reply &lt;user_id&gt; &lt;текст&gt;</code>"
          );
        } else {
          await sendMessage(userId, replyText);
          await sendMessage(chatId, `✅ Отправлено пользователю <code>${userId}</code>`);
        }
        return NextResponse.json({ ok: true });
      }

      // если есть активная связь — шлём текущий текст подключённому пользователю
      const connectedUser = adminConnections.get(fromId);
      if (connectedUser) {
        // текст или пересланное
        if (text) await sendMessage(connectedUser, text);
        // Если нужно поддержать фото/документы — тут можно добавить sendPhoto/sendDocument и т.п.

        return NextResponse.json({ ok: true });
      }

      // если связи нет — подсказываем как подключиться
      await sendMessage(
        chatId,
        [
          "Вы администратор. Чтобы ответить пользователю:",
          "1) Нажмите кнопку <b>Ответить пользователю</b> из уведомления о его сообщении,",
          "или 2) используйте команду:",
          "<code>/reply &lt;user_id&gt; &lt;текст&gt;</code>",
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    // --- Сообщение пришло от КЛИЕНТА (не админа)
    // Пересылаем всем админам сообщение с кнопкой «подключиться»
    const userCard = `<b>Новое сообщение от клиента</b>\nID: <code>${fromId}</code>\nИмя: ${formatUser(from)}\n\nТекст:\n${text || "(без текста)"}`;

    await notifyAdmins(userCard, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Ответить пользователю", callback_data: `connect:${fromId}` }],
        ],
      },
    });

    // Подтверждаем пользователю
    await sendMessage(
      chatId,
      "Спасибо! Сообщение отправлено оператору. Скоро ответим."
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[telegram webhook] error:", e);
    // чтобы Telegram не зафлудил ретраями — возвращаем 200
    return NextResponse.json({ ok: true });
  }
}

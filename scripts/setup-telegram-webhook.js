const TELEGRAM_BOT_TOKEN = "8369763130:AAFDJGzAw36tiPdLfBkD610knG_pGUwQ47o"
const WEBHOOK_URL = "https://www.otrodya.com/api/telegram/webhook"

async function setupWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ["message", "callback_query"],
      }),
    })

    const result = await response.json()
    console.log("Webhook setup result:", result)

    if (result.ok) {
      console.log("✅ Webhook successfully set up!")
      console.log(`Webhook URL: ${WEBHOOK_URL}`)
    } else {
      console.error("❌ Failed to set up webhook:", result.description)
    }
  } catch (error) {
    console.error("Error setting up webhook:", error)
  }
}

setupWebhook()

export const dynamic = "force-dynamic"

export async function GET() {

  const BOT = process.env.TELEGRAM_BOT_TOKEN
  const CHAT = process.env.TELEGRAM_CHAT_ID

  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000"

  const res = await fetch(`${base}/api/signals`)
  const data = await res.json()

  const signals = data.signals || []

  for (const s of signals) {

    if ((s.score || 0) < 5) continue

    let msg = `⚡ ${s.type.toUpperCase()}\n\n`

    if (s.wallet) msg += `👛 ${s.wallet}\n`
    if (s.amount) msg += `💰 ${s.amount}\n`
    if (s.contract) msg += `🪙 ${s.contract}\n`
    if (s.tx) msg += `🔗 https://basescan.org/tx/${s.tx}\n`

    const tg = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        chat_id:CHAT,
        text:msg
      })
    })

    if(!tg.ok){
      const err = await tg.text()
      console.error("Telegram error:", err)
    }

    await new Promise(r => setTimeout(r,800))

  }

  return Response.json({
    sent:signals.length
  })

}
export const dynamic = "force-dynamic"

export async function GET() {

  const BOT = process.env.TELEGRAM_BOT_TOKEN
  const CHAT = process.env.TELEGRAM_CHAT_ID

  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/signals`)
  const data = await res.json()

  const signals = data.signals || []

  for (const s of signals) {

    let msg = `⚡ ${s.type}\n`

    if (s.wallet) msg += `👛 ${s.wallet}\n`
    if (s.amount) msg += `💰 ${s.amount}\n`
    if (s.contract) msg += `🪙 ${s.contract}\n`
    if (s.tx) msg += `🔗 https://basescan.org/tx/${s.tx}\n`

    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        chat_id:CHAT,
        text:msg
      })
    })

  }

  return Response.json({
    sent:signals.length
  })

}
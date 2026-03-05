export async function getDexPairs() {

  try {

    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=base"
    )

    const text = await res.text()

    // अगर API HTML दे दे तो crash न हो
    if (text.startsWith("<!DOCTYPE")) {
      console.error("Dexscreener returned HTML")
      return []
    }

    const data = JSON.parse(text)

    return data.pairs || []

  } catch (err) {

    console.error("Dexscreener error:", err)

    return []

  }

}
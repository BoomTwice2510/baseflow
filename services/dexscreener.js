export async function getDexPairs() {

  try {

    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=base"
    )

    if (!res.ok) {

      console.error("Dexscreener status:", res.status)

      return []

    }

    const data = await res.json()

    return (data.pairs || []).filter(p => p.chainId === "base")

  }

  catch (err) {

    console.error("Dexscreener error:", err)

    return []

  }

}
const DUNE_API = "https://api.dune.com/api/v1/query"

async function fetchDune(queryId) {

  try {

    const res = await fetch(`${DUNE_API}/${queryId}/results`, {
      headers: {
        "x-dune-api-key": process.env.DUNE_API_KEY
      }
    })

    if (!res.ok) {
      console.error("Dune status:", res.status)
      return []
    }

    const data = await res.json()

    if (!data || !data.result) return []

    return data.result.rows || []

  } catch (err) {

    console.error("Dune fetch error:", err.message)

    return []

  }

}


// Whale transactions
export async function getWhaleSignals() {

  const rows = await fetchDune(6783085)

  return rows.map(r => ({
    type: "whale_tx",
    wallet: r.from,
    amount: Number(r.eth_amount),
    tx: r.hash
  }))

}


// Token deploys
export async function getDeploySignals() {

  const rows = await fetchDune(6783176)

  return rows.map(r => ({
    type: "token_deploy",
    creator: r.creator,
    contract: r.contract_address
  }))

}


// Volume spikes
export async function getVolumeSignals() {

  const rows = await fetchDune(6783182)

  return rows.map(r => ({
    type: "volume_spike",
    token: r.token_in_symbol || r.token_out_symbol,
    amount: Number(r.amount_usd)
  }))

}
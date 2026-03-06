import { JsonRpcProvider } from "ethers"

const RPC_URL =
  process.env.BASE_RPC_URL ||
  "https://mainnet.base.org"

export const provider = new JsonRpcProvider(RPC_URL)

export async function getGasPrice() {

  try {

    const fee = await provider.getFeeData()

    return {
      gas: Number(fee.gasPrice || fee.maxFeePerGas || 0)
    }

  } catch (err) {

    console.error("Gas fetch error:", err.message)

    return {}

  }

}
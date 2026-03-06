import { getDexPairs } from "../../../services/dexscreener.js"
import { getGasPrice } from "../../../services/baseRpc.js"
import { getNewPools } from "../../../services/uniswap.js"
import { scanBaseBlocks } from "../../../services/rpcScanner.js"
import { scanUniswapPools } from "../../../services/uniswapScanner.js"

import {
  getWhaleSignals,
  getDeploySignals,
  getVolumeSignals
} from "../../../services/dune.js"

export const dynamic = "force-dynamic"

export async function GET() {

  try {

    const [
      pairs,
      gas,
      pools,
      rpc,
      whales,
      deploys,
      volumes,
      uniPools
    ] = await Promise.all([

      getDexPairs().catch(e => {
        return { error: e.message }
      }),

      getGasPrice().catch(e => {
        return { error: e.message }
      }),

      getNewPools().catch(e => {
        return { error: e.message }
      }),

      scanBaseBlocks().catch(e => {
        return { error: e.message }
      }),

      getWhaleSignals().catch(e => {
        return { error: e.message }
      }),

      getDeploySignals().catch(e => {
        return { error: e.message }
      }),

      getVolumeSignals().catch(e => {
        return { error: e.message }
      }),

      scanUniswapPools().catch(e => {
        return { error: e.message }
      })

    ])

    return Response.json({

      status: "debug",

      dex: {
        pairs_found: pairs?.length || 0,
        sample: pairs?.slice?.(0,3) || pairs
      },

      gas,

      uniswap_simple_scan: {
        pools_found: pools?.length || 0,
        sample: pools?.slice?.(0,3) || pools
      },

      rpc_scan: {
        signals: rpc?.length || 0,
        sample: rpc?.slice?.(0,3) || rpc
      },

      dune_whales: {
        count: whales?.length || 0,
        sample: whales?.slice?.(0,3) || whales
      },

      dune_deploys: {
        count: deploys?.length || 0,
        sample: deploys?.slice?.(0,3) || deploys
      },

      dune_volume: {
        count: volumes?.length || 0,
        sample: volumes?.slice?.(0,3) || volumes
      },

      uniswap_factory_scan: {
        pools_found: uniPools?.length || 0,
        sample: uniPools?.slice?.(0,3) || uniPools
      }

    })

  }

  catch (err) {

    return Response.json({
      error: err.message
    })

  }

}
import { getGasPrice } from "../../../services/baseRpc.js"
import { getNewPools } from "../../../services/uniswap.js"
import { scanBaseBlocks } from "../../../services/rpcScanner.js"
import { scanUniswapPools } from "../../../services/uniswapScanner.js"

import {
  getWhaleSignals,
  getVolumeSignals
} from "../../../services/dune.js"

export const dynamic = "force-dynamic"

export async function GET() {

 try {

  const [
   gas,
   pools,
   rpc,
   whales,
   volumes,
   uniPools
  ] = await Promise.all([

   getGasPrice().catch(()=>({})),

   getNewPools().catch(()=>[]),

   scanBaseBlocks().catch(()=>[]),

   getWhaleSignals().catch(()=>[]),

   getVolumeSignals().catch(()=>[]),

   scanUniswapPools().catch(()=>[])

  ])

  return Response.json({

   status:"debug",

   gas,

   uniswap_simple_scan:{
    pools_found:pools?.length || 0,
    sample:pools?.slice(0,3)
   },

   rpc_scan:{
    signals:rpc?.length || 0,
    sample:rpc?.slice(0,3)
   },

   dune_whales:{
    count:whales?.length || 0,
    sample:whales?.slice(0,3)
   },

   dune_volume:{
    count:volumes?.length || 0,
    sample:volumes?.slice(0,3)
   },

   uniswap_factory_scan:{
    pools_found:uniPools?.length || 0,
    sample:uniPools?.slice(0,3)
   }

  })

 }

 catch(err){

  return Response.json({
   error:err.message
  })

 }

}
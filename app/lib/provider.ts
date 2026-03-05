// lib/provider.ts
import { JsonRpcProvider } from "ethers";

export const provider = new JsonRpcProvider(
  process.env.BASE_RPC_URL || "https://mainnet.base.org"
);

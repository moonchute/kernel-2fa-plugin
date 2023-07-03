import { utils } from "ethers";

import type { JsonRpcProvider } from "@ethersproject/providers";

const TEN_THOUSAND_ETH = utils.parseEther("10000").toHexString().replace("0x0", "0x");

export const faucet = async (address: string, provider: JsonRpcProvider) => {
  await provider.send("hardhat_setBalance", [address, TEN_THOUSAND_ETH]);
};
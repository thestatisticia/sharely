import { createConfig, http } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { celo } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    metaMask({ dappMetadata: { name: "SHARELY" } }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
  ssr: true,
});

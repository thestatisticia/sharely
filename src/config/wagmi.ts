import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
  ssr: true,
});

"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const Web3Provider = dynamic(
  () =>
    import("@/components/providers/Web3Provider").then((m) => m.Web3Provider),
  {
    ssr: false,
    loading: () => null,
  },
);

export function Providers({ children }: { children: ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}

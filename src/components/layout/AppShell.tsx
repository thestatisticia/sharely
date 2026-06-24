"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Home,
  Package,
  PlusCircle,
  UserRound,
} from "lucide-react";

import { SharelyLogo } from "@/components/brand/SharelyLogo";
import { MeshBackground } from "@/components/layout/MeshBackground";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: Compass },
  { href: "/list", label: "List", icon: PlusCircle },
  { href: "/rentals", label: "Rentals", icon: Package },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <MeshBackground />
      <div className="app-canvas mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header className="app-header sticky top-0 z-40 px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center">
              <SharelyLogo size="sm" showTagline={false} />
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <ConnectButton compact />
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pb-32 pt-1">{children}</main>

        <nav className="app-nav fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2">
          <div className="app-nav-inner grid grid-cols-5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-[1rem] px-1 py-2 text-[10px] font-semibold transition-all duration-200",
                    active
                      ? "bg-nav-active text-[var(--nav-active-fg)] shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className="h-[1.15rem] w-[1.15rem]"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

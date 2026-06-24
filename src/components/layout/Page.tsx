import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page flex flex-col gap-12", className)}>{children}</div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  mesh = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children?: React.ReactNode;
  mesh?: boolean;
}) {
  return (
    <header
      className={cn(
        "space-y-6",
        mesh && "hero-wash -mx-6 rounded-b-3xl px-6 pb-10 pt-3",
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="max-w-[14ch] text-[2.15rem] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-[2.5rem]">
        {title}
      </h1>
      {description ? (
        <p className="max-w-md text-[1.0625rem] leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center gap-3 pt-0.5">{children}</div>
      ) : null}
    </header>
  );
}

export function PageSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)}>
      {eyebrow || title ? (
        <div className="space-y-1.5">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? (
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-base leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Surface({
  children,
  className,
  divided = false,
  elevated = false,
}: {
  children: React.ReactNode;
  className?: string;
  divided?: boolean;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        elevated ? "surface-elevated" : "surface",
        divided && "surface-divided",
        className,
      )}
    >
      {children}
    </div>
  );
}

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

const markSizes: Record<LogoSize, string> = {
  sm: "h-8 w-8 rounded-xl",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
};

const iconSizes: Record<LogoSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function SharelyMark({
  size = "sm",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sharely-mark flex shrink-0 items-center justify-center",
        markSizes[size],
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className={iconSizes[size]}
        style={{ color: "var(--mark-fg)" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="11" cy="16" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="21" cy="10" r="3.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="21" cy="22" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M14.8 14.2L18.2 11.8M14.8 17.8l3.4 2.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function SharelyWordmark({
  size = "sm",
  tagline,
  className,
}: {
  size?: LogoSize;
  tagline?: string;
  className?: string;
}) {
  const textScale =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "font-semibold leading-none tracking-[0.12em]",
          textScale,
        )}
      >
        <span className="text-foreground">SHARE</span>
        <span className="sharely-ly">LY</span>
      </p>
      {tagline ? (
        <p className="mt-0.5 text-xs font-medium text-muted">{tagline}</p>
      ) : null}
    </div>
  );
}

export function SharelyLogo({
  size = "sm",
  tagline = "Kampala · G$ rentals",
  showTagline = true,
  className,
}: {
  size?: LogoSize;
  tagline?: string;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SharelyMark size={size} />
      <SharelyWordmark
        size={size}
        tagline={showTagline ? tagline : undefined}
      />
    </div>
  );
}

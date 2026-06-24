import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-accent-soft text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-surface-hover text-foreground",
  muted: "bg-surface-hover text-muted",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

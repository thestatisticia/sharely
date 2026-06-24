import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gradient";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  gradient: "btn-gradient border-0",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-surface-hover shadow-sm",
  ghost: "bg-transparent text-foreground hover:bg-surface-hover",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm rounded-full",
  md: "h-11 px-5 text-sm font-semibold rounded-full",
  lg: "h-12 px-6 text-base font-semibold rounded-full",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}

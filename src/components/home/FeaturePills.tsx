import { ShieldCheck, Star, Wallet } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Escrow deposits",
    text: "Refundable security on every rental",
  },
  {
    icon: Star,
    title: "Verified owners",
    text: "GoodDollar identity + reputation",
  },
  {
    icon: Wallet,
    title: "Pay with G$",
    text: "Daily rates streamed on Celo",
  },
] as const;

export function FeaturePills() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {features.map(({ icon: Icon, title, text }) => (
        <div key={title} className="feature-pill">
          <div className="feature-pill-icon">
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {title}
            </p>
            <p className="text-xs text-muted">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

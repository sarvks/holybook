import { cn } from "@/lib/utils";

const CONF = {
  high: { label: "High confidence", cls: "text-verified border-verified/40 bg-verified/5" },
  moderate: { label: "Moderate", cls: "text-gold border-gold/40 bg-gold/5" },
  contested: { label: "Contested", cls: "text-disputed border-disputed/40 bg-disputed/5" },
};
const STATUS = {
  established: { label: "Established", cls: "text-verified border-verified/40" },
  disputed: { label: "Disputed", cls: "text-disputed border-disputed/40" },
  retracted: { label: "Retracted", cls: "text-retracted border-retracted/50 line-through" },
};

export function ConfidenceBadge({ value, className }) {
  const c = CONF[value] || CONF.moderate;
  return (
    <span data-testid={`confidence-badge-${value}`}
      className={cn("mono-label inline-flex items-center gap-1.5 border px-2 py-0.5 rounded-sm", c.cls, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" /> {c.label}
    </span>
  );
}

export function StatusBadge({ value, className }) {
  const s = STATUS[value] || STATUS.established;
  return (
    <span data-testid={`status-badge-${value}`}
      className={cn("mono-label inline-flex items-center border px-2 py-0.5 rounded-sm", s.cls, className)}>
      {s.label}
    </span>
  );
}

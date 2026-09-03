import { Link } from "react-router-dom";
import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import { Quote, GitBranch, Link2 } from "lucide-react";

export function PropositionCard({ p }) {
  return (
    <Link
      to={`/proposition/${p.number}`}
      data-testid={`proposition-card-${p.number}`}
      className="group block border border-line bg-[var(--surface)] p-5 sm:p-6 rounded-sm transition-colors hover:border-gold/60 focus-visible:border-gold"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="mono-label text-ink-muted">P{String(p.number).padStart(4, "0")}</span>
        <span className="mono-label text-ink-muted truncate">{p.book_title}</span>
      </div>
      <h3 className="font-head text-lg sm:text-xl font-medium leading-snug text-ink group-hover:text-gold transition-colors">
        {p.title}
      </h3>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <ConfidenceBadge value={p.confidence} />
        <StatusBadge value={p.status} />
      </div>
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-line-subtle mono-label text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><Quote size={12} />{(p.sources || []).length} sources</span>
        <span className="inline-flex items-center gap-1.5"><Link2 size={12} />{(p.counterarguments || []).length} counters</span>
        {(p.contradicts || []).length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-disputed"><GitBranch size={12} />{p.contradicts.length} tension</span>
        )}
      </div>
    </Link>
  );
}

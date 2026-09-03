import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { StatusBadge } from "@/components/Badges";
import { EscherArt } from "@/components/EscherArt";
import { ScrollText, Flag } from "lucide-react";

const WRAP = "max-w-[1100px] mx-auto px-4 sm:px-8 lg:px-12";

function List({ title, items, empty }) {
  return (
    <div>
      <h3 className="font-head text-xl font-semibold text-ink mb-3">{title}</h3>
      {items.length === 0 ? <p className="font-body text-lg text-ink-muted">{empty}</p> : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.number}>
              <Link to={`/proposition/${p.number}`} className="flex items-center gap-3 border border-line-subtle p-3 rounded-sm hover:border-gold transition-colors">
                <span className="mono-label text-ink-muted shrink-0">P{p.number}</span>
                <span className="font-body text-lg text-ink truncate flex-1">{p.title}</span>
                <StatusBadge value={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ScriptureAudit() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/audit").then((r) => setData(r.data)).catch(() => {}); }, []);

  if (!data) return <div className={`${WRAP} py-20 mono-label text-ink-muted`}>Loading…</div>;
  const s = data.status_counts;

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Contextualized</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Scripture Audit</h1>

      <div className="mt-6 border-l-2 border-gold pl-4">
        <p className="font-body text-xl text-ink-2 leading-snug">{data.policy_note}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-verified">{s.established.toLocaleString()}</p><p className="mono-label text-ink-muted mt-1">Established</p></div>
        <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-disputed">{s.disputed.toLocaleString()}</p><p className="mono-label text-ink-muted mt-1">Disputed</p></div>
        <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-retracted">{s.retracted.toLocaleString()}</p><p className="mono-label text-ink-muted mt-1">Retracted</p></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Link to="/chapter/143" data-testid="ch143-link" className="group border border-line bg-[var(--surface)] p-6 rounded-sm hover:border-gold transition-colors">
          <ScrollText size={20} className="text-gold" />
          <h3 className="font-head text-xl font-semibold text-ink mt-3 group-hover:text-gold">Chapter 143 — The Book That Destroys This Book</h3>
          <p className="font-body text-lg text-ink-2 mt-1 leading-snug">The self-audit chapter, where the book turns its evidence rubric on its own claims.</p>
        </Link>
        <Link to="/chapter/144" data-testid="ch144-link" className="group border border-line bg-[var(--surface)] p-6 rounded-sm hover:border-gold transition-colors">
          <Flag size={20} className="text-gold" />
          <h3 className="font-head text-xl font-semibold text-ink mt-3 group-hover:text-gold">Chapter 144 — Let Us Find Out</h3>
          <p className="font-body text-lg text-ink-2 mt-1 leading-snug">The finale, which closes without claiming to have concluded everything.</p>
        </Link>
      </div>

      <EscherArt className="w-full h-10 my-10 opacity-60" variant="tessellation" />

      <div className="grid md:grid-cols-2 gap-10">
        <List title={`Retracted (${data.retracted.length})`} items={data.retracted} empty="No retractions on record." />
        <List title={`Disputed (${data.disputed.length})`} items={data.disputed} empty="No disputed propositions." />
      </div>

      <div className="mt-10">
        <h3 className="font-head text-xl font-semibold text-ink mb-3">Most revised propositions</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {data.most_revised.map((p) => (
            <Link key={p.number} to={`/proposition/${p.number}`} className="flex items-center gap-3 border border-line-subtle p-3 rounded-sm hover:border-gold transition-colors">
              <span className="mono-label text-gold shrink-0">{(p.revisions || []).length}×</span>
              <span className="font-body text-lg text-ink truncate">{p.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

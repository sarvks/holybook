import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EscherArt } from "@/components/EscherArt";
import { GitBranch, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const WRAP = "max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12";
const CX = 500, CY = 260;

export default function ContradictionAtlas() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);
  const { user } = useAuth();
  const [propOpen, setPropOpen] = useState(false);
  const [form, setForm] = useState({ a_number: "", b_number: "", theme: "", rationale: "" });

  const load = () => api.get("/atlas").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submitProposal = async () => {
    try {
      await api.post("/atlas/proposals", {
        a_number: Number(form.a_number), b_number: Number(form.b_number),
        theme: form.theme, rationale: form.rationale,
      });
      setPropOpen(false);
      setForm({ a_number: "", b_number: "", theme: "", rationale: "" });
      toast.success("Tension proposed. It stays private until an editor approves it.");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const allLinks = useMemo(() => (data ? data.themes.flatMap((t) => t.links) : []), [data]);

  // node layout: unique chapters as nodes on a circle, tension edges between them
  const layout = useMemo(() => {
    const nodesMap = {};
    allLinks.forEach((l) => {
      [l.a, l.b].forEach((side) => {
        const id = `${side.book_slug}:${side.chapter_number}`;
        if (!nodesMap[id]) nodesMap[id] = { id, ...side };
      });
    });
    const nodes = Object.values(nodesMap);
    nodes.forEach((n, i) => {
      const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      n.x = CX + Math.cos(ang) * 340;
      n.y = CY + Math.sin(ang) * 210;
    });
    return { nodesMap, nodes };
  }, [allLinks]);

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Where the book argues with itself</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Contradiction Atlas</h1>
      <p className="font-body text-xl text-ink-2 mt-4 max-w-2xl leading-snug">
        The book does not resolve every tension. These are editorially-framed thematic tensions between real
        propositions — freedom against responsibility, power against consent, life against death. The text is not
        altered; the atlas only surfaces where the ideas pull in different directions.
      </p>

      {user && (
        <Dialog open={propOpen} onOpenChange={setPropOpen}>
          <DialogTrigger asChild>
            <button data-testid="propose-tension-btn" className="mono-label inline-flex items-center gap-2 mt-6 border border-line px-4 py-2 rounded-sm text-ink hover:border-gold hover:text-gold transition-colors">
              <Plus size={14} /> Propose a tension
            </button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--surface)] border-line">
            <DialogHeader><DialogTitle className="font-head text-ink">Propose a contradiction</DialogTitle></DialogHeader>
            <p className="font-body text-lg text-ink-2 leading-snug">Nominate two propositions that pull against each other. Proposals stay private until an editor approves them for the atlas.</p>
            <div className="grid grid-cols-2 gap-2">
              <Input data-testid="propose-a" type="number" placeholder="Proposition A number" value={form.a_number} onChange={(e) => setForm({ ...form, a_number: e.target.value })} className="bg-paper border-line font-body text-lg" />
              <Input data-testid="propose-b" type="number" placeholder="Proposition B number" value={form.b_number} onChange={(e) => setForm({ ...form, b_number: e.target.value })} className="bg-paper border-line font-body text-lg" />
            </div>
            <Input data-testid="propose-theme" placeholder="Theme (e.g. mercy ↔ justice)" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className="bg-paper border-line font-body text-lg" />
            <Textarea data-testid="propose-rationale" placeholder="Why do these contradict? (min 15 characters)" value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} className="bg-paper border-line font-body text-lg min-h-[100px]" />
            <DialogFooter>
              <button onClick={submitProposal} data-testid="propose-submit" className="mono-label bg-ink text-paper px-5 py-2.5 rounded-sm hover:bg-gold transition-colors">Submit for review</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!data ? <p className="mono-label text-ink-muted mt-10">Loading…</p> : (
        <>
          {/* Tension graph */}
          <div className="mt-10 border border-line rounded-sm bg-[var(--surface)] overflow-hidden">
            <svg data-testid="atlas-graph" viewBox="0 0 1000 520" className="w-full h-[460px]">
              {allLinks.map((l, i) => {
                const a = layout.nodesMap[`${l.a.book_slug}:${l.a.chapter_number}`];
                const b = layout.nodesMap[`${l.b.book_slug}:${l.b.chapter_number}`];
                if (!a || !b) return null;
                const hot = active && (active === a.id || active === b.id);
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--disputed)"
                  strokeWidth={hot ? 2 : 1} strokeDasharray="5 4" opacity={active ? (hot ? 0.95 : 0.15) : 0.6} />;
              })}
              {layout.nodes.map((n) => (
                <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="cursor-pointer"
                  onMouseEnter={() => setActive(n.id)} onMouseLeave={() => setActive(null)}>
                  <circle r="7" fill="var(--paper)" stroke="var(--disputed)" strokeWidth="1.5" />
                  <text x="10" y="3" className="font-mono" fontSize="10" fill="var(--ink-2)">{n.chapter_title}</text>
                </g>
              ))}
            </svg>
            <div className="px-4 py-2 border-t border-line mono-label text-ink-muted">{data.count} tensions · dashed lines mark opposing ideas</div>
          </div>

          {/* Theme groups */}
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {data.themes.map((t) => (
              <div key={t.theme} data-testid={`atlas-theme-${t.theme}`} className="border border-line bg-[var(--surface)] p-6 rounded-sm">
                <h2 className="font-head text-xl font-semibold text-ink flex items-center gap-2 capitalize"><GitBranch size={18} className="text-disputed" />{t.theme}</h2>
                <div className="mt-4 space-y-3">
                  {t.links.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <Link to={`/proposition/${l.a.proposition_number}`} className="border border-line-subtle p-3 rounded-sm hover:border-gold transition-colors">
                        <span className="mono-label text-ink-muted">{l.a.book_title} · Ch.{l.a.chapter_number}</span>
                        <p className="font-body text-lg text-ink leading-tight mt-1">{l.a.chapter_title}</p>
                      </Link>
                      <span className="text-disputed mono-label">↔</span>
                      <Link to={`/proposition/${l.b.proposition_number}`} className="border border-line-subtle p-3 rounded-sm hover:border-gold transition-colors">
                        <span className="mono-label text-ink-muted">{l.b.book_title} · Ch.{l.b.chapter_number}</span>
                        <p className="font-body text-lg text-ink leading-tight mt-1">{l.b.chapter_title}</p>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-l-2 border-gold pl-4">
            <p className="font-body text-lg text-ink-2 leading-snug">{data.note}</p>
          </div>
          <EscherArt className="w-full h-10 mt-10 opacity-40" variant="tessellation" />
        </>
      )}
    </div>
  );
}

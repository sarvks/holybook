import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import { EscherArt } from "@/components/EscherArt";
import { Bookmark, MessageSquareWarning, StickyNote, GitBranch, Quote, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const WRAP = "max-w-[860px] mx-auto px-4 sm:px-8";

function Section({ title, icon: Icon, children, testid }) {
  return (
    <section data-testid={testid} className="mt-10 border-t border-line pt-8">
      <h2 className="font-head text-xl font-semibold text-ink flex items-center gap-2 mb-4"><Icon size={18} className="text-gold" />{title}</h2>
      {children}
    </section>
  );
}

export default function PropositionView() {
  const { number } = useParams();
  const num = Number(number);
  const [data, setData] = useState(null);
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [challenge, setChallenge] = useState({ kind: "counter-evidence", argument: "", sources: "" });
  const [challengeOpen, setChallengeOpen] = useState(false);

  const load = () => api.get(`/propositions/${num}`).then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { setData(null); window.scrollTo(0, 0); load(); }, [num]);

  const bookmark = async () => {
    if (!user) return toast.error("Sign in to bookmark");
    await api.post("/library/bookmarks", { proposition_number: num });
    toast.success("Bookmarked");
  };
  const saveNote = async () => {
    if (!user) return toast.error("Sign in to add notes");
    if (note.trim().length < 2) return;
    await api.post("/library/notes", { proposition_number: num, text: note });
    setNote(""); toast.success("Private note saved");
  };
  const submitChallenge = async () => {
    if (!user) return toast.error("Sign in to submit a challenge");
    try {
      await api.post("/challenges", { proposition_number: num, ...challenge });
      setChallengeOpen(false);
      setChallenge({ kind: "counter-evidence", argument: "", sources: "" });
      toast.success("Challenge submitted for editorial review. It stays private until approved.");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!data) return <div className={`${WRAP} py-20 mono-label text-ink-muted`}>Loading…</div>;
  const { proposition: p, contradicting, related } = data;

  return (
    <div className={`${WRAP} py-12 sm:py-16`}>
      <div className="flex items-center gap-3 mono-label text-ink-muted">
        <Link to={`/read/${p.book_slug}/${p.chapter_number}`} className="hover:text-gold">{p.book_title}</Link>
        <span>/</span>
        <span>Ch. {p.chapter_number} · {p.chapter_title}</span>
      </div>

      <p className="font-mono text-gold text-lg mt-6">P{String(p.number).padStart(4, "0")}</p>
      <h1 className="font-head text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-2 leading-tight">{p.claim}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-5">
        <ConfidenceBadge value={p.confidence} />
        <StatusBadge value={p.status} />
        <span className="mono-label text-ink-muted border border-line-subtle px-2 py-0.5 rounded-sm">{p.concept}</span>
        <span className="mono-label text-ink-muted">{p.reading_minutes} min</span>
      </div>

      {p.status === "retracted" && (
        <div className="mt-5 border border-retracted/50 bg-retracted/5 p-4 rounded-sm">
          <p className="mono-label text-retracted">Retracted</p>
          <p className="font-body text-lg text-ink-2 mt-1">This proposition has been retracted. It is preserved for the record — the history is never erased.</p>
        </div>
      )}

      <p className="font-body text-ink-2 leading-relaxed text-xl mt-6">{p.text.replace(p.claim, "").trim()}</p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-8">
        <button onClick={bookmark} data-testid="bookmark-btn" className="mono-label inline-flex items-center gap-2 border border-line px-4 py-2 rounded-sm text-ink hover:border-gold hover:text-gold transition-colors"><Bookmark size={14} /> Bookmark</button>
        <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
          <DialogTrigger asChild>
            <button data-testid="challenge-btn" className="mono-label inline-flex items-center gap-2 border border-line px-4 py-2 rounded-sm text-ink hover:border-disputed hover:text-disputed transition-colors"><MessageSquareWarning size={14} /> Challenge</button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--surface)] border-line">
            <DialogHeader><DialogTitle className="font-head text-ink">Challenge a proposition</DialogTitle></DialogHeader>
            <p className="font-body text-lg text-ink-2 leading-snug">Submit a structured, evidence-based challenge to P{p.number}. Submissions are private until an editor reviews them. Hate, threats, doxxing and spam are rejected.</p>
            <select value={challenge.kind} onChange={(e) => setChallenge({ ...challenge, kind: e.target.value })} data-testid="challenge-kind" className="w-full border border-line bg-paper rounded-sm px-3 py-2 font-body text-lg text-ink">
              <option value="counter-evidence">Counter-evidence</option>
              <option value="logical-flaw">Logical flaw</option>
              <option value="source-dispute">Source dispute</option>
              <option value="missing-context">Missing context</option>
            </select>
            <Textarea data-testid="challenge-argument" placeholder="State your argument with reasoning (min 20 characters)…" value={challenge.argument} onChange={(e) => setChallenge({ ...challenge, argument: e.target.value })} className="bg-paper border-line font-body text-lg min-h-[120px]" />
            <Input data-testid="challenge-sources" placeholder="Sources / citations (optional)" value={challenge.sources} onChange={(e) => setChallenge({ ...challenge, sources: e.target.value })} className="bg-paper border-line font-body text-lg" />
            <DialogFooter>
              <button onClick={submitChallenge} data-testid="challenge-submit" className="mono-label bg-ink text-paper px-5 py-2.5 rounded-sm hover:bg-gold transition-colors">Submit for review</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources */}
      <Section title="Sources & citations" icon={Quote} testid="section-sources">
        {p.sources.length === 0 ? <p className="font-body text-lg text-ink-muted">No sources recorded.</p> : (
          <ul className="space-y-3">
            {p.sources.map((s, i) => (
              <li key={i} className="border border-line-subtle p-4 rounded-sm">
                <p className="font-body text-lg text-ink">{s.author} — <em>{s.work}</em> ({s.year < 0 ? `${-s.year} BCE` : s.year})</p>
                <p className="mono-label text-ink-muted mt-1">{s.type} · {s.license}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Counterarguments */}
      <Section title="Counterarguments" icon={MessageSquareWarning} testid="section-counters">
        {p.counterarguments.length === 0 ? <p className="font-body text-lg text-ink-muted">None recorded for this proposition.</p> : (
          <ul className="space-y-3">
            {p.counterarguments.map((c, i) => (
              <li key={i} className="border-l-2 border-disputed pl-4 font-body text-lg text-ink-2 leading-snug">{c}</li>
            ))}
          </ul>
        )}
      </Section>

      {/* Contradictions */}
      {contradicting.length > 0 && (
        <Section title="Contradictions & tensions" icon={GitBranch} testid="section-contradictions">
          <div className="grid sm:grid-cols-2 gap-3">
            {contradicting.map((c) => (
              <Link key={c.number} to={`/proposition/${c.number}`} className="border border-line-subtle p-4 rounded-sm hover:border-disputed transition-colors">
                <span className="mono-label text-disputed">P{c.number} · {c.book_title}</span>
                <p className="font-body text-lg text-ink mt-1 leading-snug">{c.title}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Revision history */}
      <Section title="Revision history" icon={History} testid="section-revisions">
        {p.revisions.length === 0 ? <p className="font-body text-lg text-ink-muted">No revisions. This proposition stands as first published.</p> : (
          <ol className="relative border-l border-line ml-2">
            {p.revisions.map((r, i) => (
              <li key={i} className="ml-5 pb-6 last:pb-0">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-gold" />
                <p className="mono-label text-ink-muted">v{r.version} · {new Date(r.timestamp).toLocaleDateString()} · {r.editor} ({r.editor_role})</p>
                <p className="font-body text-lg text-ink mt-1 leading-snug">{r.note}</p>
                {r.previous_status && <p className="mono-label text-ink-muted mt-1">was: {r.previous_status}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Private note */}
      <Section title="Your private note" icon={StickyNote} testid="section-note">
        {user ? (
          <div>
            <Textarea data-testid="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only you can see this…" className="bg-paper border-line font-body text-lg min-h-[90px]" />
            <button onClick={saveNote} data-testid="note-save" className="mono-label mt-3 bg-ink text-paper px-4 py-2 rounded-sm hover:bg-gold transition-colors">Save note</button>
          </div>
        ) : (
          <p className="font-body text-lg text-ink-muted"><Link to="/login" className="text-gold">Sign in</Link> to keep private notes. Reading and search stay anonymous.</p>
        )}
      </Section>

      {/* Related */}
      {related.length > 0 && (
        <Section title="Related propositions" icon={GitBranch} testid="section-related">
          <div className="grid sm:grid-cols-2 gap-3">
            {related.map((c) => (
              <Link key={c.number} to={`/proposition/${c.number}`} className="border border-line-subtle p-4 rounded-sm hover:border-gold transition-colors">
                <span className="mono-label text-ink-muted">P{c.number}</span>
                <p className="font-body text-lg text-ink mt-1 leading-snug">{c.title}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}
      <EscherArt className="w-full h-10 mt-12 opacity-40" variant="tessellation" />
    </div>
  );
}

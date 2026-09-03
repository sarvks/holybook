import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, PackageCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const WRAP = "max-w-[1100px] mx-auto px-4 sm:px-8 lg:px-12";

export default function Editorial() {
  const [summary, setSummary] = useState(null);
  const [validation, setValidation] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [tensionProposals, setTensionProposals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [notes, setNotes] = useState({});

  const decideTension = async (id, decision) => {
    try {
      await api.post(`/editorial/tension-proposals/${id}/decision`, { decision, editor_note: notes[id] || "" });
      toast.success(decision === "approved" ? "Added to the Contradiction Atlas" : "Proposal rejected");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const load = useCallback(() => {
    api.get("/editorial/summary").then((r) => setSummary(r.data)).catch(() => {});
    api.get("/editorial/challenges", { params: statusFilter ? { status: statusFilter } : {} }).then((r) => setChallenges(r.data.challenges)).catch(() => {});
    api.get("/editorial/tension-proposals", { params: { status: "pending" } }).then((r) => setTensionProposals(r.data.proposals)).catch(() => {});
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/validation").then((r) => setValidation(r.data)).catch(() => {}); }, []);

  const decide = async (id, decision) => {
    try {
      await api.post(`/editorial/challenges/${id}/decision`, { decision, editor_note: notes[id] || "" });
      toast.success(`Challenge ${decision}`);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  // Revise / retract panel
  const [pnum, setPnum] = useState("");
  const [prop, setProp] = useState(null);
  const [revText, setRevText] = useState("");
  const [revNote, setRevNote] = useState("");
  const [revStatus, setRevStatus] = useState("");
  const [revConf, setRevConf] = useState("");
  const [revSources, setRevSources] = useState([]);

  const loadProp = async () => {
    if (!pnum) return;
    try {
      const { data } = await api.get(`/propositions/${Number(pnum)}`);
      setProp(data.proposition);
      setRevText(data.proposition.text);
      setRevStatus(data.proposition.status);
      setRevConf(data.proposition.confidence);
      setRevSources(data.proposition.sources || []);
    } catch (e) { toast.error("Proposition not found"); setProp(null); }
  };
  const addSource = () => setRevSources([...revSources, { author: "", work: "", year: new Date().getFullYear(), type: "peer-reviewed", license: "CC-BY 4.0" }]);
  const setSource = (i, k, v) => setRevSources(revSources.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const removeSource = (i) => setRevSources(revSources.filter((_, j) => j !== i));
  const revise = async () => {
    try {
      await api.post(`/editorial/propositions/${prop.number}/revise`, {
        text: revText, note: revNote || "Editorial revision", status: revStatus, confidence: revConf,
        sources: revSources.map((s) => ({ ...s, year: Number(s.year) || s.year })),
      });
      toast.success("Revision published (history preserved)"); setRevNote(""); loadProp();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const retract = async () => {
    try {
      await api.post(`/editorial/propositions/${prop.number}/retract`, { note: revNote || "Retracted by editorial decision" });
      toast.success("Proposition retracted"); setRevNote(""); loadProp();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const [importUrl, setImportUrl] = useState("https://customer-assets-rejwkqb3.emergentagent.net/job_mahakali-corpus/artifacts/bf5i73f7_Holy%20Book.zip");
  const [importing, setImporting] = useState(false);
  const doImport = async () => {
    if (!importUrl) return;
    setImporting(true);
    try {
      const { data } = await api.post("/editorial/import", { url: importUrl });
      toast.success(`Imported ${data.books} books · ${data.chapters} chapters · ${data.propositions} propositions`);
      api.get("/validation").then((r) => setValidation(r.data)).catch(() => {});
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setImporting(false); }
  };

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Mahakali Tribe LLP</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Editorial Dashboard</h1>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-disputed">{summary.challenges.pending}</p><p className="mono-label text-ink-muted mt-1">Pending</p></div>
          <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-verified">{summary.challenges.approved}</p><p className="mono-label text-ink-muted mt-1">Approved</p></div>
          <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-retracted">{summary.challenges.rejected}</p><p className="mono-label text-ink-muted mt-1">Rejected</p></div>
          <div className="border border-line bg-[var(--surface)] p-5 rounded-sm"><p className="font-head text-3xl font-extrabold text-ink">{summary.propositions.toLocaleString()}</p><p className="mono-label text-ink-muted mt-1">Propositions</p></div>
        </div>
      )}

      {/* Corpus gate */}
      {validation && (
        <div className="mt-6 border border-line rounded-sm overflow-hidden">
          <div className="bg-[var(--cardbg)] px-5 py-3 border-b border-line flex items-center gap-2">
            <PackageCheck size={16} className="text-gold" />
            <p className="mono-label text-ink">Corpus gate — import validation ({validation.all_match ? "passed" : "discrepancies"})</p>
          </div>
          <div className="p-5 grid sm:grid-cols-3 gap-3">
            {validation.checks.map((c) => (
              <div key={c.entity} className="border border-line-subtle p-3 rounded-sm">
                <p className="mono-label text-ink-muted capitalize">{c.entity}</p>
                <p className="font-body text-lg text-ink">actual {c.actual} · claimed {c.claimed} · {c.match ? "✓" : `Δ${c.delta}`}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
            <Input data-testid="import-url" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="ZIP archive URL" className="bg-paper border-line font-body text-lg flex-1" />
            <button onClick={doImport} disabled={importing} data-testid="import-btn" className="mono-label bg-ink text-paper px-5 py-2.5 rounded-sm hover:bg-gold transition-colors disabled:opacity-50">{importing ? "Importing…" : "Re-import archive"}</button>
          </div>
        </div>
      )}

      <Tabs defaultValue="challenges" className="mt-10">
        <TabsList className="bg-[var(--surface)] border border-line">
          <TabsTrigger value="challenges" data-testid="ed-tab-challenges" className="mono-label data-[state=active]:bg-ink data-[state=active]:text-paper">Review challenges</TabsTrigger>
          <TabsTrigger value="revise" data-testid="ed-tab-revise" className="mono-label data-[state=active]:bg-ink data-[state=active]:text-paper">Revise / retract</TabsTrigger>
          <TabsTrigger value="proposals" data-testid="ed-tab-proposals" className="mono-label data-[state=active]:bg-ink data-[state=active]:text-paper">Tension proposals{tensionProposals.length ? ` (${tensionProposals.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-4">
          <div className="flex gap-2 mb-4">
            {["pending", "approved", "rejected", ""].map((s) => (
              <button key={s || "all"} onClick={() => setStatusFilter(s)} className={`mono-label px-3 py-1.5 border rounded-sm ${statusFilter === s ? "border-gold text-gold" : "border-line text-ink-2"}`}>{s || "all"}</button>
            ))}
          </div>
          {challenges.length === 0 ? <p className="font-body text-lg text-ink-muted py-8">No challenges in this queue.</p> : (
            <div className="space-y-4" data-testid="challenge-queue">
              {challenges.map((c) => (
                <div key={c.id} className="border border-line bg-[var(--surface)] p-5 rounded-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="mono-label text-gold">P{c.proposition_number} · {c.kind}</p>
                    <span className={`mono-label ${c.status === "approved" ? "text-verified" : c.status === "rejected" ? "text-retracted" : "text-disputed"}`}>{c.status}</span>
                  </div>
                  <p className="font-body text-lg text-ink mt-2 leading-snug">{c.argument}</p>
                  {c.sources && <p className="mono-label text-ink-muted mt-1">Sources: {c.sources}</p>}
                  <p className="mono-label text-ink-muted mt-1">by {c.user_name} · {new Date(c.created_at).toLocaleDateString()}</p>
                  {c.status === "pending" && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Input placeholder="Editor note (optional)" value={notes[c.id] || ""} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} className="bg-paper border-line font-body text-lg flex-1" />
                      <div className="flex gap-2">
                        <button onClick={() => decide(c.id, "approved")} data-testid={`approve-${c.id}`} className="mono-label inline-flex items-center gap-1 bg-verified text-paper px-4 py-2 rounded-sm hover:opacity-90"><Check size={14} />Approve</button>
                        <button onClick={() => decide(c.id, "rejected")} data-testid={`reject-${c.id}`} className="mono-label inline-flex items-center gap-1 border border-retracted text-retracted px-4 py-2 rounded-sm hover:bg-retracted hover:text-paper"><X size={14} />Reject</button>
                      </div>
                    </div>
                  )}
                  {c.editor_note && <p className="mono-label text-ink-muted mt-2">Decision note: {c.editor_note}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="revise" className="mt-4">
          <div className="border border-line bg-[var(--surface)] p-5 rounded-sm">
            <div className="flex gap-2">
              <Input data-testid="revise-pnum" type="number" placeholder="Proposition number" value={pnum} onChange={(e) => setPnum(e.target.value)} className="bg-paper border-line font-body text-lg max-w-[220px]" />
              <button onClick={loadProp} data-testid="revise-load" className="mono-label bg-ink text-paper px-4 py-2 rounded-sm hover:bg-gold transition-colors">Load</button>
            </div>

            {prop && (
              <div className="mt-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="mono-label text-gold">P{prop.number}</span>
                  <ConfidenceBadge value={prop.confidence} /><StatusBadge value={prop.status} />
                </div>
                <Textarea data-testid="revise-text" value={revText} onChange={(e) => setRevText(e.target.value)} className="bg-paper border-line font-body text-lg min-h-[120px]" />
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  <select value={revConf} onChange={(e) => setRevConf(e.target.value)} className="border border-line bg-paper rounded-sm px-3 py-2 font-body text-lg text-ink">
                    {["unrated", "high", "moderate", "contested"].map((c) => <option key={c} value={c}>Confidence: {c}</option>)}
                  </select>
                  <select value={revStatus} onChange={(e) => setRevStatus(e.target.value)} className="border border-line bg-paper rounded-sm px-3 py-2 font-body text-lg text-ink">
                    {["established", "disputed", "retracted"].map((c) => <option key={c} value={c}>Status: {c}</option>)}
                  </select>
                </div>
                <div className="mt-4 border border-line-subtle rounded-sm p-3" data-testid="revise-sources">
                  <div className="flex items-center justify-between mb-2">
                    <p className="mono-label text-ink-muted">Sources & citations ({revSources.length})</p>
                    <button onClick={addSource} data-testid="add-source" className="mono-label text-gold hover:underline">+ Add source</button>
                  </div>
                  {revSources.length === 0 && <p className="font-body text-ink-muted">None recorded. Attach evidence to raise this proposition above "Not yet rated".</p>}
                  <div className="space-y-2">
                    {revSources.map((s, i) => (
                      <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                        <Input placeholder="Author" value={s.author} onChange={(e) => setSource(i, "author", e.target.value)} className="bg-paper border-line font-body" />
                        <Input placeholder="Work / title" value={s.work} onChange={(e) => setSource(i, "work", e.target.value)} className="bg-paper border-line font-body" />
                        <Input placeholder="Year" value={s.year} onChange={(e) => setSource(i, "year", e.target.value)} className="bg-paper border-line font-body" />
                        <select value={s.type} onChange={(e) => setSource(i, "type", e.target.value)} className="border border-line bg-paper rounded-sm px-2 py-2 font-body text-ink">
                          {["peer-reviewed", "historical", "dataset", "primary-text", "book", "report"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <Input placeholder="License" value={s.license} onChange={(e) => setSource(i, "license", e.target.value)} className="bg-paper border-line font-body" />
                          <button onClick={() => removeSource(i)} className="mono-label text-retracted px-2">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Input data-testid="revise-note" placeholder="Revision note (attributed & timestamped)" value={revNote} onChange={(e) => setRevNote(e.target.value)} className="bg-paper border-line font-body text-lg mt-3" />
                <div className="flex gap-2 mt-3">
                  <button onClick={revise} data-testid="revise-publish" className="mono-label inline-flex items-center gap-1 bg-ink text-paper px-5 py-2.5 rounded-sm hover:bg-gold transition-colors"><ShieldCheck size={14} />Publish revision</button>
                  <button onClick={retract} data-testid="retract-btn" className="mono-label border border-retracted text-retracted px-5 py-2.5 rounded-sm hover:bg-retracted hover:text-paper transition-colors">Retract</button>
                </div>
                <p className="mono-label text-ink-muted mt-3">Revisions keep the previous state on the record. History is never silently rewritten. AI cannot publish canonical material.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          {tensionProposals.length === 0 ? <p className="font-body text-lg text-ink-muted py-8">No pending tension proposals.</p> : (
            <div className="space-y-4" data-testid="tension-proposal-queue">
              {tensionProposals.map((t) => (
                <div key={t.id} className="border border-line bg-[var(--surface)] p-5 rounded-sm">
                  <p className="mono-label text-disputed capitalize">{t.theme}</p>
                  <div className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-3 mt-2">
                    <div className="border border-line-subtle p-3 rounded-sm"><span className="mono-label text-ink-muted">P{t.a_number}</span><p className="font-body text-lg text-ink leading-tight">{t.a_title}</p></div>
                    <span className="mono-label text-disputed">↔</span>
                    <div className="border border-line-subtle p-3 rounded-sm"><span className="mono-label text-ink-muted">P{t.b_number}</span><p className="font-body text-lg text-ink leading-tight">{t.b_title}</p></div>
                  </div>
                  <p className="font-body text-lg text-ink-2 mt-2 leading-snug">{t.rationale}</p>
                  <p className="mono-label text-ink-muted mt-1">by {t.user_name}</p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Input placeholder="Editor note (optional)" value={notes[t.id] || ""} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} className="bg-paper border-line font-body text-lg flex-1" />
                    <div className="flex gap-2">
                      <button onClick={() => decideTension(t.id, "approved")} data-testid={`tension-approve-${t.id}`} className="mono-label inline-flex items-center gap-1 bg-verified text-paper px-4 py-2 rounded-sm hover:opacity-90"><Check size={14} />Approve</button>
                      <button onClick={() => decideTension(t.id, "rejected")} data-testid={`tension-reject-${t.id}`} className="mono-label inline-flex items-center gap-1 border border-retracted text-retracted px-4 py-2 rounded-sm hover:bg-retracted hover:text-paper"><X size={14} />Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { API } from "@/lib/api";
import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import { EscherArt } from "@/components/EscherArt";
import { Sparkles, Send, ShieldAlert, Square } from "lucide-react";

const WRAP = "max-w-[860px] mx-auto px-4 sm:px-8";
const SAMPLES = [
  "What does the book say about power and consent?",
  "Is knowledge ever certain?",
  "Does the book claim to be infallible?",
  "What happens after death?",
];

export default function AskTheBook() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [meta, setMeta] = useState(null);
  const [citations, setCitations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const stop = () => { abortRef.current?.abort(); setBusy(false); };

  const ask = async (qOverride) => {
    const q = qOverride ?? question;
    if (!q || q.trim().length < 3) return;
    if (qOverride) setQuestion(qOverride);
    setBusy(true); setError(""); setAnswer(""); setMeta(null); setCitations([]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(`${API}/ask/stream`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }), signal: ctrl.signal,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const evt = JSON.parse(line.slice(5).trim());
          if (evt.type === "meta") setMeta(evt);
          else if (evt.type === "delta") setAnswer((a) => a + evt.content);
          else if (evt.type === "citations") setCitations(evt.citations || []);
          else if (evt.type === "error") setError(evt.content);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") setError("Ask the Book is temporarily unavailable.");
    } finally { setBusy(false); }
  };

  const grounded = meta?.grounded;

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Grounded Q&A</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Ask the Book</h1>
      <p className="font-body text-xl text-ink-2 mt-4 leading-snug">
        Answers stream in real time, grounded only in published propositions. Every answer cites its propositions,
        reports uncertainty, and refuses questions the text cannot support. AI cannot publish canonical material.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-8">
        <div className="flex gap-2">
          <input data-testid="ask-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about the codex…"
            className="flex-1 border border-line bg-[var(--surface)] rounded-sm px-4 py-3 font-body text-lg text-ink focus-visible:border-gold" />
          {busy ? (
            <button type="button" onClick={stop} data-testid="ask-stop" className="mono-label inline-flex items-center gap-2 border border-gold text-gold px-5 rounded-sm"><Square size={16} /> Stop</button>
          ) : (
            <button data-testid="ask-submit" className="mono-label inline-flex items-center gap-2 bg-ink text-paper px-5 rounded-sm hover:bg-gold transition-colors"><Send size={16} /> Ask</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLES.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="mono-label border border-line-subtle px-3 py-1 rounded-sm text-ink-muted hover:text-gold hover:border-gold transition-colors">{s}</button>
          ))}
        </div>
      </form>

      {error && <p className="font-body text-lg text-retracted mt-6">{error}</p>}

      {(answer || meta) && (
        <div className="mt-8 fade-in" data-testid="ask-result">
          <div className={`border rounded-sm p-6 ${grounded === false ? "border-disputed/50 bg-disputed/5" : "border-line bg-[var(--surface)]"}`}>
            <div className="flex items-center gap-2 mb-3">
              {grounded === false ? <ShieldAlert size={16} className="text-disputed" /> : <Sparkles size={16} className="text-gold" />}
              <span className="mono-label text-ink-muted">{grounded === false ? "Refused — outside the corpus" : "Grounded answer"}{busy && " · writing…"}</span>
            </div>
            <p className="font-body text-xl text-ink leading-relaxed whitespace-pre-wrap">{answer}<span className={busy ? "inline-block w-2 h-5 bg-gold ml-0.5 align-middle animate-pulse" : "hidden"} /></p>
            {meta?.disclosure && !busy && <p className="mono-label text-ink-muted mt-4 flex items-center gap-2"><ShieldAlert size={12} />{meta.disclosure}</p>}
          </div>

          {citations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {citations.map((n) => (
                <Link key={n} to={`/proposition/${n}`} className="mono-label border border-gold/40 text-gold px-2.5 py-1 rounded-sm hover:bg-gold hover:text-paper transition-colors">P{n}</Link>
              ))}
            </div>
          )}

          {meta?.grounding?.length > 0 && (
            <div className="mt-8">
              <p className="mono-label text-ink-muted mb-3">Evidence used</p>
              <div className="space-y-3">
                {meta.grounding.map((g) => (
                  <Link key={g.number} to={`/proposition/${g.number}`} className="block border border-line-subtle p-4 rounded-sm hover:border-gold transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono-label text-gold">P{g.number}</span>
                      <ConfidenceBadge value={g.confidence} />
                      <StatusBadge value={g.status} />
                    </div>
                    <p className="font-body text-lg text-ink leading-snug">{g.title}</p>
                    <p className="mono-label text-ink-muted mt-1">{g.book_title}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <EscherArt className="w-full h-10 mt-12 opacity-40" variant="stairs" />
    </div>
  );
}

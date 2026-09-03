import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import { EscherArt } from "@/components/EscherArt";
import { Sparkles, Send, ShieldAlert } from "lucide-react";

const WRAP = "max-w-[860px] mx-auto px-4 sm:px-8";
const SAMPLES = [
  "Can the universe explain itself?",
  "Is knowledge ever certain?",
  "Does the book claim to be infallible?",
  "What does the book say about death?",
];

export default function AskTheBook() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ask = async (qOverride) => {
    const q = qOverride ?? question;
    if (!q || q.trim().length < 3) return;
    setBusy(true); setError(""); setResult(null);
    if (qOverride) setQuestion(qOverride);
    try {
      const { data } = await api.post("/ask", { question: q });
      setResult(data);
    } catch (e) {
      setError("Ask the Book is temporarily unavailable. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Grounded Q&A</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Ask the Book</h1>
      <p className="font-body text-xl text-ink-2 mt-4 leading-snug">
        Answers are grounded only in published propositions. Every answer cites its propositions, reports uncertainty,
        and refuses questions the text cannot support. This is an AI-assisted answer — AI cannot publish canonical material.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-8">
        <div className="flex gap-2">
          <input data-testid="ask-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about the codex…"
            className="flex-1 border border-line bg-[var(--surface)] rounded-sm px-4 py-3 font-body text-lg text-ink focus-visible:border-gold" />
          <button data-testid="ask-submit" disabled={busy} className="mono-label inline-flex items-center gap-2 bg-ink text-paper px-5 rounded-sm hover:bg-gold transition-colors disabled:opacity-50">
            <Send size={16} /> {busy ? "Thinking…" : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLES.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="mono-label border border-line-subtle px-3 py-1 rounded-sm text-ink-muted hover:text-gold hover:border-gold transition-colors">{s}</button>
          ))}
        </div>
      </form>

      {error && <p className="font-body text-lg text-retracted mt-6">{error}</p>}

      {busy && <div className="mt-8 border border-line bg-[var(--surface)] p-6 rounded-sm animate-pulse mono-label text-ink-muted">Retrieving grounded propositions…</div>}

      {result && (
        <div className="mt-8 fade-in" data-testid="ask-result">
          <div className={`border rounded-sm p-6 ${result.grounded ? "border-line bg-[var(--surface)]" : "border-disputed/50 bg-disputed/5"}`}>
            <div className="flex items-center gap-2 mb-3">
              {result.grounded ? <Sparkles size={16} className="text-gold" /> : <ShieldAlert size={16} className="text-disputed" />}
              <span className="mono-label text-ink-muted">{result.grounded ? "Grounded answer" : "Refused — outside the corpus"}</span>
            </div>
            <p className="font-body text-xl text-ink leading-relaxed whitespace-pre-wrap">{result.answer}</p>
            {result.disclosure && <p className="mono-label text-ink-muted mt-4 flex items-center gap-2"><ShieldAlert size={12} />{result.disclosure}</p>}
          </div>

          {result.citations?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.citations.map((n) => (
                <Link key={n} to={`/proposition/${n}`} className="mono-label border border-gold/40 text-gold px-2.5 py-1 rounded-sm hover:bg-gold hover:text-paper transition-colors">P{n}</Link>
              ))}
            </div>
          )}

          {result.grounding?.length > 0 && (
            <div className="mt-8">
              <p className="mono-label text-ink-muted mb-3">Evidence used</p>
              <div className="space-y-3">
                {result.grounding.map((g) => (
                  <Link key={g.number} to={`/proposition/${g.number}`} className="block border border-line-subtle p-4 rounded-sm hover:border-gold transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono-label text-gold">P{g.number}</span>
                      <ConfidenceBadge value={g.confidence} />
                      <StatusBadge value={g.status} />
                    </div>
                    <p className="font-body text-lg text-ink leading-snug">{g.title}</p>
                    {g.sources?.length > 0 && <p className="mono-label text-ink-muted mt-1">{g.sources.length} sources · {g.book_title}</p>}
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

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { PropositionCard } from "@/components/PropositionCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12";
const CONF = ["", "high", "moderate", "contested"];
const STAT = ["", "established", "disputed", "retracted"];

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [confidence, setConfidence] = useState("");
  const [status, setStatus] = useState("");
  const [book, setBook] = useState("");
  const [tag, setTag] = useState(searchParams.get("tag") || "");
  const [books, setBooks] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/books").then((r) => setBooks(r.data)).catch(() => {}); }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 18 };
    if (q) params.q = q;
    if (confidence) params.confidence = confidence;
    if (status) params.status = status;
    if (book) params.book = book;
    if (tag) params.tag = tag;
    api.get("/propositions", { params }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [q, confidence, status, book, tag, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  useEffect(() => { setPage(1); }, [q, confidence, status, book, tag]);
  const clearTag = () => { setTag(""); setSearchParams({}); };

  const selectCls = "border border-line bg-[var(--surface)] rounded-sm px-3 py-2.5 font-body text-lg text-ink focus-visible:border-gold";

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Discovery</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Proposition Explorer</h1>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input data-testid="explorer-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 1,000 propositions…" className="pl-10 bg-[var(--surface)] border-line font-body text-lg h-[46px]" />
        </div>
        <select data-testid="filter-confidence" value={confidence} onChange={(e) => setConfidence(e.target.value)} className={selectCls}>
          {CONF.map((c) => <option key={c} value={c}>{c ? `Confidence: ${c}` : "All confidence"}</option>)}
        </select>
        <select data-testid="filter-status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
          {STAT.map((c) => <option key={c} value={c}>{c ? `Status: ${c}` : "All status"}</option>)}
        </select>
        <select data-testid="filter-book" value={book} onChange={(e) => setBook(e.target.value)} className={selectCls}>
          <option value="">All books</option>
          {books.map((b) => <option key={b.slug} value={b.slug}>{b.title}</option>)}
        </select>
      </div>

      <p className="mono-label text-ink-muted mt-5 flex items-center gap-3" data-testid="explorer-count">
        {loading ? "Searching…" : `${data.total.toLocaleString()} propositions`}
        {tag && <button onClick={clearTag} className="mono-label text-gold border border-gold/40 rounded-sm px-2 py-0.5">tag: {tag} ✕</button>}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4">
        {data.items.map((p) => <PropositionCard key={p.number} p={p} />)}
      </div>

      {data.items.length === 0 && !loading && (
        <p className="font-body text-xl text-ink-muted py-16 text-center">No propositions match these filters.</p>
      )}

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="prev-page" className="mono-label px-4 py-2 border border-line rounded-sm text-ink disabled:opacity-40 hover:border-gold">Prev</button>
          <span className="mono-label text-ink-muted">Page {page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} data-testid="next-page" className="mono-label px-4 py-2 border border-line rounded-sm text-ink disabled:opacity-40 hover:border-gold">Next</button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { usePrefs } from "@/context/PrefsContext";
import { useAuth } from "@/context/AuthContext";
import { EscherArt } from "@/components/EscherArt";
import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import { ChevronLeft, ChevronRight, Minus, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const WRAP = "max-w-[900px] mx-auto px-4 sm:px-8";

export default function ChapterView() {
  const { slug, chapterNumber } = useParams();
  const num = Number(chapterNumber);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(0);
  const { mode, setMode, scale, setScale } = usePrefs();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setData(null);
    window.scrollTo(0, 0);
    api.get(`/chapters/${num}`).then((r) => setData(r.data)).catch(() => {});
  }, [num]);

  useEffect(() => {
    if (user && data) {
      api.post("/progress", { book_slug: slug, chapter_number: num }).catch(() => {});
    }
  }, [user, data, slug, num]);

  const onScroll = useCallback(() => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    setProgress(Math.min(100, Math.max(0, p * 100)));
  }, []);
  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const bookmark = async (number) => {
    if (!user) { toast.error("Sign in to bookmark"); return; }
    await api.post("/library/bookmarks", { proposition_number: number });
    toast.success(`Bookmarked P${number}`);
  };

  if (!data) return <div className={`${WRAP} py-20 mono-label text-ink-muted`}>Loading…</div>;
  const { chapter, propositions, prev, next } = data;

  return (
    <div>
      <div className="fixed top-16 left-0 right-0 h-0.5 bg-transparent z-40">
        <div className="h-full bg-gold transition-[width] duration-150" style={{ width: `${progress}%` }} data-testid="reading-progress" />
      </div>

      {/* Controls */}
      <div className="sticky top-16 z-30 backdrop-blur-xl bg-[var(--paper)]/85 border-b border-line">
        <div className={`${WRAP} py-3 flex items-center justify-between gap-3`}>
          <Link to={`/read/${slug}`} className="mono-label text-ink-muted hover:text-gold truncate">← {chapter.book_title}</Link>
          <div className="flex items-center gap-2">
            <div className="flex border border-line rounded-sm overflow-hidden">
              <button data-testid="simple-mode-toggle" onClick={() => setMode("simple")} className={`mono-label px-3 py-1.5 ${mode === "simple" ? "bg-ink text-paper" : "text-ink-2"}`}>Simple</button>
              <button data-testid="scholar-mode-toggle" onClick={() => setMode("scholar")} className={`mono-label px-3 py-1.5 ${mode === "scholar" ? "bg-ink text-paper" : "text-ink-2"}`}>Scholar</button>
            </div>
            <div className="flex border border-line rounded-sm">
              <button aria-label="Decrease text" onClick={() => setScale(Math.max(0.9, scale - 0.1))} className="px-2 py-1.5 text-ink-2 hover:text-gold"><Minus size={14} /></button>
              <button aria-label="Increase text" onClick={() => setScale(Math.min(1.4, scale + 0.1))} className="px-2 py-1.5 text-ink-2 hover:text-gold"><Plus size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      <article className={`${WRAP} py-12`}>
        <p className="mono-label text-gold">Chapter {String(chapter.number).padStart(3, "0")}{chapter.kind !== "standard" && ` · ${chapter.kind}`}</p>
        <h1 className="font-head text-3xl sm:text-5xl font-extrabold tracking-tight text-ink mt-3 leading-none">{chapter.title}</h1>
        <EscherArt className="w-full h-12 my-8 opacity-60" variant="lattice" />

        <div className="space-y-8" style={{ fontSize: `${scale}rem` }}>
          {propositions.map((p) => (
            mode === "simple" ? (
              <div key={p.number} id={`p${p.number}`} data-testid={`reader-prop-${p.number}`} className="fade-in group">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-gold text-sm shrink-0 mt-1.5">{p.number}</span>
                  <p className="font-body text-ink leading-relaxed" style={{ fontSize: "1.35em" }}>
                    {p.claim}{" "}
                    <Link to={`/proposition/${p.number}`} className="text-ink-muted hover:text-gold mono-label align-middle ml-1 opacity-0 group-hover:opacity-100 transition-opacity">evidence →</Link>
                  </p>
                </div>
              </div>
            ) : (
              <div key={p.number} id={`p${p.number}`} data-testid={`reader-prop-${p.number}`} className="fade-in border-l-2 border-line hover:border-gold pl-5 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-gold text-sm">P{String(p.number).padStart(4, "0")}</span>
                  <ConfidenceBadge value={p.confidence} />
                  <StatusBadge value={p.status} />
                </div>
                <p className="font-body text-ink leading-relaxed" style={{ fontSize: "1.3em" }}>{p.claim}</p>
                <p className="font-body text-ink-2 leading-snug mt-2" style={{ fontSize: "1.05em" }}>{p.text.replace(p.claim, "").trim()}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <span className="mono-label text-ink-muted">{(p.sources || []).length} sources · {(p.counterarguments || []).length} counters · {p.concept}</span>
                  <button onClick={() => bookmark(p.number)} data-testid={`bookmark-${p.number}`} className="mono-label text-ink-muted hover:text-gold">Bookmark</button>
                  <Link to={`/proposition/${p.number}`} className="mono-label text-gold inline-flex items-center gap-1">Full evidence <ArrowRight size={12} /></Link>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Chapter nav */}
        <div className="flex items-center justify-between mt-16 pt-8 border-t border-line">
          {prev ? (
            <button onClick={() => navigate(`/read/${slug}/${prev.number}`)} data-testid="prev-chapter" className="group text-left">
              <span className="mono-label text-ink-muted inline-flex items-center gap-1"><ChevronLeft size={14} /> Previous</span>
              <p className="font-head text-ink group-hover:text-gold transition-colors">{prev.title}</p>
            </button>
          ) : <span />}
          {next ? (
            <button onClick={() => navigate(`/read/${slug}/${next.number}`)} data-testid="next-chapter" className="group text-right">
              <span className="mono-label text-ink-muted inline-flex items-center gap-1 justify-end w-full">Next <ChevronRight size={14} /></span>
              <p className="font-head text-ink group-hover:text-gold transition-colors">{next.title}</p>
            </button>
          ) : <span />}
        </div>
      </article>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import { EscherArt } from "@/components/EscherArt";
import { ChevronRight, ScrollText, Flag } from "lucide-react";

const WRAP = "max-w-[1000px] mx-auto px-4 sm:px-8 lg:px-12";

export default function BookView() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/books/${slug}`).then((r) => setData(r.data)).catch(() => {}); }, [slug]);

  if (!data) return <div className={`${WRAP} py-20 mono-label text-ink-muted`}>Loading…</div>;
  const { book, chapters } = data;

  return (
    <div className={`${WRAP} py-14 sm:py-20`}>
      <Link to="/read" className="mono-label text-ink-muted hover:text-gold">← All books</Link>
      <div className="mt-6 flex items-baseline gap-4">
        <span className="font-mono text-gold text-4xl">{book.roman}</span>
        <div>
          <h1 className="font-head text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink leading-none">{book.title}</h1>
          <p className="font-body text-xl text-ink-2 mt-3 leading-snug">{book.subtitle}</p>
        </div>
      </div>
      <EscherArt className="w-full h-10 mt-8 opacity-60" variant="lattice" />

      <div className="mt-8 divide-y divide-line border-y border-line">
        {chapters.map((c, i) => {
          const special = c.kind !== "standard";
          return (
            <Link key={c.number} to={`/read/${slug}/${c.number}`} data-testid={`chapter-row-${c.number}`}
              className="fade-up group flex items-center gap-4 py-4 hover:bg-[var(--surface)] -mx-4 px-4 transition-colors"
              style={{ animationDelay: `${i * 20}ms` }}>
              <span className="font-mono text-ink-muted text-sm w-12 shrink-0">{String(c.number).padStart(3, "0")}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-head text-lg sm:text-xl font-medium text-ink group-hover:text-gold transition-colors truncate">
                  {c.title}
                  {special && (
                    <span className="ml-3 mono-label text-gold inline-flex items-center gap-1">
                      {c.kind === "self-audit" ? <ScrollText size={12} /> : <Flag size={12} />}{c.kind}
                    </span>
                  )}
                </h3>
                <p className="mono-label text-ink-muted mt-1">{c.proposition_count} propositions · {c.reading_minutes} min</p>
              </div>
              <ChevronRight size={18} className="text-ink-muted group-hover:text-gold shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

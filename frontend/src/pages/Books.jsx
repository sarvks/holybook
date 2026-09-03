import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { EscherArt } from "@/components/EscherArt";
import { ArrowRight } from "lucide-react";

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12";

export default function Books() {
  const [books, setBooks] = useState([]);
  useEffect(() => { api.get("/books").then((r) => setBooks(r.data)).catch(() => {}); }, []);

  return (
    <div className={`${WRAP} py-14 sm:py-20`}>
      <p className="mono-label text-gold">The Corpus</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">The Twelve Books</h1>
      <p className="font-body text-xl text-ink-2 mt-4 max-w-2xl leading-snug">
        The codex is organised as twelve books and one hundred forty-four chapters. Books eleven and twelve close
        with the self-audit and the finale.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-10">
        {books.map((b, i) => (
          <Link key={b.slug} to={`/read/${b.slug}`} data-testid={`book-card-${b.slug}`}
            className="fade-up group relative border border-line bg-[var(--surface)] p-6 rounded-sm hover:border-gold transition-colors overflow-hidden"
            style={{ animationDelay: `${i * 40}ms` }}>
            <EscherArt className="absolute right-0 bottom-0 w-28 h-10 opacity-40" variant="tessellation" />
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-gold text-2xl font-medium">{b.roman}</span>
              <span className="mono-label text-ink-muted">{b.chapter_count} chapters · {Math.round(b.reading_minutes / 60 * 10) / 10}h</span>
            </div>
            <h2 className="font-head text-2xl font-bold text-ink mt-4 group-hover:text-gold transition-colors leading-tight">{b.title}</h2>
            <p className="font-body text-lg text-ink-2 mt-2 leading-snug">{b.subtitle}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {b.concepts.slice(0, 4).map((c) => (
                <span key={c} className="mono-label text-ink-muted border border-line-subtle px-2 py-0.5 rounded-sm">{c}</span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 mono-label text-gold mt-5 group-hover:gap-2 transition-all">Open <ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

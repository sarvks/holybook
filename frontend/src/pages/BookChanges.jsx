import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { EscherArt } from "@/components/EscherArt";

const WRAP = "max-w-[900px] mx-auto px-4 sm:px-8";

export default function BookChanges() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/changes", { params: { limit: 60 } }).then((r) => setData(r.data)).catch(() => {}); }, []);

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Accountability</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">The Book Changes</h1>
      <p className="font-body text-xl text-ink-2 mt-4 leading-snug">
        Mahakali Tribe LLP controls publication, but revisions are attributable, appealable and never silently
        rewritten. Every edit keeps its prior state on the record.
      </p>
      <EscherArt className="w-full h-10 my-8 opacity-60" variant="lattice" />

      {!data ? <p className="mono-label text-ink-muted">Loading…</p> : (
        <>
          <p className="mono-label text-ink-muted mb-6">{data.total.toLocaleString()} recorded revision events</p>
          <ol className="relative border-l border-line ml-2" data-testid="changes-timeline">
            {data.events.map((e, i) => (
              <li key={i} className="ml-6 pb-8">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-gold" />
                <p className="mono-label text-ink-muted">{new Date(e.timestamp).toLocaleString()} · {e.editor} ({e.editor_role})</p>
                <Link to={`/proposition/${e.proposition_number}`} className="font-head text-lg text-ink hover:text-gold transition-colors mt-1 inline-block">
                  P{e.proposition_number} — {e.proposition_title}
                </Link>
                <p className="font-body text-lg text-ink-2 mt-1 leading-snug">{e.note}</p>
                <p className="mono-label text-ink-muted mt-1">{e.book_title} · was {e.previous_status} · now {e.current_status}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { EscherArt } from "@/components/EscherArt";

const WRAP = "max-w-[820px] mx-auto px-4 sm:px-8";

export default function Manifesto() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(0);
  useEffect(() => { api.get("/manifesto").then((r) => setData(r.data)).catch(() => {}); }, []);

  if (!data) return <div className={`${WRAP} py-20 mono-label text-ink-muted`}>Loading…</div>;

  return (
    <div className={`${WRAP} py-14 sm:py-20`}>
      <p className="mono-label text-gold">Front matter · read this first</p>
      <h1 className="font-head text-4xl sm:text-6xl font-extrabold tracking-tight uppercase text-ink mt-3 leading-none">The Opening Manifesto</h1>
      <p className="font-body text-xl text-ink-2 mt-5 leading-snug">{data.note}</p>
      <EscherArt className="w-full h-12 my-8 opacity-60" variant="lattice" />

      <div className="border-y border-line divide-y divide-line">
        {data.entries.map((e, i) => {
          const isOpen = open === i;
          return (
            <div key={e.order} data-testid={`manifesto-entry-${i}`}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-center gap-4 py-5 text-left group">
                <span className="font-mono text-gold text-lg w-12 shrink-0">{e.label}</span>
                <div className="flex-1">
                  <p className="mono-label text-ink-muted">{e.kicker}</p>
                  <h2 className="font-head text-xl sm:text-2xl font-semibold text-ink group-hover:text-gold transition-colors leading-tight mt-1">{e.title}</h2>
                </div>
                <span className={`text-ink-muted transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              </button>
              {isOpen && (
                <div className="pb-8 pl-0 sm:pl-16 fade-in">
                  {e.sections.map((s, j) => (
                    <div key={j} className="mb-6">
                      <h3 className="font-head text-lg font-medium text-gold mb-2">{s.heading}</h3>
                      {s.body.split("\n\n").map((para, k) => (
                        <p key={k} className="font-body text-xl text-ink leading-relaxed mb-3">{para}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { EscherArt } from "@/components/EscherArt";
import { ArrowRight, Shuffle, Sparkles, BookOpen, Network, ScrollText } from "lucide-react";

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12";

function StatTile({ label, value, sub, testid, delay }) {
  return (
    <div data-testid={testid} className="fade-up border border-line bg-[var(--surface)] p-5 sm:p-6 rounded-sm" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-count font-head text-3xl sm:text-4xl font-extrabold text-ink">{value}</div>
      <div className="mono-label text-gold mt-2">{label}</div>
      {sub && <div className="font-body text-ink-muted text-base mt-1">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState(null);
  const [validation, setValidation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/validation").then((r) => setValidation(r.data)).catch(() => {});
  }, []);

  const openRandom = async () => {
    const { data } = await api.get("/propositions/random");
    navigate(`/proposition/${data.number}`);
  };

  const nf = (n) => (n == null ? "—" : n.toLocaleString());
  const conf = stats?.confidence_distribution || { high: 0, moderate: 0, contested: 0, unrated: 0 };
  const total = conf.high + conf.moderate + conf.contested + (conf.unrated || 0) || 1;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line paper-grain">
        <div className={`${WRAP} py-16 sm:py-24 relative`}>
          <EscherArt className="absolute right-0 top-8 w-64 h-16 hidden lg:block opacity-70" variant="lattice" />
          <p className="mono-label text-gold fade-up">Mahakali Studios · Evidence-aware Digital Codex</p>
          <h1 className="fade-up font-head text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight uppercase leading-[0.95] mt-5 text-ink" style={{ animationDelay: "60ms" }}>
            The Holy Book
          </h1>
          <p className="fade-up font-head text-lg sm:text-2xl font-semibold tracking-tight text-gold mt-3" style={{ animationDelay: "80ms" }}>Making Other Holy Books Obsolete Since 2026</p>
          <p className="fade-up font-body text-xl sm:text-2xl text-ink-2 max-w-2xl mt-6 leading-snug" style={{ animationDelay: "120ms" }}>
            The complete codex, presented in the open. Every claim carries its evidence, its uncertainty,
            its counterarguments and its full revision history — so you can judge it, not just receive it.
          </p>

          <div className="fade-up mt-6 max-w-2xl border-l-2 border-gold pl-4" style={{ animationDelay: "160ms" }}>
            <p className="mono-label text-gold">Non-infallibility statement</p>
            <p className="font-body text-lg text-ink-2 mt-1 leading-snug">
              This book does not claim to be infallible. Its position that it "makes holy books obsolete" is recorded
              as the book's <em>thesis</em>, not an established fact. Comparisons use one disclosed evidence rubric and
              critique claims, never believers.
            </p>
          </div>

          <div className="fade-up flex flex-wrap gap-3 mt-8" style={{ animationDelay: "220ms" }}>
            <Link to="/manifesto" data-testid="cta-manifesto" className="group inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-sm mono-label hover:bg-gold hover:text-paper transition-colors">
              Read the Manifesto first <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/read" data-testid="cta-enter-books" className="inline-flex items-center gap-2 border border-line px-6 py-3 rounded-sm mono-label text-ink hover:border-gold hover:text-gold transition-colors">
              Enter the Books
            </Link>
            <Link to="/ask" data-testid="cta-ask" className="inline-flex items-center gap-2 border border-line px-6 py-3 rounded-sm mono-label text-ink hover:border-gold hover:text-gold transition-colors">
              <Sparkles size={16} /> Ask the Book
            </Link>
            <button onClick={openRandom} data-testid="cta-random" className="inline-flex items-center gap-2 border border-line px-6 py-3 rounded-sm mono-label text-ink hover:border-gold hover:text-gold transition-colors">
              <Shuffle size={16} /> Random
            </button>
          </div>
        </div>
      </section>

      {/* Live statistics */}
      <section className={`${WRAP} py-14 sm:py-20`}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="mono-label text-gold">Live corpus statistics</p>
            <h2 className="font-head text-2xl sm:text-4xl font-bold tracking-tight text-ink mt-2">Derived from the database</h2>
          </div>
          <EscherArt className="w-40 h-10 hidden sm:block" variant="stairs" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <StatTile testid="stat-books" label="Books" value={nf(stats?.books)} delay={0} />
          <StatTile testid="stat-chapters" label="Chapters" value={nf(stats?.chapters)} delay={40} />
          <StatTile testid="stat-propositions" label="Propositions" value={nf(stats?.propositions)} delay={80} />
          <StatTile testid="stat-citations" label="Citations" value={nf(stats?.citations)} delay={120} />
          <StatTile testid="stat-revisions" label="Revisions" value={nf(stats?.revisions)} delay={160} />
          <StatTile testid="stat-contradictions" label="With contradictions" value={nf(stats?.contradictions)} delay={200} />
          <StatTile testid="stat-disputed" label="Disputed / Retracted" value={`${nf(stats?.disputed)} / ${nf(stats?.retracted)}`} delay={240} />
          <StatTile testid="stat-reading" label="Reading time" value={`${nf(stats?.reading_hours)}h`} sub="approx. full read" delay={280} />
        </div>

        {/* Confidence distribution */}
        <div className="mt-8 border border-line bg-[var(--surface)] p-6 rounded-sm">
          <p className="mono-label text-ink-muted mb-4">Confidence distribution</p>
          <div className="flex h-4 w-full overflow-hidden rounded-sm border border-line">
            <div className="bg-verified" style={{ width: `${(conf.high / total) * 100}%` }} title="High" />
            <div className="bg-gold" style={{ width: `${(conf.moderate / total) * 100}%` }} title="Moderate" />
            <div className="bg-disputed" style={{ width: `${(conf.contested / total) * 100}%` }} title="Contested" />
            <div className="bg-line" style={{ width: `${((conf.unrated || 0) / total) * 100}%` }} title="Not yet rated" />
          </div>
          <div className="flex flex-wrap gap-6 mt-3 mono-label text-ink-muted">
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-verified" /> High {conf.high}</span>
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-gold" /> Moderate {conf.moderate}</span>
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-disputed" /> Contested {conf.contested}</span>
            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-line" /> Not yet rated {conf.unrated || 0}</span>
          </div>
          {(conf.unrated || 0) > 0 && (
            <p className="font-body text-ink-muted mt-3 leading-snug">The source archive did not include structured confidence ratings or citations. Rather than invent them, propositions are marked <em>Not yet rated</em> until editors assess them.</p>
          )}
        </div>
      </section>

      {/* Validation / corpus gate */}
      {validation && (
        <section className={`${WRAP} pb-14 sm:pb-20`}>
          <div className="border border-line rounded-sm overflow-hidden">
            <div className="bg-[var(--cardbg)] px-6 py-4 border-b border-line flex items-center justify-between">
              <p className="mono-label text-gold">Corpus reconciliation — claimed vs. actual</p>
              <span data-testid="validation-status" className={`mono-label ${validation.all_match ? "text-verified" : "text-disputed"}`}>
                {validation.all_match ? "All totals match" : "Discrepancies found"}
              </span>
            </div>
            <div className="p-6">
              <p className="font-body text-lg text-ink-2 mb-5 leading-snug">{validation.note}</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {validation.checks.map((c) => (
                  <div key={c.entity} className="border border-line-subtle p-4 rounded-sm">
                    <p className="mono-label text-ink-muted capitalize">{c.entity}</p>
                    <p className="font-head text-2xl font-bold text-ink mt-1">{c.actual.toLocaleString()}</p>
                    <p className="font-body text-ink-muted">claimed {c.claimed.toLocaleString()} · {c.match ? "match" : `Δ ${c.delta}`}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Explore entry points */}
      <section className={`${WRAP} pb-20`}>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { to: "/read", icon: BookOpen, title: "Read the codex", desc: "Book → Chapter → Proposition, in Simple or Scholar mode.", testid: "entry-read" },
            { to: "/map", icon: Network, title: "Map of Everything", desc: "A knowledge graph of concepts, with an accessible table alternative.", testid: "entry-map" },
            { to: "/audit", icon: ScrollText, title: "Scripture Audit", desc: "What the book got wrong, disputes it holds, and its self-audit.", testid: "entry-audit" },
          ].map((e) => (
            <Link key={e.to} to={e.to} data-testid={e.testid} className="group border border-line bg-[var(--surface)] p-6 rounded-sm hover:border-gold transition-colors">
              <e.icon size={22} className="text-gold" />
              <h3 className="font-head text-xl font-semibold text-ink mt-4 group-hover:text-gold transition-colors">{e.title}</h3>
              <p className="font-body text-lg text-ink-2 mt-2 leading-snug">{e.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

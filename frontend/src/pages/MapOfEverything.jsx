import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, RotateCcw, Network, Table as TableIcon } from "lucide-react";

const WRAP = "max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12";
const CX = 500, CY = 400;

export default function MapOfEverything() {
  const [graph, setGraph] = useState(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");
  const drag = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { api.get("/graph").then((r) => setGraph(r.data)).catch(() => {}); }, []);

  const layout = useMemo(() => {
    if (!graph) return { nodes: {}, edges: [] };
    const nodes = {};
    const books = graph.nodes.filter((n) => n.type === "book");
    const parentOf = {};
    graph.edges.forEach((e) => { if (e.kind === "contains") parentOf[e.target] = e.source; });
    books.forEach((b, i) => {
      const a = (i / books.length) * Math.PI * 2 - Math.PI / 2;
      nodes[b.id] = { ...b, x: CX + Math.cos(a) * 300, y: CY + Math.cos(a) * 0 + Math.sin(a) * 260, angle: a };
    });
    const conceptByBook = {};
    graph.nodes.filter((n) => n.type === "concept").forEach((c) => {
      const p = parentOf[c.id];
      (conceptByBook[p] = conceptByBook[p] || []).push(c);
    });
    Object.entries(conceptByBook).forEach(([bid, concepts]) => {
      const b = nodes[bid];
      if (!b) return;
      concepts.forEach((c, j) => {
        const spread = (j - (concepts.length - 1) / 2) * 0.32;
        const a = b.angle + spread;
        const r = 95 + (j % 2) * 26;
        nodes[c.id] = { ...c, x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r };
      });
    });
    return { nodes, edges: graph.edges };
  }, [graph]);

  const onWheel = (e) => {
    e.preventDefault();
    setView((v) => ({ ...v, k: Math.min(3, Math.max(0.4, v.k * (e.deltaY < 0 ? 1.1 : 0.9))) }));
  };
  const onPointerDown = (e) => { drag.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }; };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setView((v) => ({ ...v, x: drag.current.ox + (e.clientX - drag.current.sx), y: drag.current.oy + (e.clientY - drag.current.sy) }));
  };
  const onPointerUp = () => { drag.current = null; };

  const concepts = useMemo(() => {
    if (!graph) return [];
    const conn = {};
    graph.edges.forEach((e) => {
      if (e.kind === "tension") { conn[e.source] = (conn[e.source] || 0) + 1; conn[e.target] = (conn[e.target] || 0) + 1; }
    });
    return graph.nodes.filter((n) => n.type === "concept")
      .map((c) => ({ ...c, connections: conn[c.id] || 0 }))
      .filter((c) => c.label.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => sortDesc ? b.weight - a.weight : a.weight - b.weight);
  }, [graph, sortDesc, filter]);

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">The Atlas</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">Map of Everything</h1>
      <p className="font-body text-xl text-ink-2 mt-4 max-w-2xl leading-snug">
        A knowledge graph of the codex's concepts and their tensions. A fully accessible table alternative is provided —
        it carries the same information without requiring the visual graph.
      </p>

      <Tabs defaultValue="graph" className="mt-8">
        <TabsList className="bg-[var(--surface)] border border-line">
          <TabsTrigger value="graph" data-testid="map-tab-graph" className="mono-label data-[state=active]:bg-ink data-[state=active]:text-paper"><Network size={14} className="mr-2" />Graph</TabsTrigger>
          <TabsTrigger value="table" data-testid="map-tab-table" className="mono-label data-[state=active]:bg-ink data-[state=active]:text-paper"><TableIcon size={14} className="mr-2" />Accessible table</TabsTrigger>
        </TabsList>

        <TabsContent value="graph">
          <div className="relative border border-line rounded-sm bg-[var(--surface)] mt-4 overflow-hidden">
            <div className="absolute top-3 right-3 z-10 flex gap-1">
              <button onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.2) }))} className="p-2 border border-line bg-paper rounded-sm text-ink-2 hover:text-gold" aria-label="Zoom in"><ZoomIn size={14} /></button>
              <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.4, v.k * 0.8) }))} className="p-2 border border-line bg-paper rounded-sm text-ink-2 hover:text-gold" aria-label="Zoom out"><ZoomOut size={14} /></button>
              <button onClick={() => setView({ k: 1, x: 0, y: 0 })} className="p-2 border border-line bg-paper rounded-sm text-ink-2 hover:text-gold" aria-label="Reset"><RotateCcw size={14} /></button>
            </div>
            <svg data-testid="knowledge-graph" viewBox="0 0 1000 800" className="w-full h-[560px] cursor-grab active:cursor-grabbing touch-none"
              onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
              <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={{ transformOrigin: "center" }}>
                {layout.edges.map((e, i) => {
                  const s = layout.nodes[e.source], t = layout.nodes[e.target];
                  if (!s || !t) return null;
                  return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke={e.kind === "tension" ? "var(--disputed)" : "var(--line)"}
                    strokeWidth={e.kind === "tension" ? 1 : 0.6}
                    strokeDasharray={e.kind === "tension" ? "4 3" : ""} opacity={e.kind === "tension" ? 0.7 : 0.5} />;
                })}
                {Object.values(layout.nodes).map((n) => (
                  <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="cursor-pointer" onClick={() => setSelected(n)}>
                    {n.type === "book" ? (
                      <>
                        <circle r="10" fill="var(--gold)" />
                        <text x="14" y="4" className="font-mono" fontSize="12" fill="var(--ink)">{n.label}</text>
                      </>
                    ) : (
                      <>
                        <circle r={Math.max(4, Math.min(12, 4 + (n.weight || 0) / 6))} fill="var(--paper)" stroke="var(--ink-2)" strokeWidth="1" />
                        <text x="8" y="3" className="font-mono" fontSize="9" fill="var(--ink-2)">{n.label}</text>
                      </>
                    )}
                  </g>
                ))}
              </g>
            </svg>
            {selected && (
              <div className="absolute bottom-3 left-3 z-10 border border-line bg-paper p-4 rounded-sm max-w-xs">
                <p className="mono-label text-gold">{selected.type}</p>
                <p className="font-head text-lg text-ink mt-1">{selected.label}</p>
                {selected.type === "concept" && <p className="font-body text-ink-2 mt-1">{selected.weight} propositions carry this concept.</p>}
              </div>
            )}
            <div className="px-4 py-2 border-t border-line mono-label text-ink-muted flex gap-5">
              <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gold" /> Book</span>
              <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border border-ink-2" /> Concept</span>
              <span className="inline-flex items-center gap-2"><span className="w-4 border-t border-dashed border-disputed" /> Tension</span>
              <span className="hidden sm:inline">Drag to pan · scroll to zoom</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <Input data-testid="map-table-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter concepts…" className="max-w-xs bg-[var(--surface)] border-line font-body text-lg" />
              <button onClick={() => setSortDesc(!sortDesc)} className="mono-label px-3 py-2 border border-line rounded-sm text-ink-2 hover:text-gold">Weight {sortDesc ? "↓" : "↑"}</button>
            </div>
            <table className="w-full border border-line" data-testid="map-table">
              <thead>
                <tr className="bg-[var(--cardbg)] mono-label text-ink-muted text-left">
                  <th className="p-3">Concept</th>
                  <th className="p-3">Propositions</th>
                  <th className="p-3">Tensions</th>
                </tr>
              </thead>
              <tbody className="font-body text-lg">
                {concepts.map((c) => (
                  <tr key={c.id} className="border-t border-line-subtle hover:bg-[var(--surface)] cursor-pointer" onClick={() => navigate(`/explore?tag=${encodeURIComponent(c.label)}`)}>
                    <td className="p-3 text-ink">{c.label}</td>
                    <td className="p-3 text-ink-2">{c.weight}</td>
                    <td className="p-3 text-ink-2">{c.connections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

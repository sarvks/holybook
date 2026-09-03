"""Parser for the real 'Holy Book.zip' archive (Markdown corpus).

Structure: BOOK_<ROMAN>_<NAME>/<subtitle>/<order>_<chapterNo>._<Title>.md
Each chapter file: `# N. Title` then `## Section` blocks. Each `## Section`
becomes a proposition (heading = claim, body = text). No confidence/sources are
present in the source, so imported propositions are marked status='established'
and confidence='unrated' — nothing is invented.
"""
import re
from pathlib import Path

ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7,
         "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12}
ROMAN_REV = {v: k for k, v in ROMAN.items()}
WPM = 200

CHAPTER_RE = re.compile(r"^(\d+)_(\d+)\._(.+)\.md$")
BOOK_RE = re.compile(r"^BOOK_([IVX]+)_(.+)$")

# Editorially framed thematic tensions between chapter concepts (keyword pairs).
THEME_PAIRS = [
    ("freedom", "responsibility"), ("freedom", "power"), ("power", "consent"),
    ("pleasure", "harm"), ("wealth", "justice"), ("authority", "resistance"),
    ("certainty", "doubt"), ("life", "death"), ("technology", "nature"),
    ("individual", "society"), ("tradition", "progress"), ("order", "freedom"),
    ("faith", "reason"), ("violence", "compassion"), ("empire", "resistance"),
    ("self", "others"), ("truth", "belief"), ("virtue", "harm"),
]


def _pretty(s: str) -> str:
    s = s.replace("_", " ").strip()
    return re.sub(r"\s+", " ", s)


def _reading(text: str) -> int:
    return max(1, round(len(text.split()) / WPM))


def _parse_chapter_md(text: str, fallback_title: str):
    lines = text.split("\n")
    title = fallback_title
    intro_lines, sections, cur = [], [], None
    for ln in lines:
        if ln.startswith("# ") and not ln.startswith("## "):
            raw = ln[2:].strip()
            title = re.sub(r"^\d+\.\s*", "", raw).strip() or fallback_title
        elif ln.startswith("## "):
            if cur:
                sections.append(cur)
            cur = {"heading": ln[3:].strip(), "body": []}
        else:
            if cur:
                cur["body"].append(ln)
            elif ln.strip():
                intro_lines.append(ln)
    if cur:
        sections.append(cur)
    intro = re.sub(r"\s+", " ", " ".join(intro_lines)).strip()
    for s in sections:
        s["body"] = re.sub(r"\n{2,}", "\n\n", "\n".join(s["body"]).strip())
    return title, intro, [s for s in sections if s["heading"]]


def parse_archive(root: str):
    root = Path(root)
    # locate the extracted top folder that contains BOOK_ dirs
    candidates = [root] + [p for p in root.rglob("*") if p.is_dir()]
    base = None
    for c in candidates:
        if any(BOOK_RE.match(d.name) for d in c.iterdir() if d.is_dir()):
            base = c
            break
    if base is None:
        raise ValueError("No BOOK_ folders found in archive")

    books, chapters, propositions = [], [], []
    book_dirs = sorted([d for d in base.iterdir() if d.is_dir() and BOOK_RE.match(d.name)],
                       key=lambda d: ROMAN.get(BOOK_RE.match(d.name).group(1), 99))

    prop_no = 0
    for bd in book_dirs:
        m = BOOK_RE.match(bd.name)
        roman, name = m.group(1), _pretty(m.group(2)).title()
        bnum = ROMAN[roman]
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

        ch_files = sorted(bd.rglob("*.md"),
                          key=lambda p: int(CHAPTER_RE.match(p.name).group(2)) if CHAPTER_RE.match(p.name) else 9999)
        ch_files = [p for p in ch_files if CHAPTER_RE.match(p.name)]
        seen = set()
        subtitle = None
        book_chapters = []
        book_reading = 0
        for cf in ch_files:
            cm = CHAPTER_RE.match(cf.name)
            chnum = int(cm.group(2))
            if chnum in seen:
                continue
            seen.add(chnum)
            if subtitle is None:
                subtitle = _pretty(cf.parent.name).title()
            raw = cf.read_text(encoding="utf-8", errors="ignore")
            title, intro, sections = _parse_chapter_md(raw, _pretty(cm.group(3)).title())
            ch_reading = 0
            prop_numbers = []
            for s in sections:
                prop_no += 1
                body = s["body"]
                claim = s["heading"].strip()
                full = f"{claim}. {body}" if body else claim
                rt = _reading(full)
                ch_reading += rt
                propositions.append({
                    "number": prop_no,
                    "title": claim[:180],
                    "claim": claim,
                    "text": body or claim,
                    "concept": title,
                    "book_id": slug,
                    "book_slug": slug,
                    "book_title": name,
                    "chapter_id": f"{slug}-{chnum}",
                    "chapter_number": chnum,
                    "chapter_title": title,
                    "tags": [title, slug],
                    "confidence": "unrated",
                    "status": "established",
                    "sources": [],
                    "counterarguments": [],
                    "contradicts": [],
                    "revisions": [],
                    "reading_minutes": rt,
                })
                prop_numbers.append(prop_no)
            book_reading += ch_reading
            kind = "finale" if chnum == 144 else ("self-audit" if chnum == 143 else "standard")
            chapters.append({
                "id": f"{slug}-{chnum}", "number": chnum, "local_number": len(book_chapters) + 1,
                "title": title, "kind": kind, "intro": intro,
                "book_id": slug, "book_slug": slug, "book_title": name,
                "proposition_count": len(prop_numbers), "proposition_numbers": prop_numbers,
                "reading_minutes": ch_reading,
            })
            book_chapters.append(chnum)

        books.append({
            "id": slug, "number": bnum, "roman": roman, "slug": slug,
            "title": name, "subtitle": subtitle or "",
            "concepts": [c["title"] for c in chapters if c["book_slug"] == slug][:8],
            "chapter_count": len(book_chapters),
            "reading_minutes": book_reading,
        })

    tensions = build_tensions(chapters, propositions)
    graph = build_graph(books, chapters, tensions)
    manifesto = parse_manifesto(base)
    return books, chapters, propositions, graph, tensions, manifesto


def parse_manifesto(base):
    from pathlib import Path as _P
    mdir = None
    for c in [base] + [p for p in _P(base).rglob("Opening_Manifesto") if p.is_dir()]:
        d = _P(c) / "Opening_Manifesto" if (_P(c) / "Opening_Manifesto").is_dir() else (_P(c) if _P(c).name == "Opening_Manifesto" else None)
        if d and d.is_dir():
            mdir = d
            break
    if not mdir:
        return []
    entries = []
    for sub in sorted([d for d in mdir.iterdir() if d.is_dir()]):
        mds = list(sub.glob("*.md"))
        if not mds:
            continue
        f = mds[0]
        mnum = re.match(r"^(\d+)_", f.name)
        order = int(mnum.group(1)) if mnum else 999
        parts = sub.name.split("_", 1)
        label = parts[0].rstrip(".")
        folder_title = _pretty(parts[1]).title() if len(parts) > 1 else _pretty(sub.name).title()
        title, intro, sections = _parse_chapter_md(f.read_text(encoding="utf-8", errors="ignore"), folder_title)
        entries.append({
            "order": order, "label": label if label != "PREAMBLE" else "—",
            "kicker": "Preamble" if label == "PREAMBLE" else f"Declaration {label}",
            "title": title or folder_title,
            "intro": intro,
            "sections": [{"heading": s["heading"], "body": s["body"]} for s in sections],
        })
    entries.sort(key=lambda e: e["order"])
    return entries


def build_tensions(chapters, propositions):
    """Link chapters whose concepts sit in editorially-framed thematic tension.
    Links real propositions from each side; labelled as framed, not invented."""
    lead_prop = {}
    for p in propositions:
        lead_prop.setdefault(p["chapter_id"], p["number"])
    by_kw = {}
    for c in chapters:
        t = c["title"].lower()
        for kw in {k for pair in THEME_PAIRS for k in pair}:
            if re.search(rf"\b{re.escape(kw)}\b", t):
                by_kw.setdefault(kw, []).append(c)
    tensions = []
    seen = set()
    for a, b in THEME_PAIRS:
        for ca in by_kw.get(a, []):
            for cb in by_kw.get(b, []):
                if ca["book_slug"] == cb["book_slug"] and ca["number"] == cb["number"]:
                    continue
                key = tuple(sorted([ca["id"], cb["id"]]))
                if key in seen:
                    continue
                seen.add(key)
                pa, pb = lead_prop.get(ca["id"]), lead_prop.get(cb["id"])
                if not pa or not pb:
                    continue
                tensions.append({
                    "theme": f"{a} \u2194 {b}",
                    "a": {"book_title": ca["book_title"], "book_slug": ca["book_slug"],
                          "chapter_number": ca["number"], "chapter_title": ca["title"], "proposition_number": pa},
                    "b": {"book_title": cb["book_title"], "book_slug": cb["book_slug"],
                          "chapter_number": cb["number"], "chapter_title": cb["title"], "proposition_number": pb},
                })
    # reflect on propositions
    idx = {p["number"]: p for p in propositions}
    for t in tensions:
        pa, pb = t["a"]["proposition_number"], t["b"]["proposition_number"]
        if pb not in idx[pa]["contradicts"]:
            idx[pa]["contradicts"].append(pb)
        if pa not in idx[pb]["contradicts"]:
            idx[pb]["contradicts"].append(pa)
    return tensions


def build_graph(books, chapters, tensions):
    nodes, edges = [], []
    for b in books:
        nodes.append({"id": f"book:{b['slug']}", "label": b["title"], "type": "book", "group": b["number"]})
    for c in chapters:
        cid = f"concept:{c['book_slug']}:{c['number']}"
        nodes.append({"id": cid, "label": c["title"], "type": "concept",
                      "group": next((b["number"] for b in books if b["slug"] == c["book_slug"]), 0),
                      "weight": c["proposition_count"]})
        edges.append({"source": f"book:{c['book_slug']}", "target": cid, "kind": "contains"})
    for t in tensions:
        edges.append({"source": f"concept:{t['a']['book_slug']}:{t['a']['chapter_number']}",
                      "target": f"concept:{t['b']['book_slug']}:{t['b']['chapter_number']}", "kind": "tension"})
    return {"nodes": nodes, "edges": edges}

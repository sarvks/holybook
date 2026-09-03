# Master Prompt — The Book of Everything (Emergent.sh / Lovable)

> Implementation-ready prompt to reconstruct this evidence-aware digital codex.
> It matches the delivered architecture and its content/ethics policy.

## Role & Product
Build a public, evidence-aware digital codex titled **"The Book of Everything"** by Mahakali Studios, editorially owned by **Mahakali Tribe LLP**. It presents the complete book **without** treating its provocative "makes holy books obsolete" position as an established fact — that line is recorded as the book's **thesis**, never a verified superiority claim.

## Non-negotiable Content Policy
1. Never invent missing scripture. Reconcile **claimed** totals (12 Books / 144 Chapters / 1,000 Propositions) against **actual** totals derived from the database, and show discrepancies transparently.
2. Every proposition exposes: confidence (high/moderate/contested), status (established/disputed/retracted), disclosed sources with licenses, counterarguments, contradictions, and full revision history.
3. Revisions are attributable, timestamped, appealable, and **never silently rewritten** (previous state is preserved).
4. AI participation is disclosed; **AI cannot publish canonical material**. "Ask the Book" answers only from published content, cites propositions, reports uncertainty, and refuses unsupported questions.
5. Religious comparisons use one disclosed evidence rubric and critique claims, never believers. Minimal data collection, account export/deletion, no ad trackers.

## Stack
- **Frontend:** React + Tailwind, accessible (WCAG 2.2 AA), keyboard nav, reduced motion, text scaling, light/dark. Graph has an accessible table alternative.
- **Backend:** FastAPI, versioned `/api` REST, JWT auth with roles (reader/editor/admin), import/validation workflow.
- **Database:** MongoDB for books, chapters, propositions, revisions, relationships, users, challenges; MongoDB **text search** for discovery + grounded retrieval.
- **AI:** A supported model behind FastAPI (default GPT-5.4) for corpus-grounded Q&A and editorial suggestions; human approval mandatory.

## Data Model (MongoDB)
- `books`: number, roman, slug, title, subtitle, concepts[], chapter_count, reading_minutes.
- `chapters`: number (global 1–144), local_number, title, kind (standard/self-audit/finale), book_slug, proposition_numbers[], reading_minutes.
- `propositions`: number (1–1000), title, claim, text, concept, book/chapter refs, tags[], confidence, status, sources[]{author,work,year,type,license}, counterarguments[], contradicts[], revisions[]{version,editor,editor_role,timestamp,note,previous_status,previous_text}, reading_minutes.
- `users`, `bookmarks`, `notes`, `progress`, `challenges`, `graph` (concept nodes + tension edges).

## Core API (prefix `/api`)
- Auth: `POST /auth/register|login|logout`, `GET /auth/me`.
- Corpus: `GET /stats`, `GET /validation`, `GET /books`, `GET /books/{slug}`, `GET /chapters/{number}`, `GET /propositions` (q/confidence/status/tag/book/page), `GET /propositions/random`, `GET /propositions/{number}`.
- Knowledge: `GET /graph`, `GET /changes`, `GET /audit`.
- Grounded Q&A: `POST /ask` → retrieves top propositions via text search, prompts the model to answer only from them with `[P#]` citations, refuses otherwise; returns answer + citations + grounding + AI disclosure.
- User: `library/bookmarks`, `library/notes`, `progress`, `challenges`, `me/challenges`.
- Editorial (editor/admin): `editorial/summary`, `editorial/challenges`, `challenges/{id}/decision`, `propositions/{n}/revise`, `propositions/{n}/retract`.

## Pages
Home (live stats + non-infallibility + claimed-vs-actual reconciliation), Books index, Book view, Chapter reader (Simple/Scholar modes, text scale, reading progress, bookmarks, Escher line-art headers), Proposition detail (evidence/counterarguments/contradictions/revisions/notes/challenge), Proposition Explorer (search + filters + pagination), Map of Everything (graph + accessible table), The Book Changes (revision timeline), Scripture Audit (status counts, retracted/disputed lists, Ch.143 self-audit, Ch.144 finale, policy note), Ask the Book, Personal Library, Login/Register, Editorial Dashboard.

## UI/UX Direction
Modern codex: monumental grotesk headings (Outfit), readable serif body (Cormorant Garamond), mono labels (JetBrains Mono), ivory/graphite tones with a restrained gold accent, manuscript structure, scientific/Escher line diagrams, restrained motion. Avoid denominational iconography, generic spiritual effects, and SaaS blue-gradient presentation.

## Implementation Phases
1. **Corpus gate:** unpack/inventory/hash/validate/map the ZIP; reconcile actual vs claimed. (If no archive is provided, generate a transparent, clearly-labeled sample corpus and keep the import workflow ready.)
2. **Foundation:** schemas, APIs, auth/roles, audit log, import workflow.
3. **Public experience:** stats, reader, explorer, citations, search, revisions, contradictions.
4. **Advanced systems:** knowledge graph, Scripture Audit, personal library, moderated challenges, citation-bound Ask the Book.
5. **Hardening:** accessibility, security, abuse controls, copyright review, performance, mobile, launch validation.

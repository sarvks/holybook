# PRD — The Holy Book (The Book of Everything)

## Problem statement
A public, evidence-aware digital codex by Mahakali Studios (editorial owner: Mahakali Tribe LLP) presenting the complete book without treating "makes holy books obsolete" as established fact.

## Architecture
- Frontend: React + Tailwind (Outfit/Cormorant/JetBrains Mono), light/dark, WCAG-minded.
- Backend: FastAPI, JWT auth (reader/editor/admin), MongoDB text search, OpenAI GPT-5.4 (grounded Q&A) + OpenAI TTS via Emergent Universal Key.
- Data: books, chapters, propositions, revisions, graph, tensions, users, bookmarks, notes, progress, challenges, import_meta.

## Implemented
- 2026-06: MVP — homepage stats + reconciliation, reader (Simple/Scholar), Proposition Explorer, Map of Everything (graph+table), The Book Changes, Scripture Audit, Ask the Book (grounded), Library, moderated Challenges, Editorial dashboard. Renamed to "The Holy Book".
- 2026-06: REAL IMPORT of Holy Book.zip → 12 books / 144 chapters / 1,299 propositions (transparent +299 vs claimed 1,000). Streaming Ask (SSE). OpenAI TTS narration ("Listen"). Contradiction Atlas of editorially-framed thematic tensions. Admin re-import endpoint. Hero tagline "Making Other Holy Books Obsolete Since 2026".

## Content policy
Never invent scripture; show actual vs claimed. Imported propositions are status=established, confidence=unrated (no fabricated ratings/sources). Revisions preserved (never silently rewritten). AI disclosed; cannot publish canon.

## Backlog (P1/P2)
- Editorial confidence-rating & source-attribution workflow for the 1,299 imported propositions.
- Import the Opening Manifesto & Proposed Full Work sections as front/appendix matter.
- Cache TTS to object storage; add voice picker & full-chapter audio.
- Localization / narrated editions; PWA offline reading; contributor reputation.

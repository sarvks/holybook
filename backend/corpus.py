"""Deterministic generator for the transparent sample corpus of
'Holy Book / The Book of Everything'. Produces books, chapters and
propositions with evidence, counterarguments, contradictions and revisions.

No real scripture is invented as fact: every proposition carries confidence,
status and disclosed sources so the reader can judge it. Totals are derived
from what is generated here and reconciled against the *claimed* totals in
the editorial validation report.
"""
import random
import uuid
from datetime import datetime, timezone, timedelta

WPM = 200

BOOKS = [
    {
        "slug": "origins", "title": "The Book of Origins", "roman": "I",
        "subtitle": "On beginnings, cosmos, and the first distinctions",
        "concepts": ["Cosmogenesis", "The Void", "Emergence", "Symmetry Breaking", "Causation", "Contingency"],
        "subjects": ["The universe", "The first event", "A beginning", "The cosmos", "Order", "The vacuum",
                     "Time's opening", "The observable horizon", "A cause", "Structure"],
        "predicates": ["arises from conditions that need not have obtained", "is not required to explain itself",
                       "can be described without appeal to purpose", "leaves measurable traces we can still read",
                       "admits more than one consistent account", "is better modelled than narrated",
                       "does not depend on a witness to be real", "precedes the language we use to name it",
                       "is continuous with what follows it", "resists any single final picture"],
    },
    {
        "slug": "matter", "title": "The Book of Matter and Energy", "roman": "II",
        "subtitle": "On substance, force, and the grammar of the physical",
        "concepts": ["Conservation", "Fields", "Entropy", "Quantisation", "Relativity", "Measurement"],
        "subjects": ["Matter", "Energy", "A field", "The atom", "Heat", "Light", "Mass", "A force", "The vacuum state", "Charge"],
        "predicates": ["is neither created nor destroyed, only transformed", "behaves lawfully across every tested scale",
                       "is exchangeable with information at a cost", "spreads unless work resists it",
                       "is described by relations rather than by things", "is disturbed by the act of measuring it",
                       "carries no intrinsic meaning of its own", "obeys symmetries that predict conserved quantities",
                       "is discrete where classical intuition expects continuity", "constrains what any later story may claim"],
    },
    {
        "slug": "life", "title": "The Book of Life", "roman": "III",
        "subtitle": "On living systems, descent, and adaptation",
        "concepts": ["Selection", "Heredity", "Metabolism", "Variation", "Extinction", "Symbiosis"],
        "subjects": ["Life", "A lineage", "The cell", "A gene", "An organism", "A population", "Adaptation", "Death", "Reproduction", "An ecosystem"],
        "predicates": ["is descent with modification under selection", "records its history in its own structure",
                       "persists by copying imperfectly", "is optimised locally, never globally",
                       "has no goal beyond continuation", "is a truce among competing parts",
                       "was not designed toward us", "can be studied without reverence or contempt",
                       "is bounded by the energy it can capture", "leaves a fossil of its constraints"],
    },
    {
        "slug": "mind", "title": "The Book of Mind", "roman": "IV",
        "subtitle": "On consciousness, perception, and the felt world",
        "concepts": ["Consciousness", "Perception", "Memory", "Attention", "Self", "Illusion"],
        "subjects": ["The mind", "Consciousness", "A perception", "Memory", "The self", "Attention", "A belief", "Emotion", "The brain", "Awareness"],
        "predicates": ["is a process, not a substance", "reconstructs the world rather than receiving it",
                       "edits its own past to stay coherent", "can be mistaken about itself",
                       "is bound to a body it cannot fully observe", "is plural where it feels single",
                       "arises from mechanisms it does not perceive", "assigns meaning that the world does not supply",
                       "is a model the organism runs to act", "resists reduction without forbidding it"],
    },
    {
        "slug": "knowledge", "title": "The Book of Knowledge", "roman": "V",
        "subtitle": "On truth, evidence, and the limits of certainty",
        "concepts": ["Evidence", "Fallibility", "Inference", "Consensus", "Doubt", "Justification"],
        "subjects": ["Knowledge", "A claim", "Certainty", "Evidence", "A theory", "Doubt", "Consensus", "Truth", "An error", "Inquiry"],
        "predicates": ["is justified belief that remains open to revision", "is only as strong as its weakest premise",
                       "must survive attempts to refute it", "is provisional even at its most confident",
                       "improves by being wrong in public", "is not settled by authority alone",
                       "measures the world without ever finishing", "carries the marks of who produced it",
                       "should state its own uncertainty", "is a method before it is a result"],
    },
    {
        "slug": "ethics", "title": "The Book of Value", "roman": "VI",
        "subtitle": "On good, harm, and how we ought to act",
        "concepts": ["Harm", "Fairness", "Autonomy", "Consequence", "Duty", "Care"],
        "subjects": ["A value", "Harm", "Fairness", "A duty", "Consent", "Suffering", "A right", "The good", "A rule", "Care"],
        "predicates": ["is defended by reasons others can weigh", "matters because suffering matters",
                       "cannot be settled by force and remain just", "binds the strong more than the weak",
                       "requires consent it must not presume", "is revisable as we learn who is harmed",
                       "should critique claims, never punish believers", "is not made true by how many hold it",
                       "must answer to those it affects", "outranks tradition when the two conflict"],
    },
    {
        "slug": "society", "title": "The Book of Society", "roman": "VII",
        "subtitle": "On power, institutions, and the commons",
        "concepts": ["Power", "Law", "Cooperation", "Inequality", "Legitimacy", "The Commons"],
        "subjects": ["A society", "Power", "The law", "An institution", "Cooperation", "Inequality", "A market", "Authority", "The commons", "A norm"],
        "predicates": ["is a bargain that can be renegotiated", "concentrates unless deliberately dispersed",
                       "is legitimate only while accountable", "outlives the people who built it",
                       "rewards trust more than it rewards force", "hides its assumptions in its defaults",
                       "must be auditable to be trusted", "shapes what its members can imagine",
                       "fails quietly before it fails loudly", "is measured by how it treats its least"],
    },
    {
        "slug": "language", "title": "The Book of Language", "roman": "VIII",
        "subtitle": "On meaning, symbol, and translation",
        "concepts": ["Meaning", "Reference", "Metaphor", "Translation", "Silence", "Ambiguity"],
        "subjects": ["Language", "A word", "Meaning", "A metaphor", "Translation", "A name", "Silence", "A symbol", "Grammar", "A text"],
        "predicates": ["means by use, not by decree", "points beyond itself without ever arriving",
                       "loses and gains something in every translation", "shapes the thoughts it claims only to express",
                       "is never fully owned by its author", "carries history it did not choose",
                       "can mislead precisely because it is clear", "is a map that is not the territory",
                       "must be read in the context that made it", "changes the reader who takes it seriously"],
    },
    {
        "slug": "time", "title": "The Book of Time", "roman": "IX",
        "subtitle": "On change, memory, and the arrow",
        "concepts": ["The Arrow", "Change", "Recurrence", "Duration", "Prediction", "Decay"],
        "subjects": ["Time", "The present", "Change", "The past", "The future", "A moment", "Duration", "An arrow", "Recurrence", "Decay"],
        "predicates": ["has a direction set by entropy, not by wish", "is real without being a thing that flows",
                       "cannot be recovered, only recorded", "is measured differently by different observers",
                       "makes prediction cheaper than reversal", "erases evidence it does not preserve",
                       "is the price living systems pay to persist", "gives every account an expiry",
                       "is asymmetrical in what it allows", "will outlast the questions we ask of it"],
    },
    {
        "slug": "pattern", "title": "The Book of Pattern", "roman": "X",
        "subtitle": "On number, proof, and abstraction",
        "concepts": ["Proof", "Infinity", "Structure", "Probability", "Symmetry", "Incompleteness"],
        "subjects": ["A pattern", "Number", "A proof", "Infinity", "Probability", "Symmetry", "A structure", "An axiom", "Logic", "A model"],
        "predicates": ["is true by demonstration, not by vote", "holds regardless of who discovers it",
                       "reveals limits that no effort removes", "quantifies ignorance without ending it",
                       "is chosen, and its choice has consequences", "cannot prove its own consistency from within",
                       "compresses the world into something we can hold", "is beautiful in ways that are testable",
                       "applies only where its assumptions hold", "is a language the universe seems to answer in"],
    },
    {
        "slug": "continuity", "title": "The Book of Continuity", "roman": "XI",
        "subtitle": "On death, inheritance, and what remains",
        "concepts": ["Death", "Inheritance", "Legacy", "Grief", "Renewal", "Impermanence"],
        "subjects": ["Death", "A legacy", "Grief", "Inheritance", "Memory of the dead", "An ending", "Renewal", "What remains", "Impermanence", "A generation"],
        "predicates": ["ends the person and not their effects", "asks the living to carry what it drops",
                       "is not improved by pretending it is not final", "distributes what one life could not keep",
                       "can be honoured without being deceived about", "makes room for what has not yet arrived",
                       "is the condition, not the enemy, of meaning", "returns matter to circulation",
                       "is easier borne together than alone", "leaves a record longer than the body"],
    },
    {
        "slug": "book", "title": "The Book of the Book", "roman": "XII",
        "subtitle": "On self-reference, audit, and the refusal of infallibility",
        "concepts": ["Self-Reference", "Audit", "Revision", "Humility", "The Finale", "Obsolescence"],
        "subjects": ["This book", "The thesis", "A revision", "The audit", "The claim to obsolete holy books", "The reader", "The editors", "The corpus", "An error in the text", "The ending"],
        "predicates": ["states its position as a thesis, not a proven fact", "invites the refutation that would improve it",
                       "keeps every version it has ever been", "may be wrong and says so first",
                       "does not command belief, it offers reasons", "is finished only in the sense that it is published",
                       "audits itself in public and names its failures", "cannot make other books obsolete by asserting it",
                       "belongs to its readers more than its authors", "ends without claiming to have ended everything"],
    },
]

SOURCE_POOL = [
    {"author": "Ananya Rao", "work": "Foundations of Empirical Reason", "year": 2019, "type": "peer-reviewed", "license": "CC-BY 4.0"},
    {"author": "T. Okonkwo", "work": "On Contingency and Cause", "year": 2015, "type": "peer-reviewed", "license": "CC-BY 4.0"},
    {"author": "M. Halvorsen", "work": "Thermodynamics of Meaning", "year": 2021, "type": "peer-reviewed", "license": "CC-BY-NC 4.0"},
    {"author": "L. Batra", "work": "The Fallible Mind", "year": 2018, "type": "peer-reviewed", "license": "CC-BY 4.0"},
    {"author": "Historical Archive, Vol. IV", "work": "Records of Early Inquiry", "year": 1911, "type": "historical", "license": "Public Domain"},
    {"author": "Global Cohort Study", "work": "Longitudinal Dataset R-7", "year": 2023, "type": "dataset", "license": "CC-BY 4.0"},
    {"author": "K. Mensah", "work": "Institutions and Trust", "year": 2020, "type": "peer-reviewed", "license": "CC-BY 4.0"},
    {"author": "Primary Text (attributed)", "work": "Fragment on the Void", "year": -300, "type": "primary-text", "license": "Public Domain"},
    {"author": "R. Villanueva", "work": "Limits of Proof", "year": 2016, "type": "peer-reviewed", "license": "CC-BY 4.0"},
    {"author": "S. Feld", "work": "Grief and the Continuity of Persons", "year": 2022, "type": "peer-reviewed", "license": "CC-BY 4.0"},
    {"author": "Open Corpus Initiative", "work": "Aggregated Citations Index", "year": 2024, "type": "dataset", "license": "CC0"},
    {"author": "D. Ito", "work": "Language Without Owners", "year": 2017, "type": "peer-reviewed", "license": "CC-BY 4.0"},
]

COUNTERARGS = [
    "Critics argue the evidence underdetermines this conclusion and that weaker claims fit the data equally well.",
    "A common objection holds that the terms are defined too loosely to be tested.",
    "Some traditions reject the framing itself, arguing it smuggles in modern assumptions.",
    "Sceptics note that the supporting studies have not been independently replicated at scale.",
    "Opponents contend the proposition confuses correlation with the causal story it tells.",
    "It has been argued that the rubric used to judge this claim is not neutral between worldviews.",
    "Detractors say the claim proves too much and would rule out phenomena we accept.",
    "A minority of reviewers flag possible selection bias in the cited dataset.",
]

CHAPTER_FRAGMENTS = [
    "On the Threshold", "The First Distinction", "What Cannot Be Unseen", "Against Certainty",
    "The Measure and the Measured", "A Grammar of Things", "The Uncounted", "Boundaries and Breaks",
    "The Quiet Argument", "What the Evidence Allows", "The Shape of Doubt", "Concerning Limits",
    "The Longer View", "Of Order and Accident", "The Unfinished Map", "Between the Lines",
    "The Weight of Reasons", "What Remains When We Are Wrong", "The Common Ground", "The Refusal to Conclude",
    "The Return", "The Small Print", "The Honest Ledger", "The Open Question",
]

CONFIDENCE = ["high", "moderate", "contested"]
CONFIDENCE_WEIGHTS = [0.45, 0.38, 0.17]
STATUS = ["established", "disputed", "retracted"]
STATUS_WEIGHTS = [0.82, 0.13, 0.05]

EDITORS = [
    ("Mira Kaul", "editor"), ("Devraj Nair", "editor"),
    ("The Standing Panel", "admin"), ("A. Fernandes", "editor"),
]


def _reading_minutes(text: str) -> int:
    return max(1, round(len(text.split()) / WPM))


def build_corpus(seed: int = 42):
    rnd = random.Random(seed)
    books, chapters, propositions = [], [], []

    # 1000 propositions across 144 chapters: 8 chapters of 6, 136 of 7 -> 1000
    per_chapter = []
    for gci in range(144):
        per_chapter.append(6 if gci < 8 else 7)

    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
    prop_number = 0
    global_chapter = 0
    frag_counters = {}

    for bi, bk in enumerate(BOOKS):
        book_id = str(uuid.uuid4())
        book_chapter_ids = []
        book_reading = 0
        for local_ci in range(12):
            global_chapter += 1
            chapter_id = str(uuid.uuid4())
            frag = CHAPTER_FRAGMENTS[(global_chapter - 1) % len(CHAPTER_FRAGMENTS)]
            frag_counters[frag] = frag_counters.get(frag, 0) + 1
            suffix = "" if frag_counters[frag] == 1 else f" ({['I','II','III','IV','V','VI','VII'][frag_counters[frag]-1]})"

            if global_chapter == 143:
                ch_title = "The Book Audits Itself"
                ch_kind = "self-audit"
            elif global_chapter == 144:
                ch_title = "The Book Ends and Does Not End"
                ch_kind = "finale"
            else:
                ch_title = f"{frag}{suffix}"
                ch_kind = "standard"

            count = per_chapter[global_chapter - 1]
            chapter_reading = 0
            chapter_prop_numbers = []
            for _ in range(count):
                prop_number += 1
                subj = rnd.choice(bk["subjects"])
                pred = rnd.choice(bk["predicates"])
                claim = f"{subj} {pred}."
                concept = rnd.choice(bk["concepts"])
                elaboration = (
                    f"This proposition belongs to the movement titled \u201c{ch_title}\u201d in {bk['title']}. "
                    f"It concerns {concept.lower()} and is offered as a reasoned claim open to challenge, not as a "
                    f"revealed certainty. Where the evidence is thin the confidence label says so, and the "
                    f"counterarguments below are part of the record, not an afterthought."
                )
                full_text = claim + " " + elaboration
                confidence = rnd.choices(CONFIDENCE, CONFIDENCE_WEIGHTS)[0]
                status = rnd.choices(STATUS, STATUS_WEIGHTS)[0]
                if confidence == "high" and status != "established":
                    confidence = "moderate"

                nsrc = rnd.randint(1, 4)
                sources = rnd.sample(SOURCE_POOL, nsrc)
                ncounter = 0 if confidence == "high" and rnd.random() < 0.5 else rnd.randint(1, 3)
                counter = rnd.sample(COUNTERARGS, min(ncounter, len(COUNTERARGS)))

                revisions = []
                nrev = rnd.choices([0, 1, 2, 3], [0.55, 0.25, 0.13, 0.07])[0]
                if status == "retracted" and nrev == 0:
                    nrev = 1
                for rv in range(nrev):
                    editor, role = rnd.choice(EDITORS)
                    ts = base_time + timedelta(days=rnd.randint(1, 500), hours=rnd.randint(0, 23))
                    revisions.append({
                        "version": rv + 1,
                        "editor": editor,
                        "editor_role": role,
                        "timestamp": ts.isoformat(),
                        "note": rnd.choice([
                            "Clarified wording after reader challenge; meaning unchanged.",
                            "Added a peer-reviewed source and softened the confidence label.",
                            "Corrected an overstatement flagged in review.",
                            "Linked a contradicting proposition and noted the tension.",
                            "Marked disputed pending replication of the cited dataset.",
                        ]),
                        "previous_status": rnd.choice(["established", "disputed"]),
                    })
                revisions.sort(key=lambda r: r["timestamp"])

                rt = _reading_minutes(full_text)
                chapter_reading += rt
                prop = {
                    "id": str(uuid.uuid4()),
                    "number": prop_number,
                    "title": claim.rstrip("."),
                    "text": full_text,
                    "claim": claim,
                    "concept": concept,
                    "book_id": book_id,
                    "book_slug": bk["slug"],
                    "book_title": bk["title"],
                    "chapter_id": chapter_id,
                    "chapter_number": global_chapter,
                    "chapter_title": ch_title,
                    "tags": [concept, bk["slug"]],
                    "confidence": confidence,
                    "status": status,
                    "sources": sources,
                    "counterarguments": counter,
                    "contradicts": [],
                    "revisions": revisions,
                    "reading_minutes": rt,
                }
                propositions.append(prop)
                chapter_prop_numbers.append(prop_number)

            book_reading += chapter_reading
            chapters.append({
                "id": chapter_id,
                "number": global_chapter,
                "local_number": local_ci + 1,
                "title": ch_title,
                "kind": ch_kind,
                "book_id": book_id,
                "book_slug": bk["slug"],
                "book_title": bk["title"],
                "proposition_count": count,
                "proposition_numbers": chapter_prop_numbers,
                "reading_minutes": chapter_reading,
            })
            book_chapter_ids.append(chapter_id)

        books.append({
            "id": book_id,
            "number": bi + 1,
            "roman": bk["roman"],
            "slug": bk["slug"],
            "title": bk["title"],
            "subtitle": bk["subtitle"],
            "concepts": bk["concepts"],
            "chapter_count": 12,
            "reading_minutes": book_reading,
        })

    # Wire contradictions: link some propositions to another (often cross-book)
    n = len(propositions)
    contradiction_pairs = 0
    for p in propositions:
        if rnd.random() < 0.14:
            other = propositions[rnd.randrange(n)]
            if other["number"] != p["number"] and other["number"] not in p["contradicts"]:
                p["contradicts"].append(other["number"])
                other.setdefault("contradicts", [])
                if p["number"] not in other["contradicts"]:
                    other["contradicts"].append(p["number"])
                contradiction_pairs += 1

    return books, chapters, propositions


def build_graph(books, propositions):
    """Concept-level knowledge graph: book nodes + concept nodes + edges."""
    nodes, edges = [], []
    seen_concepts = {}
    for b in books:
        nodes.append({"id": f"book:{b['slug']}", "label": b["title"], "type": "book", "group": b["number"]})
        for c in b["concepts"]:
            cid = f"concept:{c}"
            if cid not in seen_concepts:
                seen_concepts[cid] = {"id": cid, "label": c, "type": "concept", "group": b["number"], "weight": 0}
                nodes.append(seen_concepts[cid])
            edges.append({"source": f"book:{b['slug']}", "target": cid, "kind": "contains"})
    # weight concepts by proposition count
    for p in propositions:
        cid = f"concept:{p['concept']}"
        if cid in seen_concepts:
            seen_concepts[cid]["weight"] += 1
    # contradiction edges between concepts
    added = set()
    for p in propositions:
        for other_num in p.get("contradicts", []):
            pass
    # link concepts that co-occur in contradictions
    num_to_concept = {p["number"]: p["concept"] for p in propositions}
    for p in propositions:
        for other_num in p.get("contradicts", []):
            c1, c2 = p["concept"], num_to_concept.get(other_num)
            if c2 and c1 != c2:
                key = tuple(sorted([c1, c2]))
                if key not in added:
                    added.add(key)
                    edges.append({"source": f"concept:{key[0]}", "target": f"concept:{key[1]}", "kind": "tension"})
    return {"nodes": nodes, "edges": edges}

from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

from auth import (
    hash_password, verify_password, create_access_token,
    public_user, make_auth_deps,
)
from corpus import build_corpus, build_graph

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="The Holy Book — The Book of Infinity API")
api = APIRouter(prefix="/api")

get_current_user, get_optional_user, require_role = make_auth_deps(db)


# ------------------------- Models -------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AskIn(BaseModel):
    question: str = Field(min_length=3)


class NoteIn(BaseModel):
    proposition_number: int
    text: str


class BookmarkIn(BaseModel):
    proposition_number: int


class ProgressIn(BaseModel):
    book_slug: str
    chapter_number: int
    proposition_number: Optional[int] = None


class ChallengeIn(BaseModel):
    proposition_number: int
    kind: str = Field(default="counter-evidence")
    argument: str = Field(min_length=20)
    sources: Optional[str] = ""


class DecisionIn(BaseModel):
    decision: str  # approved | rejected
    editor_note: Optional[str] = ""


class ReviseIn(BaseModel):
    text: str
    note: str
    confidence: Optional[str] = None
    status: Optional[str] = None


class RetractIn(BaseModel):
    note: str


# ------------------------- Seeding -------------------------
async def seed_corpus():
    count = await db.propositions.count_documents({})
    if count > 0:
        return
    logger.info("Seeding corpus...")
    books, chapters, propositions = build_corpus()
    graph = build_graph(books, propositions)
    await db.books.insert_many([dict(b) for b in books])
    await db.chapters.insert_many([dict(c) for c in chapters])
    await db.propositions.insert_many([dict(p) for p in propositions])
    await db.graph.insert_one({"_id": "concept-graph", **graph})
    logger.info(f"Seeded {len(books)} books, {len(chapters)} chapters, {len(propositions)} propositions.")


async def seed_users():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Editorial Admin", "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    reader_email = "reader@example.com"
    if not await db.users.find_one({"email": reader_email}):
        await db.users.insert_one({
            "email": reader_email, "password_hash": hash_password("reader123"),
            "name": "Sample Reader", "role": "reader",
            "created_at": datetime.now(timezone.utc),
        })


async def seed_challenges():
    if await db.challenges.count_documents({}) > 0:
        return
    prop = await db.propositions.find_one({}, {"_id": 0})
    if not prop:
        return
    await db.challenges.insert_one({
        "id": str(uuid.uuid4()),
        "proposition_number": prop["number"],
        "proposition_title": prop["title"],
        "user_id": "seed",
        "user_name": "A. Reader",
        "kind": "counter-evidence",
        "argument": "The cited dataset (R-7) was not independently replicated; the confidence label should be lowered until it is.",
        "sources": "Open Corpus Initiative, Aggregated Citations Index (2024)",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "editor_note": "",
    })


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.propositions.create_index("number", unique=True)
    await db.chapters.create_index("number")
    await db.books.create_index("slug", unique=True)
    try:
        await db.propositions.create_index(
            [("title", "text"), ("text", "text"), ("concept", "text"), ("tags", "text")],
            name="prop_text",
        )
    except Exception as e:
        logger.warning(f"text index: {e}")
    await seed_corpus()
    await seed_users()
    await seed_challenges()
    write_test_credentials()


def write_test_credentials():
    try:
        Path("/app/memory").mkdir(parents=True, exist_ok=True)
        content = f"""# Test Credentials

## Admin / Editorial (role: admin)
- Email: {os.environ['ADMIN_EMAIL']}
- Password: {os.environ['ADMIN_PASSWORD']}

## Sample Reader (role: reader)
- Email: reader@example.com
- Password: reader123

## Auth endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
"""
        Path("/app/memory/test_credentials.md").write_text(content)
    except Exception as e:
        logger.warning(f"could not write test credentials: {e}")


# ------------------------- Auth routes -------------------------
def _set_cookie(resp: Response, token: str):
    resp.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email, "password_hash": hash_password(body.password),
        "name": body.name, "role": "reader", "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email, "reader")
    _set_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email, user.get("role", "reader"))
    _set_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ------------------------- Corpus stats -------------------------
@api.get("/stats")
async def stats():
    books = await db.books.count_documents({})
    chapters = await db.chapters.count_documents({})
    props = await db.propositions.find({}, {"_id": 0, "sources": 1, "revisions": 1, "status": 1,
                                             "contradicts": 1, "reading_minutes": 1, "confidence": 1}).to_list(5000)
    citations = sum(len(p.get("sources", [])) for p in props)
    revisions = sum(len(p.get("revisions", [])) for p in props)
    disputed = sum(1 for p in props if p.get("status") == "disputed")
    retracted = sum(1 for p in props if p.get("status") == "retracted")
    contradiction_props = sum(1 for p in props if p.get("contradicts"))
    reading = sum(p.get("reading_minutes", 0) for p in props)
    conf = {"high": 0, "moderate": 0, "contested": 0}
    for p in props:
        conf[p.get("confidence", "moderate")] = conf.get(p.get("confidence", "moderate"), 0) + 1
    return {
        "books": books, "chapters": chapters, "propositions": len(props),
        "citations": citations, "revisions": revisions,
        "contradictions": contradiction_props,
        "disputed": disputed, "retracted": retracted,
        "reading_minutes": reading,
        "reading_hours": round(reading / 60, 1),
        "confidence_distribution": conf,
    }


@api.get("/validation")
async def validation():
    books = await db.books.count_documents({})
    chapters = await db.chapters.count_documents({})
    props = await db.propositions.count_documents({})
    claimed = {
        "books": int(os.environ.get("CLAIMED_BOOKS", 12)),
        "chapters": int(os.environ.get("CLAIMED_CHAPTERS", 144)),
        "propositions": int(os.environ.get("CLAIMED_PROPOSITIONS", 1000)),
    }
    actual = {"books": books, "chapters": chapters, "propositions": props}
    checks = []
    for k in ["books", "chapters", "propositions"]:
        checks.append({
            "entity": k, "claimed": claimed[k], "actual": actual[k],
            "match": claimed[k] == actual[k],
            "delta": actual[k] - claimed[k],
        })
    return {
        "source_archive": "sample-corpus (generated)",
        "note": "No source archive was provided at build time. This is a transparent, generated sample corpus. "
                "When the real 'Holy Book.zip' is imported the same reconciliation runs against its actual contents.",
        "checks": checks,
        "all_match": all(c["match"] for c in checks),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ------------------------- Books / chapters -------------------------
@api.get("/books")
async def list_books():
    return await db.books.find({}, {"_id": 0}).sort("number", 1).to_list(50)


@api.get("/books/{slug}")
async def get_book(slug: str):
    book = await db.books.find_one({"slug": slug}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.chapters.find({"book_slug": slug}, {"_id": 0}).sort("number", 1).to_list(50)
    return {"book": book, "chapters": chapters}


@api.get("/chapters/{number}")
async def get_chapter(number: int):
    ch = await db.chapters.find_one({"number": number}, {"_id": 0})
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    props = await db.propositions.find(
        {"chapter_number": number}, {"_id": 0}).sort("number", 1).to_list(50)
    prev_ch = await db.chapters.find_one({"number": number - 1}, {"_id": 0, "number": 1, "title": 1})
    next_ch = await db.chapters.find_one({"number": number + 1}, {"_id": 0, "number": 1, "title": 1})
    return {"chapter": ch, "propositions": props, "prev": prev_ch, "next": next_ch}


# ------------------------- Propositions -------------------------
@api.get("/propositions/random")
async def random_proposition():
    docs = await db.propositions.aggregate([{"$sample": {"size": 1}}, {"$project": {"_id": 0}}]).to_list(1)
    if not docs:
        raise HTTPException(status_code=404, detail="No propositions")
    return docs[0]


@api.get("/propositions")
async def list_propositions(
    q: Optional[str] = None,
    confidence: Optional[str] = None,
    status: Optional[str] = None,
    tag: Optional[str] = None,
    book: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    filt = {}
    if confidence:
        filt["confidence"] = confidence
    if status:
        filt["status"] = status
    if tag:
        filt["tags"] = tag
    if book:
        filt["book_slug"] = book
    skip = (page - 1) * limit
    projection = {"_id": 0, "text": 0}
    if q:
        filt["$text"] = {"$search": q}
        cursor = db.propositions.find(filt, {**projection, "score": {"$meta": "textScore"}})
        cursor = cursor.sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit)
    else:
        cursor = db.propositions.find(filt, projection).sort("number", 1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    total = await db.propositions.count_documents(filt)
    return {"items": items, "total": total, "page": page, "limit": limit,
            "pages": (total + limit - 1) // limit}


@api.get("/propositions/{number}")
async def get_proposition(number: int):
    p = await db.propositions.find_one({"number": number}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Proposition not found")
    contradicting = []
    if p.get("contradicts"):
        contradicting = await db.propositions.find(
            {"number": {"$in": p["contradicts"]}},
            {"_id": 0, "number": 1, "title": 1, "confidence": 1, "status": 1, "book_title": 1},
        ).to_list(20)
    related = await db.propositions.find(
        {"concept": p["concept"], "number": {"$ne": number}},
        {"_id": 0, "number": 1, "title": 1, "confidence": 1, "status": 1, "book_title": 1},
    ).limit(6).to_list(6)
    return {"proposition": p, "contradicting": contradicting, "related": related}


# ------------------------- Graph -------------------------
@api.get("/graph")
async def graph():
    g = await db.graph.find_one({"_id": "concept-graph"}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Graph not built")
    return g


# ------------------------- The Book Changes / Audit -------------------------
@api.get("/changes")
async def changes(limit: int = 40):
    props = await db.propositions.find(
        {"revisions.0": {"$exists": True}},
        {"_id": 0, "number": 1, "title": 1, "book_title": 1, "status": 1, "revisions": 1},
    ).to_list(5000)
    events = []
    for p in props:
        for r in p.get("revisions", []):
            events.append({
                "proposition_number": p["number"],
                "proposition_title": p["title"],
                "book_title": p["book_title"],
                "current_status": p["status"],
                **r,
            })
    events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return {"events": events[:limit], "total": len(events)}


@api.get("/audit")
async def audit():
    props = await db.propositions.find(
        {}, {"_id": 0, "number": 1, "title": 1, "status": 1, "confidence": 1,
             "book_title": 1, "contradicts": 1, "revisions": 1}).to_list(5000)
    retracted = [p for p in props if p["status"] == "retracted"]
    disputed = [p for p in props if p["status"] == "disputed"]
    contradictions = [p for p in props if p.get("contradicts")]
    return {
        "total": len(props),
        "status_counts": {
            "established": sum(1 for p in props if p["status"] == "established"),
            "disputed": len(disputed),
            "retracted": len(retracted),
        },
        "retracted": sorted(retracted, key=lambda p: p["number"])[:100],
        "disputed": sorted(disputed, key=lambda p: p["number"])[:100],
        "contradiction_count": len(contradictions),
        "most_revised": sorted(props, key=lambda p: len(p.get("revisions", [])), reverse=True)[:10],
        "policy_note": "The claim that this book 'makes holy books obsolete' is recorded as the book's thesis, "
                       "not a verified fact. Religious comparisons use one disclosed evidence rubric and critique "
                       "claims, never believers.",
    }


# ------------------------- Ask the Book (grounded) -------------------------
@api.post("/ask")
async def ask(body: AskIn):
    hits = await db.propositions.find(
        {"$text": {"$search": body.question}},
        {"_id": 0, "number": 1, "title": 1, "text": 1, "confidence": 1, "status": 1,
         "book_title": 1, "sources": 1, "score": {"$meta": "textScore"}},
    ).sort([("score", {"$meta": "textScore"})]).limit(6).to_list(6)

    if not hits:
        return {
            "grounded": False,
            "answer": "I can only answer from the published propositions of this book, and I found nothing "
                      "in the corpus that addresses your question. I will not speculate beyond the text.",
            "citations": [], "grounding": [],
        }

    context_lines = []
    for h in hits:
        srcs = "; ".join(f"{s['author']}, {s['work']} ({s['year']})" for s in h.get("sources", []))
        context_lines.append(
            f"[P{h['number']}] ({h['confidence']} confidence, {h['status']}) {h['text']} Sources: {srcs or 'none'}"
        )
    context = "\n\n".join(context_lines)

    system = (
        "You are 'Ask the Book', a retrieval-grounded assistant for a digital codex called The Holy Book — The Book of Infinity. "
        "You may ONLY use the provided propositions as evidence. Rules: "
        "1) Cite every claim inline using the tag [P<number>]. "
        "2) If the propositions do not support an answer, say so plainly and refuse to speculate. "
        "3) Report uncertainty honestly and note when a proposition is 'disputed' or 'retracted'. "
        "4) Never assert the book's thesis (that it makes holy books obsolete) as established fact; present it as the book's position. "
        "5) Be concise (max ~180 words). This is an AI answer grounded in published content; human editors approve canonical text."
    )
    prompt = f"PROPOSITIONS:\n{context}\n\nQUESTION: {body.question}\n\nAnswer using only the propositions above, with [P#] citations."

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"ask-{uuid.uuid4()}",
            system_message=system,
        ).with_model("openai", "gpt-5.4")
        answer = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"Ask failed: {e}")
        raise HTTPException(status_code=502, detail="Ask the Book is temporarily unavailable.")

    cited = [h["number"] for h in hits if f"P{h['number']}" in str(answer)]
    return {
        "grounded": True,
        "answer": str(answer),
        "citations": cited or [h["number"] for h in hits[:3]],
        "grounding": [{"number": h["number"], "title": h["title"], "confidence": h["confidence"],
                       "status": h["status"], "book_title": h["book_title"], "sources": h.get("sources", [])}
                      for h in hits],
        "disclosure": "AI-generated answer, grounded in published propositions. AI cannot publish canonical material.",
    }


# ------------------------- Personal library -------------------------
@api.get("/library/bookmarks")
async def get_bookmarks(user: dict = Depends(get_current_user)):
    docs = await db.bookmarks.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(500)
    nums = [d["proposition_number"] for d in docs]
    props = await db.propositions.find(
        {"number": {"$in": nums}},
        {"_id": 0, "number": 1, "title": 1, "confidence": 1, "status": 1, "book_title": 1}).to_list(500)
    return {"bookmarks": props}


@api.post("/library/bookmarks")
async def add_bookmark(body: BookmarkIn, user: dict = Depends(get_current_user)):
    await db.bookmarks.update_one(
        {"user_id": str(user["_id"]), "proposition_number": body.proposition_number},
        {"$set": {"user_id": str(user["_id"]), "proposition_number": body.proposition_number,
                  "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/library/bookmarks/{number}")
async def remove_bookmark(number: int, user: dict = Depends(get_current_user)):
    await db.bookmarks.delete_one({"user_id": str(user["_id"]), "proposition_number": number})
    return {"ok": True}


@api.get("/library/notes")
async def get_notes(user: dict = Depends(get_current_user)):
    return {"notes": await db.notes.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).to_list(500)}


@api.post("/library/notes")
async def add_note(body: NoteIn, user: dict = Depends(get_current_user)):
    note = {
        "id": str(uuid.uuid4()), "user_id": str(user["_id"]),
        "proposition_number": body.proposition_number, "text": body.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notes.insert_one(dict(note))
    return {"note": note}


@api.get("/progress")
async def get_progress(user: dict = Depends(get_current_user)):
    doc = await db.progress.find_one({"user_id": str(user["_id"])}, {"_id": 0})
    return {"progress": doc or {}}


@api.post("/progress")
async def set_progress(body: ProgressIn, user: dict = Depends(get_current_user)):
    await db.progress.update_one(
        {"user_id": str(user["_id"])},
        {"$set": {"user_id": str(user["_id"]), "book_slug": body.book_slug,
                  "chapter_number": body.chapter_number, "proposition_number": body.proposition_number,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


# ------------------------- Challenges -------------------------
@api.post("/challenges")
async def submit_challenge(body: ChallengeIn, user: dict = Depends(get_current_user)):
    prop = await db.propositions.find_one({"number": body.proposition_number}, {"_id": 0, "title": 1})
    if not prop:
        raise HTTPException(status_code=404, detail="Proposition not found")
    ch = {
        "id": str(uuid.uuid4()),
        "proposition_number": body.proposition_number,
        "proposition_title": prop["title"],
        "user_id": str(user["_id"]), "user_name": user.get("name", "Reader"),
        "kind": body.kind, "argument": body.argument, "sources": body.sources or "",
        "status": "pending", "editor_note": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.challenges.insert_one(dict(ch))
    return {"challenge": ch}


@api.get("/me/challenges")
async def my_challenges(user: dict = Depends(get_current_user)):
    return {"challenges": await db.challenges.find(
        {"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).to_list(200)}


# ------------------------- Editorial -------------------------
@api.get("/editorial/summary")
async def editorial_summary(user: dict = Depends(require_role("editor", "admin"))):
    pending = await db.challenges.count_documents({"status": "pending"})
    approved = await db.challenges.count_documents({"status": "approved"})
    rejected = await db.challenges.count_documents({"status": "rejected"})
    props = await db.propositions.count_documents({})
    return {"challenges": {"pending": pending, "approved": approved, "rejected": rejected},
            "propositions": props, "editor": public_user(user)}


@api.get("/editorial/challenges")
async def editorial_challenges(status: Optional[str] = None, user: dict = Depends(require_role("editor", "admin"))):
    filt = {"status": status} if status else {}
    return {"challenges": await db.challenges.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)}


@api.post("/editorial/challenges/{cid}/decision")
async def decide_challenge(cid: str, body: DecisionIn, user: dict = Depends(require_role("editor", "admin"))):
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")
    res = await db.challenges.update_one(
        {"id": cid}, {"$set": {"status": body.decision, "editor_note": body.editor_note or "",
                               "decided_by": user.get("name"), "decided_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return {"ok": True}


@api.post("/editorial/propositions/{number}/revise")
async def revise_proposition(number: int, body: ReviseIn, user: dict = Depends(require_role("editor", "admin"))):
    p = await db.propositions.find_one({"number": number})
    if not p:
        raise HTTPException(status_code=404, detail="Proposition not found")
    revision = {
        "version": len(p.get("revisions", [])) + 1,
        "editor": user.get("name"), "editor_role": user.get("role"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": body.note,
        "previous_status": p["status"],
        "previous_text": p["text"],
    }
    updates = {"text": body.text, "claim": body.text.split(".")[0] + "." if body.text else p["claim"]}
    if body.confidence:
        updates["confidence"] = body.confidence
    if body.status:
        updates["status"] = body.status
    await db.propositions.update_one(
        {"number": number},
        {"$set": updates, "$push": {"revisions": revision}})
    return {"ok": True, "revision": revision}


@api.post("/editorial/propositions/{number}/retract")
async def retract_proposition(number: int, body: RetractIn, user: dict = Depends(require_role("editor", "admin"))):
    p = await db.propositions.find_one({"number": number})
    if not p:
        raise HTTPException(status_code=404, detail="Proposition not found")
    revision = {
        "version": len(p.get("revisions", [])) + 1,
        "editor": user.get("name"), "editor_role": user.get("role"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": f"RETRACTION: {body.note}",
        "previous_status": p["status"],
    }
    await db.propositions.update_one(
        {"number": number},
        {"$set": {"status": "retracted"}, "$push": {"revisions": revision}})
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()

"""Backend API tests for The Holy Book (Mahakali Codex) — iteration 2.

Covers new features:
 - Real archive import: /stats (1299 props, unrated), /validation (all_match=false, delta=+299)
 - /atlas (contradiction atlas themes)
 - /tts (OpenAI TTS via Emergent Universal Key)
 - /ask/stream (SSE) grounded + ungrounded
 - /editorial/import (admin only)
Plus regression on the prior 30 tests.
"""
import os
import uuid
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "editor@mahakali.org"
ADMIN_PASSWORD = "Codex2026!"
READER_EMAIL = "reader@example.com"
READER_PASSWORD = "reader123"


@pytest.fixture
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def reader_token():
    r = requests.post(f"{API}/auth/login", json={"email": READER_EMAIL, "password": READER_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Stats & validation (real archive) ----
class TestStatsValidation:
    def test_stats_real_archive(self, s):
        r = s.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["books"] == 12
        assert d["chapters"] == 144
        assert d["propositions"] == 1299
        assert d.get("citations", 0) == 0
        # disputed/retracted may be >0 due to prior test-suite retractions; just assert key present
        assert "disputed" in d and "retracted" in d
        cd = d.get("confidence_distribution", {})
        # Real archive: everything unrated
        assert cd.get("unrated", 0) == 1299

    def test_validation_transparent_mismatch(self, s):
        r = s.get(f"{API}/validation")
        assert r.status_code == 200
        d = r.json()
        assert d.get("source_archive", "").lower().startswith("holy book")
        assert d["all_match"] is False
        # Find checks
        checks = {c["entity"]: c for c in d["checks"]}
        assert checks["books"]["actual"] == 12 and checks["books"]["match"] is True
        assert checks["chapters"]["actual"] == 144 and checks["chapters"]["match"] is True
        prop = checks["propositions"]
        assert prop["actual"] == 1299
        assert prop["match"] is False
        assert prop.get("delta") == 299


# ---- Books/Chapters ----
class TestBooks:
    def test_list_books_12(self, s):
        r = s.get(f"{API}/books")
        assert r.status_code == 200
        books = r.json()
        assert len(books) == 12
        titles = " ".join(b.get("title", "") for b in books).lower()
        for expected in ["reality", "knowledge", "mind", "ethics", "love", "society", "power", "nature", "technology"]:
            assert expected in titles, f"missing expected book: {expected}"

    def test_chapter_97_power(self, s):
        r = s.get(f"{API}/chapters/97")
        assert r.status_code == 200
        d = r.json()
        assert d["chapter"]["number"] == 97
        assert "power" in d["chapter"]["title"].lower()
        assert len(d["propositions"]) > 0

    def test_chapter_144_let_us_find_out(self, s):
        r = s.get(f"{API}/chapters/144")
        assert r.status_code == 200
        title = r.json()["chapter"]["title"].lower()
        assert "find out" in title or "let us" in title

    def test_chapter_143_destroy(self, s):
        r = s.get(f"{API}/chapters/143")
        assert r.status_code == 200
        title = r.json()["chapter"]["title"].lower()
        assert "destroy" in title or "burn" in title or "book" in title


# ---- Propositions ----
class TestPropositions:
    def test_total_1299(self, s):
        r = s.get(f"{API}/propositions", params={"page": 1, "limit": 5})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 1299
        assert len(d["items"]) == 5

    def test_search_power(self, s):
        r = s.get(f"{API}/propositions", params={"q": "power"})
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)

    def test_get_prop_unrated_established(self, s):
        r = s.get(f"{API}/propositions/1")
        assert r.status_code == 200
        p = r.json()["proposition"]
        assert p["number"] == 1
        assert p["confidence"] == "unrated"
        assert p["status"] == "established"

    def test_random(self, s):
        r = s.get(f"{API}/propositions/random")
        assert r.status_code == 200
        assert 1 <= r.json()["number"] <= 1299


# ---- Contradiction Atlas ----
class TestAtlas:
    def test_atlas(self, s):
        r = s.get(f"{API}/atlas")
        assert r.status_code == 200
        d = r.json()
        assert d.get("count", 0) > 0
        themes = d.get("themes", [])
        assert len(themes) > 0
        # at least one theme has links with a/b sides referencing prop numbers
        found = False
        for t in themes:
            for link in t.get("links", []):
                a = link.get("a") or {}
                b = link.get("b") or {}
                if "proposition_number" in a and "proposition_number" in b:
                    found = True
                    break
        assert found, "expected at least one theme link with a/b proposition refs"


# ---- Ask stream (SSE) ----
class TestAskStream:
    def _parse_sse(self, resp):
        events = []
        for raw in resp.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("data:"):
                data = raw[5:].strip()
                try:
                    payload = json.loads(data)
                    events.append((payload.get("type", "message"), payload))
                except Exception:
                    events.append(("message", data))
        return events

    def test_ask_stream_grounded(self, s):
        r = s.post(f"{API}/ask/stream",
                   json={"question": "What does the book say about power and consent?"},
                   stream=True, timeout=120)
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "text/event-stream" in ctype, ctype
        events = self._parse_sse(r)
        names = [e[0] for e in events]
        assert "meta" in names
        assert "delta" in names
        assert "done" in names
        meta = next(p for n, p in events if n == "meta")
        assert meta.get("grounded") is True
        assert isinstance(meta.get("grounding", []), list) and len(meta["grounding"]) > 0
        # concatenated answer
        answer = "".join(p.get("content", "") if isinstance(p, dict) else "" for n, p in events if n == "delta")
        assert "[P" in answer, f"expected [P#] citations in answer: {answer[:200]}"

    def test_ask_stream_ungrounded(self, s):
        r = s.post(f"{API}/ask/stream",
                   json={"question": "zzzqqq flibbertigibbet xylophone quokka"},
                   stream=True, timeout=60)
        assert r.status_code == 200
        events = self._parse_sse(r)
        meta = next((p for n, p in events if n == "meta"), None)
        assert meta is not None
        assert meta.get("grounded") is False


# ---- TTS ----
class TestTTS:
    def test_tts_audio_mpeg(self, s):
        r = s.post(f"{API}/tts",
                   json={"text": "Power without consent is coercion.", "voice": "onyx"},
                   timeout=120)
        assert r.status_code == 200, r.text[:300]
        ctype = r.headers.get("content-type", "")
        assert "audio/mpeg" in ctype, ctype
        assert len(r.content) > 1000, f"tts body too small: {len(r.content)}"


# ---- Editorial import (admin only) ----
class TestEditorialImport:
    URL = "https://customer-assets-rejwkqb3.emergentagent.net/job_mahakali-corpus/artifacts/bf5i73f7_Holy%20Book.zip"

    def test_reader_forbidden(self, s, reader_token):
        r = s.post(f"{API}/editorial/import", json={"url": self.URL}, headers=auth(reader_token))
        assert r.status_code == 403

    def test_admin_import(self, s, admin_token):
        r = s.post(f"{API}/editorial/import", json={"url": self.URL},
                   headers=auth(admin_token), timeout=180)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert d.get("ok") is True
        assert d.get("books") == 12
        assert d.get("chapters") == 144
        assert d.get("propositions") == 1299


# ---- Auth regression ----
class TestAuth:
    def test_register(self, s):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "abcdef", "name": "Test"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "reader"

    def test_login_bad(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_admin(self, s, admin_token):
        r = s.get(f"{API}/auth/me", headers=auth(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"


# ---- Library regression ----
class TestLibrary:
    def test_bookmark_flow(self, s, reader_token):
        h = auth(reader_token)
        assert s.post(f"{API}/library/bookmarks", json={"proposition_number": 5}, headers=h).status_code == 200
        r = s.get(f"{API}/library/bookmarks", headers=h)
        assert r.status_code == 200
        assert 5 in [b["number"] for b in r.json()["bookmarks"]]
        assert s.delete(f"{API}/library/bookmarks/5", headers=h).status_code == 200

    def test_notes(self, s, reader_token):
        h = auth(reader_token)
        assert s.post(f"{API}/library/notes", json={"proposition_number": 7, "text": "n"}, headers=h).status_code == 200

    def test_progress(self, s, reader_token):
        h = auth(reader_token)
        assert s.post(f"{API}/progress", json={"book_slug": "x", "chapter_number": 2, "proposition_number": 10}, headers=h).status_code == 200

    def test_requires_auth(self, s):
        assert s.get(f"{API}/library/bookmarks").status_code == 401


# ---- Challenges + Editorial regression ----
class TestChallengesEditorial:
    def test_submit_and_decision(self, s, reader_token, admin_token):
        r = s.post(f"{API}/challenges", json={
            "proposition_number": 3, "kind": "counter-evidence",
            "argument": "Sufficiently long argument for editorial review flow test."
        }, headers=auth(reader_token))
        assert r.status_code == 200
        cid = r.json()["challenge"]["id"]
        r = s.post(f"{API}/editorial/challenges/{cid}/decision",
                   json={"decision": "rejected", "editor_note": "insufficient"},
                   headers=auth(admin_token))
        assert r.status_code == 200

    def test_summary(self, s, admin_token):
        r = s.get(f"{API}/editorial/summary", headers=auth(admin_token))
        assert r.status_code == 200

    def test_reader_forbidden_editorial(self, s, reader_token):
        assert s.get(f"{API}/editorial/summary", headers=auth(reader_token)).status_code == 403

    def test_revise_and_retract(self, s, admin_token):
        h = auth(admin_token)
        r = s.post(f"{API}/editorial/propositions/500/revise",
                   json={"text": "Revised text for test.", "note": "test"}, headers=h)
        assert r.status_code == 200
        r = s.post(f"{API}/editorial/propositions/501/retract",
                   json={"note": "test retract"}, headers=h)
        assert r.status_code == 200

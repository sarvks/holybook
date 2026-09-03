"""Backend API tests for The Book of Everything."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mahakali-corpus.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "editor@mahakali.org"
ADMIN_PASSWORD = "Codex2026!"
READER_EMAIL = "reader@example.com"
READER_PASSWORD = "reader123"


@pytest.fixture
def s():
    # Fresh session per-test to avoid cookie leakage (backend prefers cookie over Bearer)
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


# ---- Stats & validation ----
class TestStats:
    def test_stats(self, s):
        r = s.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["books"] == 12
        assert d["chapters"] == 144
        assert d["propositions"] == 1000
        for k in ["citations", "revisions", "contradictions", "disputed", "retracted", "reading_minutes"]:
            assert k in d

    def test_validation(self, s):
        r = s.get(f"{API}/validation")
        assert r.status_code == 200
        d = r.json()
        assert d["all_match"] is True
        assert len(d["checks"]) == 3


# ---- Books/Chapters ----
class TestBooks:
    def test_list_books(self, s):
        r = s.get(f"{API}/books")
        assert r.status_code == 200
        assert len(r.json()) == 12

    def test_get_book(self, s):
        r = s.get(f"{API}/books/mahakali-corpus")
        # if not found try first book slug
        if r.status_code == 404:
            first = s.get(f"{API}/books").json()[0]
            r = s.get(f"{API}/books/{first['slug']}")
        assert r.status_code == 200
        d = r.json()
        assert "book" in d and "chapters" in d
        assert len(d["chapters"]) == 12

    def test_get_chapter(self, s):
        r = s.get(f"{API}/chapters/1")
        assert r.status_code == 200
        d = r.json()
        assert d["chapter"]["number"] == 1
        assert len(d["propositions"]) > 0
        assert d["next"] is not None


# ---- Propositions ----
class TestPropositions:
    def test_random(self, s):
        r = s.get(f"{API}/propositions/random")
        assert r.status_code == 200
        assert "number" in r.json()

    def test_list(self, s):
        r = s.get(f"{API}/propositions", params={"page": 1, "limit": 10})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 1000
        assert len(d["items"]) == 10

    def test_search(self, s):
        r = s.get(f"{API}/propositions", params={"q": "energy"})
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)

    def test_filter_confidence(self, s):
        r = s.get(f"{API}/propositions", params={"confidence": "high"})
        assert r.status_code == 200
        assert all(it["confidence"] == "high" for it in r.json()["items"])

    def test_get_prop(self, s):
        r = s.get(f"{API}/propositions/1")
        assert r.status_code == 200
        d = r.json()
        assert d["proposition"]["number"] == 1
        assert "related" in d and "contradicting" in d


# ---- Graph / changes / audit ----
class TestExtras:
    def test_graph(self, s):
        r = s.get(f"{API}/graph")
        assert r.status_code == 200
        d = r.json()
        assert "nodes" in d and "edges" in d
        assert len(d["nodes"]) > 0

    def test_changes(self, s):
        r = s.get(f"{API}/changes")
        assert r.status_code == 200
        assert "events" in r.json()

    def test_audit(self, s):
        r = s.get(f"{API}/audit")
        assert r.status_code == 200
        d = r.json()
        assert "status_counts" in d and "retracted" in d and "disputed" in d


# ---- Auth ----
class TestAuth:
    def test_register(self, s):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "abcdef", "name": "Test"})
        assert r.status_code == 200
        assert "token" in r.json()
        assert r.json()["user"]["role"] == "reader"

    def test_login_admin(self, s, admin_token):
        assert admin_token

    def test_login_reader(self, s, reader_token):
        assert reader_token

    def test_me(self, s, admin_token):
        r = s.get(f"{API}/auth/me", headers=auth(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_login_bad(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "wrong"})
        assert r.status_code == 401


# ---- Ask the Book (GPT-5.4 via emergentintegrations) ----
class TestAsk:
    def test_ask_grounded(self, s):
        r = s.post(f"{API}/ask", json={"question": "What does the book say about energy and conservation?"}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["grounded"] is True
        assert isinstance(d["citations"], list) and len(d["citations"]) > 0
        assert isinstance(d["grounding"], list)

    def test_ask_nonsense(self, s):
        r = s.post(f"{API}/ask", json={"question": "zzzqqq flibbertigibbet xylophone quokka"}, timeout=90)
        assert r.status_code == 200
        d = r.json()
        # Should be ungrounded (no text hits)
        assert d["grounded"] is False


# ---- Personal library ----
class TestLibrary:
    def test_bookmarks_crud(self, s, reader_token):
        h = auth(reader_token)
        r = s.post(f"{API}/library/bookmarks", json={"proposition_number": 5}, headers=h)
        assert r.status_code == 200
        r = s.get(f"{API}/library/bookmarks", headers=h)
        assert r.status_code == 200
        nums = [b["number"] for b in r.json()["bookmarks"]]
        assert 5 in nums
        r = s.delete(f"{API}/library/bookmarks/5", headers=h)
        assert r.status_code == 200

    def test_notes(self, s, reader_token):
        h = auth(reader_token)
        r = s.post(f"{API}/library/notes", json={"proposition_number": 7, "text": "test note"}, headers=h)
        assert r.status_code == 200
        r = s.get(f"{API}/library/notes", headers=h)
        assert r.status_code == 200
        assert any(n["proposition_number"] == 7 for n in r.json()["notes"])

    def test_progress(self, s, reader_token):
        h = auth(reader_token)
        r = s.post(f"{API}/progress", json={"book_slug": "test", "chapter_number": 2, "proposition_number": 10}, headers=h)
        assert r.status_code == 200
        r = s.get(f"{API}/progress", headers=h)
        assert r.status_code == 200
        assert r.json()["progress"]["chapter_number"] == 2

    def test_library_requires_auth(self, s):
        assert s.get(f"{API}/library/bookmarks").status_code == 401


# ---- Challenges ----
class TestChallenges:
    def test_submit_and_list(self, s, reader_token):
        h = auth(reader_token)
        r = s.post(f"{API}/challenges", json={
            "proposition_number": 3, "kind": "counter-evidence",
            "argument": "This claim requires stronger evidence per the rubric.",
            "sources": "sample",
        }, headers=h)
        assert r.status_code == 200
        cid = r.json()["challenge"]["id"]
        r = s.get(f"{API}/me/challenges", headers=h)
        assert r.status_code == 200
        assert any(c["id"] == cid for c in r.json()["challenges"])


# ---- Editorial (admin) ----
class TestEditorial:
    def test_summary(self, s, admin_token):
        r = s.get(f"{API}/editorial/summary", headers=auth(admin_token))
        assert r.status_code == 200
        assert "challenges" in r.json()

    def test_reader_forbidden(self, s, reader_token):
        r = s.get(f"{API}/editorial/summary", headers=auth(reader_token))
        assert r.status_code == 403
        r = s.get(f"{API}/editorial/challenges", headers=auth(reader_token))
        assert r.status_code == 403

    def test_challenges_list(self, s, admin_token):
        r = s.get(f"{API}/editorial/challenges", params={"status": "pending"}, headers=auth(admin_token))
        assert r.status_code == 200

    def test_decision(self, s, admin_token, reader_token):
        # create a challenge
        r = s.post(f"{API}/challenges", json={
            "proposition_number": 4, "kind": "counter-evidence",
            "argument": "Sufficiently long argument for editorial review flow test."
        }, headers=auth(reader_token))
        cid = r.json()["challenge"]["id"]
        r = s.post(f"{API}/editorial/challenges/{cid}/decision",
                   json={"decision": "rejected", "editor_note": "insufficient"},
                   headers=auth(admin_token))
        assert r.status_code == 200

    def test_revise_and_retract(self, s, admin_token):
        h = auth(admin_token)
        r = s.post(f"{API}/editorial/propositions/999/revise",
                   json={"text": "Revised text for test.", "note": "test revise"}, headers=h)
        assert r.status_code == 200
        assert r.json()["revision"]["version"] >= 1
        # verify persistence
        r = s.get(f"{API}/propositions/999")
        assert r.status_code == 200
        assert r.json()["proposition"]["text"].startswith("Revised text")

        r = s.post(f"{API}/editorial/propositions/1000/retract",
                   json={"note": "test retract"}, headers=h)
        assert r.status_code == 200
        r = s.get(f"{API}/propositions/1000")
        assert r.json()["proposition"]["status"] == "retracted"

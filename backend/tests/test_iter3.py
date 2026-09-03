"""Iteration 3 backend tests: manifesto, evidence ratings + sources, tension proposals, voice picker."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "editor@mahakali.org", "password": "Codex2026!"}
READER = {"email": "reader@example.com", "password": "reader123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def reader_token():
    return _login(READER)


def h(t):
    return {"Authorization": f"Bearer {t}"}


# ---- Manifesto ----
class TestManifesto:
    def test_manifesto_entries(self):
        r = requests.get(f"{API}/manifesto", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        entries = d.get("entries", [])
        assert len(entries) == 15, f"expected 15, got {len(entries)}"
        # Preamble + I..XIV
        for e in entries:
            assert "kicker" in e and "title" in e and "sections" in e
            assert isinstance(e["sections"], list) and len(e["sections"]) > 0
            for s in e["sections"]:
                assert "heading" in s and "body" in s
        # Preamble content check
        preamble = entries[0]
        assert "preamble" in (preamble.get("kicker", "") + preamble.get("title", "")).lower()
        body_text = " ".join(s["body"] for s in preamble["sections"]).lower()
        assert "not dictated by god" in body_text


# ---- Evidence Ratings ----
class TestEvidenceRatings:
    def test_reader_cannot_revise(self, reader_token):
        r = requests.post(f"{API}/editorial/propositions/1/revise",
                          json={"text": "x", "note": "y"}, headers=h(reader_token), timeout=30)
        assert r.status_code == 403

    def test_admin_revise_with_confidence_and_sources(self, admin_token):
        payload = {
            "text": "Revised proposition text with evidence.",
            "note": "iter3 evidence rating test",
            "confidence": "high",
            "status": "established",
            "sources": [{
                "author": "A. Rao",
                "work": "Foundations",
                "year": 2019,
                "type": "peer-reviewed",
                "license": "CC-BY 4.0"
            }],
        }
        r = requests.post(f"{API}/editorial/propositions/1/revise",
                          json=payload, headers=h(admin_token), timeout=30)
        assert r.status_code == 200, r.text

        # verify persistence
        g = requests.get(f"{API}/propositions/1", timeout=30)
        assert g.status_code == 200
        p = g.json()["proposition"]
        assert p["confidence"] == "high"
        assert p["status"] == "established"
        srcs = p.get("sources", [])
        assert any(s.get("author") == "A. Rao" and s.get("work") == "Foundations" for s in srcs), srcs
        revisions = p.get("revisions") or g.json().get("revisions") or []
        # revision history preserved somewhere - be tolerant
        assert revisions or p.get("revised_at") or p.get("history"), "expected revision trail"


# ---- Tension Proposals ----
class TestTensionProposals:
    def test_reader_forbidden_editorial_list(self, reader_token):
        r = requests.get(f"{API}/editorial/tension-proposals?status=pending",
                         headers=h(reader_token), timeout=30)
        assert r.status_code == 403

    def test_flow_submit_list_approve_and_atlas_grows(self, admin_token, reader_token):
        # baseline atlas count
        base = requests.get(f"{API}/atlas", timeout=30).json().get("count", 0)

        theme = f"freedom vs order {uuid.uuid4().hex[:6]}"
        # reader submits
        r = requests.post(f"{API}/atlas/proposals",
                          json={"a_number": 5, "b_number": 60, "theme": theme,
                                "rationale": "they pull apart on constraint vs autonomy in meaningful ways"},
                          headers=h(reader_token), timeout=30)
        assert r.status_code == 200, r.text
        prop = r.json().get("proposal") or r.json()
        assert prop.get("status", "pending") == "pending"

        # reader lists own
        my = requests.get(f"{API}/me/tension-proposals", headers=h(reader_token), timeout=30)
        assert my.status_code == 200
        mine = my.json().get("proposals") or my.json().get("items") or []
        assert any(p.get("theme") == theme for p in mine), mine

        # admin lists pending
        L = requests.get(f"{API}/editorial/tension-proposals?status=pending",
                         headers=h(admin_token), timeout=30)
        assert L.status_code == 200
        pend = L.json().get("proposals") or L.json().get("items") or []
        found = next((p for p in pend if p.get("theme") == theme), None)
        assert found, f"pending proposal missing: {pend}"
        pid = found.get("id") or found.get("_id")

        # reader forbidden on decision
        rd = requests.post(f"{API}/editorial/tension-proposals/{pid}/decision",
                           json={"decision": "approved"}, headers=h(reader_token), timeout=30)
        assert rd.status_code == 403

        # admin approves
        ad = requests.post(f"{API}/editorial/tension-proposals/{pid}/decision",
                           json={"decision": "approved"}, headers=h(admin_token), timeout=30)
        assert ad.status_code == 200, ad.text

        # atlas count increased by 1
        after = requests.get(f"{API}/atlas", timeout=30).json().get("count", 0)
        assert after == base + 1, f"atlas count did not grow: base={base} after={after}"

    def test_reject_does_not_grow_atlas(self, admin_token, reader_token):
        base = requests.get(f"{API}/atlas", timeout=30).json().get("count", 0)
        theme = f"reject-theme {uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/atlas/proposals",
                          json={"a_number": 7, "b_number": 70, "theme": theme,
                                "rationale": "this one should be rejected during test"},
                          headers=h(reader_token), timeout=30)
        assert r.status_code == 200
        L = requests.get(f"{API}/editorial/tension-proposals?status=pending",
                         headers=h(admin_token), timeout=30).json()
        pend = L.get("proposals") or L.get("items") or []
        found = next((p for p in pend if p.get("theme") == theme), None)
        assert found
        pid = found.get("id") or found.get("_id")
        d = requests.post(f"{API}/editorial/tension-proposals/{pid}/decision",
                          json={"decision": "rejected"}, headers=h(admin_token), timeout=30)
        assert d.status_code == 200
        after = requests.get(f"{API}/atlas", timeout=30).json().get("count", 0)
        assert after == base, f"atlas count changed on reject: base={base} after={after}"


# ---- Voice picker (TTS) ----
class TestTTSVoice:
    def test_tts_sage_voice(self):
        r = requests.post(f"{API}/tts", json={"text": "Test", "voice": "sage"}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert "audio/mpeg" in r.headers.get("content-type", "")
        assert len(r.content) > 500

    def test_tts_invalid_voice_falls_back(self):
        r = requests.post(f"{API}/tts",
                          json={"text": "Test", "voice": "not-a-real-voice-xyz"}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert "audio/mpeg" in r.headers.get("content-type", "")
        assert len(r.content) > 500


# ---- Regression light ----
class TestRegression:
    def test_stats(self):
        d = requests.get(f"{API}/stats", timeout=30).json()
        assert d["books"] == 12 and d["chapters"] == 144 and d["propositions"] == 1299

    def test_books_12(self):
        assert len(requests.get(f"{API}/books", timeout=30).json()) == 12

    def test_validation(self):
        d = requests.get(f"{API}/validation", timeout=30).json()
        assert d["all_match"] is False
        checks = {c["entity"]: c for c in d["checks"]}
        assert checks["propositions"].get("delta") == 299

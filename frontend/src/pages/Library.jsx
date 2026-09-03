import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/Badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bookmark, StickyNote, MessageSquareWarning, BookMarked } from "lucide-react";

const WRAP = "max-w-[900px] mx-auto px-4 sm:px-8";

export default function Library() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.get("/library/bookmarks").then((r) => setBookmarks(r.data.bookmarks)).catch(() => {});
    api.get("/library/notes").then((r) => setNotes(r.data.notes)).catch(() => {});
    api.get("/me/challenges").then((r) => setChallenges(r.data.challenges)).catch(() => {});
    api.get("/progress").then((r) => setProgress(r.data.progress)).catch(() => {});
  }, []);

  const tabCls = "mono-label data-[state=active]:bg-ink data-[state=active]:text-paper";

  return (
    <div className={`${WRAP} py-14 sm:py-16`}>
      <p className="mono-label text-gold">Your private library</p>
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold tracking-tight uppercase text-ink mt-3">{user?.name}</h1>
      {progress?.chapter_number && (
        <Link to={`/read/${progress.book_slug}/${progress.chapter_number}`} data-testid="continue-reading" className="inline-flex items-center gap-2 mono-label text-gold mt-4 hover:gap-3 transition-all">
          <BookMarked size={14} /> Continue reading — chapter {progress.chapter_number} →
        </Link>
      )}

      <Tabs defaultValue="bookmarks" className="mt-8">
        <TabsList className="bg-[var(--surface)] border border-line flex-wrap h-auto">
          <TabsTrigger value="bookmarks" data-testid="tab-bookmarks" className={tabCls}><Bookmark size={14} className="mr-2" />Bookmarks ({bookmarks.length})</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes" className={tabCls}><StickyNote size={14} className="mr-2" />Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="challenges" data-testid="tab-challenges" className={tabCls}><MessageSquareWarning size={14} className="mr-2" />Challenges ({challenges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bookmarks" className="mt-4 space-y-2">
          {bookmarks.length === 0 ? <p className="font-body text-lg text-ink-muted py-8">No bookmarks yet.</p> :
            bookmarks.map((p) => (
              <Link key={p.number} to={`/proposition/${p.number}`} className="flex items-center gap-3 border border-line-subtle p-3 rounded-sm hover:border-gold transition-colors">
                <span className="mono-label text-ink-muted shrink-0">P{p.number}</span>
                <span className="font-body text-lg text-ink truncate flex-1">{p.title}</span>
                <StatusBadge value={p.status} />
              </Link>
            ))}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-2">
          {notes.length === 0 ? <p className="font-body text-lg text-ink-muted py-8">No notes yet.</p> :
            notes.map((n) => (
              <div key={n.id} className="border border-line-subtle p-4 rounded-sm">
                <Link to={`/proposition/${n.proposition_number}`} className="mono-label text-gold">P{n.proposition_number}</Link>
                <p className="font-body text-lg text-ink mt-1 leading-snug">{n.text}</p>
                <p className="mono-label text-ink-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="challenges" className="mt-4 space-y-2">
          {challenges.length === 0 ? <p className="font-body text-lg text-ink-muted py-8">You haven't submitted any challenges.</p> :
            challenges.map((c) => (
              <div key={c.id} className="border border-line-subtle p-4 rounded-sm">
                <div className="flex items-center justify-between">
                  <Link to={`/proposition/${c.proposition_number}`} className="mono-label text-gold">P{c.proposition_number} · {c.kind}</Link>
                  <span className={`mono-label ${c.status === "approved" ? "text-verified" : c.status === "rejected" ? "text-retracted" : "text-disputed"}`}>{c.status}</span>
                </div>
                <p className="font-body text-lg text-ink mt-1 leading-snug">{c.argument}</p>
                {c.editor_note && <p className="mono-label text-ink-muted mt-2">Editor: {c.editor_note}</p>}
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

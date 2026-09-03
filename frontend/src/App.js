import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Home from "@/pages/Home";
import Books from "@/pages/Books";
import BookView from "@/pages/BookView";
import ChapterView from "@/pages/ChapterView";
import PropositionView from "@/pages/PropositionView";
import Explorer from "@/pages/Explorer";
import MapOfEverything from "@/pages/MapOfEverything";
import ContradictionAtlas from "@/pages/ContradictionAtlas";
import Manifesto from "@/pages/Manifesto";
import BookChanges from "@/pages/BookChanges";
import ScriptureAudit from "@/pages/ScriptureAudit";
import AskTheBook from "@/pages/AskTheBook";
import Library from "@/pages/Library";
import Editorial from "@/pages/Editorial";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function App() {
  return (
    <PrefsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/manifesto" element={<Manifesto />} />
              <Route path="/read" element={<Books />} />
              <Route path="/read/:slug" element={<BookView />} />
              <Route path="/read/:slug/:chapterNumber" element={<ChapterView />} />
              <Route path="/chapter/:chapterNumber" element={<ChapterView />} />
              <Route path="/proposition/:number" element={<PropositionView />} />
              <Route path="/explore" element={<Explorer />} />
              <Route path="/map" element={<MapOfEverything />} />
              <Route path="/atlas" element={<ContradictionAtlas />} />
              <Route path="/changes" element={<BookChanges />} />
              <Route path="/audit" element={<ScriptureAudit />} />
              <Route path="/ask" element={<AskTheBook />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/editorial" element={<ProtectedRoute editorOnly><Editorial /></ProtectedRoute>} />
            </Routes>
          </Layout>
          <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "var(--font-body)", fontSize: "1rem" } }} />
        </BrowserRouter>
      </AuthProvider>
    </PrefsProvider>
  );
}

export default App;

import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children, editorOnly = false }) {
  const { user, ready, isEditor } = useAuth();
  if (!ready || user === null) {
    return <div className="max-w-[1400px] mx-auto px-6 py-24 text-center mono-label text-ink-muted">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (editorOnly && !isEditor) return <Navigate to="/" replace />;
  return children;
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { EscherArt } from "@/components/EscherArt";
import { toast } from "sonner";

const WRAP = "max-w-[440px] mx-auto px-4";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.name}`);
      navigate(u.role === "reader" ? "/library" : "/editorial");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className={`${WRAP} py-20`}>
      <EscherArt className="w-32 h-8 mb-6 opacity-70" variant="stairs" />
      <h1 className="font-head text-3xl font-extrabold tracking-tight uppercase text-ink">Sign in</h1>
      <p className="font-body text-lg text-ink-2 mt-2">Accounts are only needed for private notes, saved progress, challenges and editorial access. Reading stays anonymous.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input data-testid="login-email" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[var(--surface)] border-line font-body text-lg h-12" />
        <Input data-testid="login-password" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[var(--surface)] border-line font-body text-lg h-12" />
        {error && <p data-testid="login-error" className="font-body text-lg text-retracted">{error}</p>}
        <button data-testid="login-submit" disabled={busy} className="w-full bg-ink text-paper py-3 rounded-sm mono-label hover:bg-gold transition-colors disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="font-body text-lg text-ink-2 mt-6">No account? <Link to="/register" className="text-gold">Create one</Link></p>
    </div>
  );
}

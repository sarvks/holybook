import { createContext, useContext, useEffect, useState } from "react";
import api, { setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=anon, obj=user
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("codex_token");
    if (!token) { setUser(false); setReady(true); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => { setToken(null); setUser(false); })
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {}
    setToken(null);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, isEditor: user && (user.role === "editor" || user.role === "admin") }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

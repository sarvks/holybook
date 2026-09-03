import { createContext, useContext, useEffect, useState } from "react";

const PrefsContext = createContext(null);

export function PrefsProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("codex_theme") || "light");
  const [mode, setMode] = useState(() => localStorage.getItem("codex_mode") || "simple");
  const [scale, setScale] = useState(() => Number(localStorage.getItem("codex_scale")) || 1);
  const [voice, setVoice] = useState(() => localStorage.getItem("codex_voice") || "onyx");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("codex_theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("codex_mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("codex_scale", String(scale)); }, [scale]);
  useEffect(() => { localStorage.setItem("codex_voice", voice); }, [voice]);

  return (
    <PrefsContext.Provider value={{
      theme, setTheme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      mode, setMode, scale, setScale, voice, setVoice,
    }}>
      {children}
    </PrefsContext.Provider>
  );
}

export const usePrefs = () => useContext(PrefsContext);

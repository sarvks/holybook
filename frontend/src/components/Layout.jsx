import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePrefs } from "@/context/PrefsContext";
import { Sun, Moon, Menu, BookOpen, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { toast } from "sonner";

const NAV = [
  { to: "/manifesto", label: "Manifesto", testid: "nav-manifesto" },
  { to: "/read", label: "The Books", testid: "nav-read" },
  { to: "/explore", label: "Explorer", testid: "nav-explore" },
  { to: "/map", label: "Map of Everything", testid: "nav-map" },
  { to: "/atlas", label: "Contradiction Atlas", testid: "nav-atlas" },
  { to: "/changes", label: "The Book Changes", testid: "nav-changes" },
  { to: "/audit", label: "Scripture Audit", testid: "nav-audit" },
  { to: "/ask", label: "Ask the Book", testid: "nav-ask" },
];

function ThemeToggle() {
  const { theme, toggleTheme } = usePrefs();
  return (
    <button data-testid="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme"
      className="p-2 border border-line rounded-sm hover:border-gold text-ink-2 hover:text-gold transition-colors">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Layout({ children }) {
  const { user, isEditor, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); toast.success("Signed out"); navigate("/"); };

  const linkCls = ({ isActive }) =>
    `mono-label transition-colors ${isActive ? "text-gold" : "text-ink-2 hover:text-ink"}`;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--paper)]/90 border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
          <Link to="/" data-testid="nav-home" className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 border border-gold flex items-center justify-center text-gold"><BookOpen size={16} /></span>
            <span className="font-head font-extrabold tracking-tight text-ink text-base leading-none hidden sm:block">
              HOLY BOOK
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} data-testid={n.testid} className={linkCls}>{n.label}</NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/library" data-testid="nav-library" className="hidden sm:inline-flex mono-label items-center gap-1.5 px-3 py-2 border border-line rounded-sm text-ink-2 hover:text-gold hover:border-gold transition-colors">
                  <User size={14} /> Library
                </Link>
                {isEditor && (
                  <Link to="/editorial" data-testid="nav-editorial" className="hidden sm:inline-flex mono-label px-3 py-2 border border-gold rounded-sm text-gold hover:bg-gold hover:text-paper transition-colors">
                    Editorial
                  </Link>
                )}
                <button onClick={doLogout} data-testid="logout-btn" aria-label="Sign out"
                  className="p-2 border border-line rounded-sm text-ink-2 hover:text-retracted hover:border-retracted transition-colors"><LogOut size={16} /></button>
              </>
            ) : (
              <Link to="/login" data-testid="nav-login" className="hidden sm:inline-flex mono-label px-3 py-2 border border-line rounded-sm text-ink-2 hover:text-gold hover:border-gold transition-colors">
                Sign in
              </Link>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-btn" className="lg:hidden p-2 border border-line rounded-sm text-ink-2" aria-label="Menu"><Menu size={18} /></button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[var(--surface)] border-line">
                <div className="flex flex-col gap-1 mt-8">
                  {NAV.map((n) => (
                    <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className="font-head text-lg py-2 text-ink hover:text-gold">{n.label}</NavLink>
                  ))}
                  <div className="h-px bg-line my-3" />
                  {user ? (
                    <>
                      <NavLink to="/library" onClick={() => setOpen(false)} className="font-head text-lg py-2 text-ink hover:text-gold">Library</NavLink>
                      {isEditor && <NavLink to="/editorial" onClick={() => setOpen(false)} className="font-head text-lg py-2 text-gold">Editorial Dashboard</NavLink>}
                      <button onClick={() => { setOpen(false); doLogout(); }} className="font-head text-lg py-2 text-left text-retracted">Sign out</button>
                    </>
                  ) : (
                    <NavLink to="/login" onClick={() => setOpen(false)} className="font-head text-lg py-2 text-gold">Sign in</NavLink>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line mt-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <p className="font-head font-bold text-ink tracking-tight">THE HOLY BOOK · THE BOOK OF INFINITY</p>
            <p className="font-body text-ink-2 mt-2 text-lg leading-snug">
              A digital codex by Mahakali Studios. Editorial control: Mahakali Tribe LLP.
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="mono-label text-gold mb-2">Non-infallibility statement</p>
            <p className="font-body text-ink-2 text-lg leading-snug">
              This work does not claim to be infallible. Its position that it "makes holy books obsolete" is presented
              as the book's thesis, not a verified fact. Every proposition discloses its confidence, sources and
              counterarguments; revisions are attributable, appealable, and never silently rewritten. AI participation
              is disclosed and AI cannot publish canonical material.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

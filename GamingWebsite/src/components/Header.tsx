import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginModal } from "./LoginModal";

const NAV_LINKS = [
  { to: "/#news", label: "News" },
  { to: "/#upcoming", label: "Upcoming" },
  { to: "/#steam-popular", label: "Steam Popular" },
  { to: "/#steam-sales", label: "Sales" },
  { to: "/#top-games", label: "Top Games" },
  { to: "/feed", label: "Feed" },
];

export function Header() {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neon-pink/30 bg-bg-void/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="font-display text-sm neon-text-pink sm:text-lg">
            RETRO<span className="neon-text-cyan">PLAY</span>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((link) =>
              link.to.startsWith("/#") ? (
                <a
                  key={link.label}
                  href={link.to}
                  className="font-display text-[0.55rem] tracking-wide text-white/70 hover:text-neon-cyan"
                >
                  {link.label}
                </a>
              ) : (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    `font-display text-[0.55rem] tracking-wide hover:text-neon-cyan ${
                      isActive ? "text-neon-cyan" : "text-white/70"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="text-base text-white/70">
                  Hi, <span className="text-neon-yellow">{user.username}</span>
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="font-display text-[0.55rem] text-white/60 hover:text-neon-pink"
                >
                  LOG OUT
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="btn-retro-cyan"
              >
                LOG IN
              </button>
            )}
          </div>

          <button
            type="button"
            className="text-2xl text-white md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-neon-pink/20 px-4 py-4 md:hidden">
            {NAV_LINKS.map((link) =>
              link.to.startsWith("/#") ? (
                <a
                  key={link.label}
                  href={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="font-display text-[0.6rem] text-white/70"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="font-display text-[0.6rem] text-white/70"
                >
                  {link.label}
                </Link>
              ),
            )}
            {user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="btn-retro w-fit"
              >
                LOG OUT
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowLogin(true);
                  setMenuOpen(false);
                }}
                className="btn-retro-cyan w-fit"
              >
                LOG IN
              </button>
            )}
          </div>
        )}
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    login(username);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="retro-panel neon-border w-full max-w-sm bg-bg-dark p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 font-display text-sm neon-text-pink">
          PLAYER LOGIN
        </h3>
        <p className="mb-5 text-base text-white/70">
          No password needed — this is a mock login for the prototype. Pick a
          name to post in the feed.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-display text-[0.55rem] text-neon-cyan">
              USERNAME
            </span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. SynthRider88"
              className="border-2 border-white/20 bg-black/40 px-3 py-2 text-lg text-white outline-none focus:border-neon-cyan"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-display text-[0.55rem] text-white/60 hover:text-white"
            >
              CANCEL
            </button>
            <button type="submit" className="btn-retro">
              LOG IN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

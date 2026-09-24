export function Footer() {
  return (
    <footer className="border-t border-neon-pink/20 bg-bg-void">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <p className="font-display text-xs neon-text-pink">RETROPLAY</p>
        <p className="mt-3 text-base text-white/50">
          A fan-made 80s synthwave gaming hub. News summaries link back to
          their original sources — all game data shown is placeholder/demo
          content.
        </p>
        <p className="mt-4 text-sm text-white/30">
          © {new Date().getFullYear()} RetroPlay. Built for the arcade age.
        </p>
      </div>
    </footer>
  );
}

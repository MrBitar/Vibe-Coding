export function Hero() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden border-b border-neon-pink/30">
      <div className="retro-grid" />
      <div className="retro-sun" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        <p className="mb-4 font-display text-[0.6rem] tracking-[0.35em] text-neon-cyan animate-flicker">
          WELCOME PLAYER ONE
        </p>
        <h1 className="font-display text-3xl leading-tight neon-text-pink sm:text-5xl">
          RETRO<span className="neon-text-cyan">PLAY</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-xl text-white/80">
          News, upcoming releases, Steam trends, and a community feed — all
          wrapped in neon. No login needed to browse, just to join the
          conversation.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href="#news" className="btn-retro">
            LATEST NEWS
          </a>
          <a href="#upcoming" className="btn-retro-cyan">
            UPCOMING GAMES
          </a>
        </div>
      </div>
    </section>
  );
}

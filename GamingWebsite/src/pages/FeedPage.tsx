import { useMemo, useState, type FormEvent } from "react";
import { SectionHeading } from "../components/SectionHeading";
import { useAuth } from "../context/AuthContext";
import { useFeed } from "../context/FeedContext";
import {
  STEAM_POPULAR,
  STEAM_SALES,
  TOP_GAMES,
  UPCOMING_GAMES,
} from "../data/mockData";

function useGameOptions() {
  return useMemo(() => {
    const titles = new Set<string>();
    [...UPCOMING_GAMES, ...STEAM_POPULAR, ...STEAM_SALES, ...TOP_GAMES].forEach(
      (g) => titles.add(g.title),
    );
    return Array.from(titles).sort();
  }, []);
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PostComposer() {
  const { user } = useAuth();
  const { addPost } = useFeed();
  const gameOptions = useGameOptions();
  const [gameTitle, setGameTitle] = useState(gameOptions[0] ?? "");
  const [content, setContent] = useState("");

  if (!user) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addPost(user.username, gameTitle, content);
    setContent("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="retro-panel neon-border mb-10 flex flex-col gap-4 p-5"
    >
      <p className="font-display text-[0.6rem] text-neon-cyan">
        SHARE YOUR THOUGHTS
      </p>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-white/60">Game</span>
        <select
          value={gameTitle}
          onChange={(e) => setGameTitle(e.target.value)}
          className="border-2 border-white/20 bg-black/40 px-3 py-2 text-lg text-white outline-none focus:border-neon-cyan"
        >
          {gameOptions.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-white/60">Thoughts</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="What do you think about this game?"
          className="resize-none border-2 border-white/20 bg-black/40 px-3 py-2 text-lg text-white outline-none focus:border-neon-cyan"
        />
      </label>
      <button type="submit" className="btn-retro w-fit">
        POST TO FEED
      </button>
    </form>
  );
}

export function FeedPage() {
  const { user } = useAuth();
  const { posts } = useFeed();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="COMMUNITY"
        title="The Feed"
        action={
          !user && (
            <p className="text-sm text-white/50">
              Log in from the header to post your own thoughts.
            </p>
          )
        }
      />

      <PostComposer />

      {posts.length === 0 ? (
        <p className="retro-panel px-6 py-10 text-center text-white/50">
          No posts yet — be the first to share your thoughts.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <article key={post.id} className="retro-panel p-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-[0.6rem] text-neon-yellow">
                  {post.username}
                </span>
                <span className="text-sm text-white/40">
                  {timeAgo(post.postedAt)}
                </span>
              </div>
              <p className="mb-2 text-sm text-neon-cyan">
                on <span className="text-white">{post.gameTitle}</span>
              </p>
              <p className="text-lg text-white/85">{post.content}</p>
              <p className="mt-3 text-sm text-white/40">♥ {post.likes}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

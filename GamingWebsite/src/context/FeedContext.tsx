import { createContext, useContext, useState, type ReactNode } from "react";
import { INITIAL_FEED_POSTS } from "../data/mockData";
import type { FeedPost } from "../types";

interface FeedContextValue {
  posts: FeedPost[];
  addPost: (username: string, gameTitle: string, content: string) => void;
}

const FeedContext = createContext<FeedContextValue | undefined>(undefined);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<FeedPost[]>(INITIAL_FEED_POSTS);

  const addPost = (username: string, gameTitle: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const newPost: FeedPost = {
      id: `f-${Date.now()}`,
      username,
      gameTitle,
      content: trimmed,
      postedAt: new Date().toISOString(),
      likes: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  return (
    <FeedContext.Provider value={{ posts, addPost }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used within FeedProvider");
  return ctx;
}

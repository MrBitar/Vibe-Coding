import { GENRES } from "../data/mockData";
import type { Genre } from "../types";

interface GenreFilterProps {
  active: Genre | "All";
  onChange: (genre: Genre | "All") => void;
}

export function GenreFilter({ active, onChange }: GenreFilterProps) {
  const options: (Genre | "All")[] = ["All", ...GENRES];

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {options.map((genre) => {
        const isActive = genre === active;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onChange(genre)}
            className={`font-display text-[0.55rem] tracking-wide px-3 py-2 transition-colors ${
              isActive
                ? "border-2 border-neon-cyan bg-neon-cyan/20 text-white"
                : "border-2 border-white/15 text-white/60 hover:border-neon-cyan/60 hover:text-white"
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}

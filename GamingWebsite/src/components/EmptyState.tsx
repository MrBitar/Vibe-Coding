export function EmptyState({ label }: { label: string }) {
  return (
    <p className="retro-panel px-6 py-10 text-center text-white/50">
      No {label} match this genre right now.
    </p>
  );
}

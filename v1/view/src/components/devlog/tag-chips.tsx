import { PopularTag } from '@/lib/types';

interface TagChipsProps {
  tags: PopularTag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function TagChips({ tags, activeTag, onSelect }: TagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const isActive = activeTag === tag;
        return (
          <li key={tag}>
            <button
              type="button"
              onClick={() => onSelect(isActive ? null : tag)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                isActive
                  ? 'bg-emerald-500 text-neutral-900'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              #{tag} <span className="opacity-60">{count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

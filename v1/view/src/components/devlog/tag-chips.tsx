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
              className={`flex min-h-11 items-center gap-1.5 border px-3 text-sm ${
                isActive
                  ? 'border-signal text-signal'
                  : 'border-line text-dim hover:text-text'
              }`}
            >
              #{tag}
              <span className="text-xs italic opacity-70">{count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

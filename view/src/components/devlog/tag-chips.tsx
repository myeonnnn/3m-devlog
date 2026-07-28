'use client';

import { useEffect, useRef, useState } from 'react';
import { PopularTag } from '@/lib/types';

interface TagChipsProps {
  tags: PopularTag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

// h-11(44px) 칩 2줄 + 줄 사이 gap-2(8px)
const COLLAPSED_MAX_HEIGHT = 96;

export function TagChips({ tags, activeTag, onSelect }: TagChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > COLLAPSED_MAX_HEIGHT + 1);
  }, [tags]);

  if (tags.length === 0) return null;

  return (
    <div>
      <ul
        ref={listRef}
        className="flex flex-wrap gap-2 overflow-hidden"
        style={{ maxHeight: expanded ? undefined : COLLAPSED_MAX_HEIGHT }}
      >
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
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-dim hover:text-text"
        >
          {expanded ? '[ 접기 ]' : '[ 더보기 ]'}
        </button>
      )}
    </div>
  );
}

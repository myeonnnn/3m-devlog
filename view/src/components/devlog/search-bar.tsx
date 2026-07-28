'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
      className="flex items-center gap-2 border border-line bg-panel px-3 py-2.5 focus-within:border-signal"
    >
      <span className="shrink-0 text-sm text-signal">you@3mlog:~$</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="grep 배운 점 / 버그 (Enter로 검색)"
        className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-dim placeholder:italic focus:outline-none"
      />
      {value.length === 0 && (
        <span className="h-4 w-2 shrink-0 animate-pulse bg-signal" aria-hidden="true" />
      )}
    </form>
  );
}

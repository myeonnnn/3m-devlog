import { useEffect, useRef } from 'react';

/** 반환된 ref를 목록 하단 sentinel에 붙이면, 그 요소가 뷰포트에 들어올 때 onLoadMore를 호출한다. */
export function useLoadMoreSentinel(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  onLoadMore?: () => void,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore?.();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return sentinelRef;
}

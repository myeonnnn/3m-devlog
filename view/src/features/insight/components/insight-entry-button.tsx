interface InsightEntryButtonProps {
  onClick: () => void;
}

export function InsightEntryButton({ onClick }: InsightEntryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="AI 회고 인사이트 보기"
      className="text-lg text-dim hover:text-signal"
    >
      ✦
    </button>
  );
}

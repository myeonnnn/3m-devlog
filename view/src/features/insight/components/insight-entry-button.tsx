import { Button } from '@/components/button';

interface InsightEntryButtonProps {
  onClick: () => void;
}

export function InsightEntryButton({ onClick }: InsightEntryButtonProps) {
  return (
    <Button variant="line" onClick={onClick} aria-label="AI 회고 인사이트 보기">
      ✦ 인사이트
    </Button>
  );
}

import { DevLog } from '../types';
import { DevLogCard } from './devlog-card';

interface DevLogListProps {
  devLogs: DevLog[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (devLog: DevLog) => void;
  onDelete: (devLog: DevLog) => void;
}

export function DevLogList({
  devLogs,
  isLoading,
  error,
  onEdit,
  onDelete,
}: DevLogListProps) {
  if (isLoading) {
    return <p className="text-sm text-dim">$ loading...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-danger">
        $ error: 기록을 불러오지 못했어요 — {error.message}
      </p>
    );
  }

  if (devLogs.length === 0) {
    return (
      <p className="text-sm text-dim">
        $ no logs found. 오늘 배운 점을 남겨보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 border-l border-line pl-4 sm:pl-6">
      {devLogs.map((devLog) => (
        <div key={devLog.id} className="relative">
          <span
            className="absolute top-1.5 -left-[calc(1rem+3px)] h-1.5 w-1.5 bg-signal sm:-left-[calc(1.5rem+3px)]"
            aria-hidden="true"
          />
          <DevLogCard devLog={devLog} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

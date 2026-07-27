import { DevLog } from '@/lib/types';
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
    return <p className="text-center text-neutral-400">불러오는 중...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-400">
        기록을 불러오지 못했어요: {error.message}
      </p>
    );
  }

  if (devLogs.length === 0) {
    return (
      <p className="text-center text-neutral-400">
        아직 기록이 없어요. 오늘 배운 점을 남겨보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {devLogs.map((devLog) => (
        <DevLogCard
          key={devLog.id}
          devLog={devLog}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

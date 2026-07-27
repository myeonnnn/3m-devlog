import { DevLog } from '@/lib/types';

interface DevLogCardProps {
  devLog: DevLog;
  onEdit: (devLog: DevLog) => void;
  onDelete: (devLog: DevLog) => void;
}

export function DevLogCard({ devLog, onEdit, onDelete }: DevLogCardProps) {
  const formattedDate = new Date(devLog.logDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-neutral-100 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-400">{formattedDate}</p>
          {devLog.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {devLog.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-emerald-300"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 gap-2 text-sm">
          <button
            type="button"
            onClick={() => onEdit(devLog)}
            className="text-neutral-400 hover:text-neutral-100"
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(devLog)}
            className="text-neutral-400 hover:text-red-400"
          >
            삭제
          </button>
        </div>
      </header>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-neutral-400">💡 오늘 배운 점</dt>
          <dd className="mt-1 whitespace-pre-wrap text-neutral-100">
            {devLog.learnedNote}
          </dd>
        </div>
        {devLog.troubleshootingNote && (
          <div>
            <dt className="text-neutral-400">🐛 해결한 버그 / 시행착오</dt>
            <dd className="mt-1 whitespace-pre-wrap text-neutral-100">
              {devLog.troubleshootingNote}
            </dd>
          </div>
        )}
        {devLog.tomorrowTask && (
          <div>
            <dt className="text-neutral-400">📌 내일 할 일</dt>
            <dd className="mt-1 whitespace-pre-wrap text-neutral-100">
              {devLog.tomorrowTask}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

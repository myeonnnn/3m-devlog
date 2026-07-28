import { DevLog } from '@/lib/types';

interface DevLogCardProps {
  devLog: DevLog;
  onEdit: (devLog: DevLog) => void;
  onDelete: (devLog: DevLog) => void;
}

function toLogFilename(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function DevLogCard({ devLog, onEdit, onDelete }: DevLogCardProps) {
  return (
    <article>
      <header className="flex items-start justify-between gap-4">
        <p className="text-sm">
          <span className="text-dim">$ devlog cat </span>
          <span className="text-signal">{toLogFilename(devLog.logDate)}.log</span>
        </p>
        <div className="flex shrink-0 gap-1 text-xs">
          <button
            type="button"
            onClick={() => onEdit(devLog)}
            className="flex h-11 items-center px-2 text-dim hover:text-signal"
          >
            edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(devLog)}
            className="flex h-11 items-center px-2 text-dim hover:text-danger"
          >
            rm
          </button>
        </div>
      </header>

      {devLog.tags.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-dim">
          {devLog.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </p>
      )}

      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-signal">learned&gt;</dt>
          <dd className="whitespace-pre-wrap text-text">{devLog.learnedNote}</dd>
        </div>
        {devLog.troubleshootingNote && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-signal">bug&gt;</dt>
            <dd className="whitespace-pre-wrap text-text">
              {devLog.troubleshootingNote}
            </dd>
          </div>
        )}
        {devLog.tomorrowTask && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-signal">next&gt;</dt>
            <dd className="whitespace-pre-wrap text-text">{devLog.tomorrowTask}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

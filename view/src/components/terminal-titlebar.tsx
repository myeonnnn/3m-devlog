export function TerminalTitlebar() {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <span className="hidden gap-1.5 sm:flex" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-dim/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal/70" />
      </span>
      <p className="flex-1 text-center text-xs text-dim sm:text-left">
        3m-devlog — zsh
      </p>
    </div>
  );
}

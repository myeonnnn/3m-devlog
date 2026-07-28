export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="3" fill="#0A0C0E" stroke="#23282C" strokeWidth="2" />
      <path
        d="M9 10 L16.5 16 L9 22"
        fill="none"
        stroke="#5FE3B3"
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="18" y="20" width="7" height="3" fill="#5FE3B3" />
    </svg>
  );
}

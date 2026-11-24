export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ftA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38BDF8" /><stop offset="1" stopColor="#A855F7" /></linearGradient>
        <linearGradient id="ftB" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#22D3EE" /><stop offset="1" stopColor="#6366F1" /></linearGradient>
      </defs>
      <path d="M14 10h40l-6 12H26c-3 0-5 2-6 5l-2 7H8l4-17c1-4 2-7 2-7z" fill="url(#ftA)" />
      <path d="M20 36h24l-5 11H24l-3 7H8l5-12c1-4 4-6 7-6z" fill="url(#ftB)" />
    </svg>
  );
}
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight text-foreground">FutureTalent <span className="text-gradient">AI</span></span>
    </span>
  );
}

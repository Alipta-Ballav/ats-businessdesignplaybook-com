import { useId } from "react";

/** Vector FutureTalent "F" mark: a violet→coral top ribbon curving into the stem, and a cyan lower sweep. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`t${id}`} x1="4" y1="20" x2="46" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.5" stopColor="#F472B6" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id={`c${id}`} x1="4" y1="46" x2="40" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path d="M8 24C8 12 15 4 27 4H46L41.5 13H27.5C20 13 15.5 17 14 24Z" fill={`url(#t${id})`} />
      <path d="M17 21.5H38L33.5 30.5H20.5C16.5 30.5 14 33.5 13 37L11.5 44H3L6 31C7.5 25 11.5 21.5 17 21.5Z" fill={`url(#c${id})`} />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2" aria-label="FutureTalent AI">
      <LogoMark className="h-8 w-8" />
      <span className="text-lg font-bold tracking-tight text-foreground" aria-hidden="true">
        FutureTalent{" "}
        <span className="bg-gradient-to-r from-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">AI</span>
      </span>
    </span>
  );
}

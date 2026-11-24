import logo from "@/assets/futuretalent_logo.png.asset.json";
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return <span className={`${className} inline-block overflow-hidden`} aria-hidden="true"><img src={logo.url} alt="" className="h-full max-w-none" /></span>;
}
export function Logo() {
  return <img src={logo.url} alt="FutureTalent AI" width={262} height={51} className="h-8 w-auto" />;
}

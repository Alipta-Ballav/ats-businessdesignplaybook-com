import { useSyncExternalStore } from "react";

/** Hyperlinks found in the uploaded file: visible label -> exact target URL. Same-tab memory only. */
export type ResumeLinks = Record<string, string>;
let state: ResumeLinks = {};
const subs = new Set<() => void>();
export const getResumeLinks = () => state;
export function setResumeLinks(next: ResumeLinks | null) {
  state = next ?? {};
  subs.forEach((f) => f());
}
export function useResumeLinks() {
  return useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state, () => state);
}

export type LinkSegment = { text: string; url?: string };
const RAW = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|www\.[^\s<>()]+[^\s<>().,;:!?'"]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:linkedin\.com|behance\.net|dribbble\.com|github\.com|medium\.com)\/[^\s<>()]*[^\s<>().,;:!?'"])/gi;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Turn visible text into the address a reader opens; the visible text itself is never changed. */
export function hrefFor(raw: string) {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^mailto:/i.test(raw)) return raw;
  if (/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(raw)) return `mailto:${raw}`;
  return `https://${raw}`;
}

/** Split text into plain and linked pieces: written URLs/emails, plus labels that were links in the upload. */
export function linkSegments(text: string, links: ResumeLinks = {}): LinkSegment[] {
  const labels = Object.keys(links).filter((l) => l.trim().length > 1).sort((a, b) => b.length - a.length);
  const parts = [RAW.source, ...labels.map((l) => `(?<![\\w])${esc(l)}(?![\\w])`)];
  const re = new RegExp(parts.join("|"), "gi");
  const out: LinkSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!m[0]) { re.lastIndex++; continue; }
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const label = labels.find((l) => l.toLowerCase() === m![0].toLowerCase());
    out.push({ text: m[0], url: label ? links[label]! : hrefFor(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Read <a href> labels from Word HTML (mammoth output). */
export function linksFromHtml(html: string): ResumeLinks {
  const out: ResumeLinks = {};
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = (m[1] ?? "").replace(/&amp;/g, "&");
    const label = (m[2] ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    if (label && /^(https?:|mailto:)/i.test(url) && !url.startsWith("#")) out[label] = url;
  }
  return out;
}

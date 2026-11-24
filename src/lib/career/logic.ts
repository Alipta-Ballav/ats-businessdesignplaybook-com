import {
  FTI_DIMENSIONS,
  futureTalentIndex,
  type Candidate,
  type Job,
  type Level,
} from "@/lib/scoring";
import { headlineScore } from "@/lib/fixer";
export const REMINDER_DAYS = 90;
export function promotionAudit(candidate: Candidate, level: Level) {
  const report = futureTalentIndex(candidate, level);
  return {
    ...report,
    priorities: [...report.dims]
      .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)
      .slice(0, 3),
  };
}
export function versionScore(v: {
  candidate: Candidate;
  job: Job;
  level: Level;
  resume_text: string;
  scored_text: string;
}) {
  if (v.resume_text !== v.scored_text) return null;
  return v.job.description.trim()
    ? headlineScore(v.job, v.candidate)
    : futureTalentIndex(v.candidate, v.level).total;
}
export function comparisonKey(v: { job: Job; level: Level }) {
  return JSON.stringify([
    v.level,
    v.job.description.trim(),
    v.job.mandatory,
    v.job.weights,
    v.job.flexibility,
  ]);
}
export function nextReminder(date: Date) {
  return new Date(date.getTime() + REMINDER_DAYS * 86400000);
}
export function reminderCalendar(date: Date, origin: string) {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FutureTalent//Resume Health//EN",
    "BEGIN:VEVENT",
    `UID:resume-health-${stamp(date)}@futuretalent`,
    `DTSTAMP:${stamp(date)}`,
    `DTSTART:${stamp(nextReminder(date))}`,
    "DURATION:PT15M",
    "RRULE:FREQ=DAILY;INTERVAL=90",
    "SUMMARY:Review your design resume",
    `DESCRIPTION:Refresh your evidence and review your progress. ${origin}/my-resumes`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for your quarterly design resume review",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
const patterns: Record<string, RegExp> = {
  craft: /interaction|visual design|prototyp|accessib|craft|information architecture/i,
  research: /research|usability|interview|human.centered|customer insight/i,
  product: /business|product strategy|metric|revenue|conversion|retention|outcome/i,
  systems: /design system|complex|enterprise|platform|token|component/i,
  ai: /\bAI\b|artificial intelligence|agent|copilot|machine learning/i,
  critical: /problem|trade.off|hypothes|ambiguity|prioriti|decision/i,
  leadership: /collaborat|stakeholder|mentor|leadership|cross.functional|partner/i,
  learning: /learn|experiment|innovat|curios|adapt/i,
};
export function teardown(description: string) {
  const lines = description
    .split(/\n|(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return FTI_DIMENSIONS.map((d) => ({
    ...d,
    quote: lines.find((line) => patterns[d.id]?.test(line)) ?? "",
  }));
}
export function weeklyIndex(date: Date, length: number) {
  return length ? Math.floor(date.getTime() / (7 * 86400000)) % length : 0;
}

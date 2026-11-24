import type { Candidate, CompEvidence, Job } from "./scoring";

export const SEED_JOBS: Job[] = [
  {
    id: "job-ai-designer",
    title: "Senior AI Product Designer",
    func: "UX and Product Design",
    seniority: "Senior",
    description: "Lead design of agentic AI experiences for our enterprise customer-service suite.",
    flexibility: 50,
    preset: "Balanced Match",
    mandatory: [
      { name: "Product design experience", essential: false },
      { name: "Interaction design", essential: false },
      { name: "Design systems", essential: false },
    ],
    preferred: ["Enterprise SaaS", "AI product experience", "Research experience"],
    weights: { JR: 30, FR: 40, HP: 30 },
    createdAt: "2026-11-10T09:00:00Z",
  },
];

const e = (
  proficiency: number,
  level: 1 | 2 | 3 | 4 | 5,
  quote: string,
  source = "Employment experience",
  transferable = false,
): CompEvidence => ({ proficiency, level, quote, source, transferable });

export const SEED_CANDIDATES: Candidate[] = [
  {
    id: "c-maya",
    jobId: "job-ai-designer",
    name: "Maya Iyer",
    role: "Lead Product Designer, Freshline",
    years: 9,
    domain: "Enterprise SaaS",
    mandatory: {
      "Product design experience": "met",
      "Interaction design": "met",
      "Design systems": "met",
    },
    competencies: {
      functional: e(5, 4, "Led redesign of the agent console, cutting average handle time by 18%."),
      domain: e(4, 2, "Six years designing B2B customer-service tooling."),
      execution: e(4, 4, "Shipped 3 major releases on schedule with a 5-person design team."),
      relevance: e(5, 2, "Owned design for products used by 40k support agents."),
      outcomes: e(
        4,
        4,
        "Self-serve deflection rose from 22% to 35% after her help-centre redesign.",
      ),
      ai: e(3, 2, "Designed AI-suggested replies for support agents."),
      systems: e(
        4,
        2,
        "Designed a unified customer-service architecture connecting routing, supervisor diagnostics and agent workflows.",
        "Project description",
      ),
      problem: e(4, 2, "Reframed 'faster replies' brief into a triage-quality problem."),
      social: e(4, 2, "Ran cross-functional design reviews with engineering and support ops."),
      strategic: e(3, 1, "Lists 'product strategy' as a skill.", "Skills section"),
      decision: e(3, 2, "Documented trade-offs in a design decision log."),
    },
  },
  {
    id: "c-tomas",
    jobId: "job-ai-designer",
    name: "Tomás Rivera",
    role: "Conversation Designer, Brightvoice",
    years: 6,
    domain: "Conversational AI",
    mandatory: {
      "Product design experience": "transferable",
      "Interaction design": "met",
      "Design systems": "missing",
    },
    competencies: {
      functional: e(
        3,
        2,
        "Designed dialogue flows and voice UI for banking assistants.",
        "Employment experience",
        true,
      ),
      domain: e(
        3,
        2,
        "Worked with customer-service teams on bot handoff.",
        "Employment experience",
        true,
      ),
      execution: e(4, 4, "Launched 12 conversational flows; containment improved 27%."),
      outcomes: e(4, 4, "Reduced call volume by 120k calls per year."),
      ai: e(
        5,
        4,
        "Built and evaluated LLM agents with retrieval and tool use; created an eval suite of 400 test dialogues.",
      ),
      systems: e(4, 2, "Mapped dependencies between NLU, CRM and live-agent routing."),
      learning: e(
        5,
        5,
        "Moved from linguistics research into AI product work within one year.",
        "Career history",
      ),
      flexibility: e(
        4,
        5,
        "Applied research methods from linguistics to agent design.",
        "Career history",
      ),
      problem: e(
        4,
        3,
        "Portfolio case study: reframed bot failure as intent ambiguity.",
        "Portfolio",
      ),
      creative: e(4, 2, "Invented a persona-testing method adopted by the team."),
      growth: e(4, 2, "Completed two AI evaluation courses in 2025.", "Certifications"),
      social: e(3, 2, "Facilitated workshops with support agents."),
    },
  },
  {
    id: "c-ana",
    jobId: "job-ai-designer",
    name: "Ana Kowalski",
    role: "UX Designer, Studio North",
    years: 3,
    domain: "Agency / E-commerce",
    mandatory: {
      "Product design experience": "met",
      "Interaction design": "met",
      "Design systems": "met",
    },
    competencies: {
      functional: e(3, 2, "Designed checkout flows for 4 e-commerce clients."),
      execution: e(3, 2, "Delivered projects within agency timelines."),
      relevance: e(2, 1, "Mid-size consumer projects.", "Employment experience"),
      ai: e(2, 1, "Lists ChatGPT and Midjourney.", "Skills section"),
      learning: e(3, 2, "Self-taught front-end prototyping."),
      creative: e(4, 3, "Award-winning concept for a retail app.", "Portfolio"),
    },
  },
];

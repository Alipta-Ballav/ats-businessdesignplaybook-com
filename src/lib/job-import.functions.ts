import { createServerFn } from "@tanstack/react-start";

const decode = (s: string) => s
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|h\d|div)>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();

function findPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findPosting(n); if (f) return f; } return null; }
  const o = node as Record<string, unknown>;
  if (o["@type"] === "JobPosting") return o;
  return findPosting(o["@graph"]);
}

export const importJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => {
    const u = new URL(String(d?.url ?? "").trim());
    if (!/^https?:$/.test(u.protocol)) throw new Error("Please paste a web link.");
    return { url: u.toString() };
  })
  .handler(async ({ data }) => {
    let url = data.url;
    const li = url.match(/linkedin\.com\/jobs\/(?:view\/(?:[^/?]*-)?|.*currentJobId=)(\d+)/);
    if (li) url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${li[1]}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", Accept: "text/html", "Accept-Language": "en" }, redirect: "follow" });
    if (!res.ok) return { error: `That page couldn't be opened (${res.status}). Paste the description instead.` };
    const html = (await res.text()).slice(0, 2_000_000);
    let title = "", company = "", description = "";
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try { const p = findPosting(JSON.parse(m[1]!)); if (p) {
        title = String(p["title"] ?? ""); description = decode(String(p["description"] ?? ""));
        const org = p["hiringOrganization"] as Record<string, unknown> | undefined; company = String(org?.["name"] ?? ""); break; } } catch { /* skip */ }
    }
    if (!description) {
      const li = html.match(/class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (li) description = decode(li[1]!);
    }
    if (!title && li) { const h = html.match(/<h2[^>]*top-card-layout__title[^>]*>([\s\S]*?)<\/h2>/) ?? html.match(/<a[^>]*topcard__link[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/); if (h) title = decode(h[1]!); }
    if (!title) {
      const t = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i) ?? html.match(/<title>([^<]*)<\/title>/i);
      title = t ? decode(t[1]!).replace(/\s*\|\s*LinkedIn.*$/, "") : "";
    }
    if (!description) {
      const d = html.match(/<meta[^>]+(?:name|property)="(?:og:)?description"[^>]+content="([^"]*)"/i);
      description = d ? decode(d[1]!) : "";
    }
    if (description.length < 120) return { error: "Couldn't read the full job description from that link. Paste it instead." };
    return { title: title.slice(0, 200), company: company.slice(0, 120), description: description.slice(0, 10000) };
  });

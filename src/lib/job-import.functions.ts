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
    const li = data.url.match(/linkedin\.com\/jobs\/(?:view\/(?:[^/?]*-)?|.*currentJobId=)(\d+)/);
    const id = li?.[1];
    const guest = id ? `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}` : data.url;
    const view = id ? `https://www.linkedin.com/jobs/view/${id}` : data.url;
    let last: { error: string } = { error: "Couldn't reach that page. Paste the description instead." };
    const attempts: Array<() => Promise<Awaited<ReturnType<typeof direct>> | null>> = [
      () => direct(guest),
      () => viaReader(guest),
      () => viaReader(view),
      () => new Promise((r) => setTimeout(r, 1200)).then(() => direct(guest)),
      () => direct(view),
    ];
    for (const a of attempts) {
      try { const r = await a(); if (r && !("error" in r)) return r; if (r) last = r; }
      catch (e) { console.error("job import attempt failed", e); }
    }
    return { error: last.error.includes("429") ? "LinkedIn is limiting requests right now. Try again in a minute, or paste the description." : last.error };
  });

async function viaReader(orig: string): Promise<{ title: string; company: string; description: string } | null> {
  const target = orig;
  const res = await fetch(`https://r.jina.ai/${target}`, { headers: { Accept: "text/plain"} });
  if (!res.ok) { console.error("reader status", res.status); return null; }
  const txt = (await res.text()).trim();
  const title = (txt.match(/^Title:\s*(.+)$/m)?.[1] ?? "").replace(/\s*\|\s*LinkedIn.*$/, "").trim();
  if (/authwall|sign in to view/i.test(txt.slice(0, 2000)) && txt.length < 3000) return null;
  const body = txt.split(/^Markdown Content:\s*$/m)[1]?.trim() ?? txt;
  if (body.length < 200) return null;
  return { title: title.slice(0, 200), company: "", description: body.slice(0, 10000) };
}

async function direct(input: string): Promise<{ title: string; company: string; description: string } | { error: string }> {
    let url = input;
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
}

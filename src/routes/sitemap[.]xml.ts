import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://ats.businessdesignplaybook.com";
// Public, crawlable pages only — no auth, admin, signed-in, API or redirecting routes.
const PATHS = ["/", "/check", "/swipe-file", "/promotion", "/teardowns", "/privacy", "/terms", "/refund"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PATHS.map((p) => `  <url><loc>${BASE_URL}${p}</loc></url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});

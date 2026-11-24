# Add a sitemap

Fixes the one failing SEO check so search engines can find every public page.

## What changes
- Add a sitemap at https://ats.businessdesignplaybook.com/sitemap.xml that lists these public pages: home, check, bullet library, promotion audit, weekly teardowns, privacy, terms and refund.
- Leave out the sign-in page, admin pages, signed-in pages, payment endpoints and old marketplace links that now redirect.
- Point to the sitemap from the crawler rules file, keeping all existing rules.

## Technical details
- Follow the platform's router-based sitemap recipe: add a `src/routes/sitemap[.]xml.ts` server route and set `staticData.sitemap` true or false on each route.
- Add a `Sitemap:` line to `public/robots.txt`.
- Leave out `<lastmod>`, since no page has a real content date.
- Mark the SEO finding fixed after confirming that `/sitemap.xml` returns valid XML.

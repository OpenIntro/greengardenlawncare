# SEO / AEO audit — Green Garden Lawn Care

Audit date: 2026-11-08. Source of truth is this repository, not a live crawl.

## Executive summary

Green Garden Lawn Care is a one-page Eleventy site for a North Texas residential lawn-care and holiday-lighting business. The page copy, headings, service cards, phone number, and contact name are already in the initial HTML. The design is pixel-checked against `index.html`, so visible copy and layout were left as they are.

The important defect was the public origin. `SITE_URL` is stored as a hostname with no protocol. Canonical, Open Graph, Twitter, sitemap, and JSON-LD URLs were therefore not absolute `https` URLs. That is fixed. The homepage now publishes one `WebSite` + `LocalBusiness` + `WebPage` graph for the services, phone, contact, area, logo, and hero image that are actually on the page. The estimate endpoint is kept out of the index. The hero image is preloaded.

The business has no street address and no Google Business Profile. Those stay unpublished. Hours and a public email are still unknown.

## Architecture

| Item | Finding |
|---|---|
| Framework | Eleventy 3. Templates in `src/pages`, layout in `src/_includes/layouts/base.njk`. |
| Source design | `index.html` is unpacked by `npm run extract` into `build/`. Do not edit `build/` by hand. |
| Rendering | Static HTML. `src/assets/js/home.js` is a module for the menu, gallery filter, lightbox, and form. Service copy, headings, and the form are in the first response. |
| Public routes | `/` only. `robots.txt` and `sitemap.xml` are generated and excluded from the sitemap collection. |
| Hosting | SFTP deploy to DreamHost (`tools/deploy.js`). `.htaccess` sets `ErrorDocument 404 /404.html`. No HTTPS or www redirects are in the repo. |
| Season | `src/_data/site.js` `configuredSeason` swaps the hero image and hero sentences. Title, description, and H1 stay stable. |
| Analytics | None in the repository. |
| Identity in code | Name: Green Garden Lawn Care. Phone: 214-962-9089. Contact: Chris Rivera. Area: North Texas. Address, hours, and public email: unset. |

Indexable page:

| Route | Purpose |
|---|---|
| `/` | Commercial page for residential lawn maintenance, shrub and hedge trimming, flower bed cleanouts, and holiday light installation for homeowners in North Texas. Conversion path: call, or the free-estimate form. |

## Prioritized findings

| Priority | Page / Component | Finding | Impact | Recommended Fix | Verification |
|---|---|---|---|---|---|
| P0 | Canonical, Open Graph, sitemap, JSON-LD | `SITE_URL` is a bare hostname. Those URLs were not absolute `https` URLs, so a canonical such as `greengardenlawncare.com/` can be read as a path on the current host. | Search and social systems can miss the real host, or treat the page as a different URL. | Publish a bare hostname as `https`. Implemented. | Built HTML canonical is `https://greengardenlawncare.com/`. Unit tests cover the normalizer. Live host redirects are not verified. |
| P1 | Homepage schema | JSON-LD was only a thin `LocalBusiness`: name, phone, area string. No page, website, logo, image, or the four services. | Machines had little to connect the business to its services and page. | `@graph` of `WebSite`, `LocalBusiness`, and `WebPage`, plus an offer catalog taken from the visible service cards. No address, price, or reviews. Implemented. | `test/schema.test.js`. Built JSON parses. Not submitted to Google's Rich Results Test. |
| P1 | `robots.txt` / sitemap | Sitemap URL had the same origin bug. `/api/estimate.php` was crawlable. | The form handler is not a page. A non-absolute sitemap URL is ignored or misread. | Disallow `/api/`. Emit `Sitemap:` only when the URL is absolute. Implemented. | Built `robots.txt` and `sitemap.xml`. |
| P1 | Sharing metadata | Social image, title, and description depended on the broken origin. No site name, locale, or image alt. | Shares can drop the image or point at the wrong host. | Absolute image URL, `og:site_name`, `og:locale`, and image alt from the hero. Implemented. | Present in built `<head>`. Not checked in a social debugger. |
| P2 | `src/api/estimate.php` | POST responses are HTML or JSON and were eligible to be indexed if requested. | A thank-you or error URL could enter the index. | `X-Robots-Tag: noindex` on every response, and a robots meta on the HTML response. Implemented. | Source assertions in `test/estimate.test.js`. Not fetched against DreamHost. |
| P2 | Hero image | The likely LCP image had no preload or `fetchpriority`. Gallery images below it already use `loading="lazy"`. | Slower discovery of the hero image. | Preload plus `fetchpriority="high"` on the hero only. Implemented. | Present in built HTML. No Lighthouse run, so this is a code-level change, not a measured LCP gain. |
| P2 | Homepage H1 | The only H1 is the slogan "Beautiful Homes. Every Season." The title and the eyebrow carry "North Texas lawn care and holiday lighting." | The title is the stronger query signal. Changing the H1 would change the approved design. | Leave the H1. Not implemented. | One H1 confirmed in the built page and in the browser. |
| P2 | Service names | Headings and footer say "Flower Bed Cleanouts." The form option said "Flower Bed Cleanout." | The submitted service name did not match the public heading. | Use "Flower Bed Cleanouts" in the form. Implemented. The longest option is still "Holiday Light Installation," so the closed select width does not change. | Unit test and built `<option>` text. |
| P3 | Fonts and images | Google Fonts stylesheet is render-blocking, with preconnect, preload, and `display=swap` already present. Gallery JPEGs are about 90–345 KB and lazy-loaded. Hero containers set size in CSS, but images have no width/height attributes. | Possible LCP and bytes cost. Not measured. | Do not recompress or change font loading without a new visual baseline. Not implemented. | Code inspection only. |
| P3 | `llms.txt` | No `llms.txt`. | Optional file some AI crawlers request. Not a ranking factor. | Publish a factual summary at `/llms.txt`. Implemented. It states there is no street address and no Google Business Profile. | Built file. Not in the sitemap. |
| — | AI crawlers | `User-agent: *` with only `Disallow: /api/` allows search, user-retrieval, and training crawlers on the public page. | Training crawlers are allowed because they match `*`. | No separate blocks were added. Opting out of training is a business decision. | `robots.txt` reviewed. |
| — | Local facts | Confirmed: no street address and no Google Business Profile. Name and phone match across the page. Hours and a public email are still unset. | Local-pack eligibility stays limited. Do not invent either profile. | Recorded in `llms.txt` and `src/_data/site.js`. | Owner confirmation. |
| — | 404 | Missing URLs returned a plain "Not found." | Unhelpful missing-URL response. | Branded `404.html`, `ErrorDocument` in `.htaccess`, and the local static server returns that page with status 404. Implemented. | `curl` to a missing path returned 404 and the branded page. Direct `/404.html` is 200. Live DreamHost not checked. |
| — | Measurement | No analytics tag. | Organic visits and form completions cannot be tied together. | Google Tag Manager `GTM-WCT6WQWC` in the shared layout. Implemented. A form-completion event still has to be configured inside the container. | Snippet present on `/` and the 404. Tag Manager's published tags were not inspected. |

Confirmed and fixed in this repo: the origin, schema, social tags, sitemap, robots rule, estimate `noindex`, and hero priority.

Needs a live check: HTTPS and www redirects, the production canonical, DreamHost 404 behavior, and that Google can fetch the sitemap.

The business confirmed it has no street address and no Google Business Profile. Those stay unpublished. Hours, a public email, and any city list are still unknown. Also unanswered: whether lighting includes removal, how often lawns are mowed, and what a visit includes.

Not implemented on purpose: FAQ schema, extra city or service URLs, review markup, prices, and a rewritten H1.

## Changes implemented

- Bare hostnames in `SITE_URL` are published as `https`. An explicit `http://` or `https://` origin is left alone. `.env` was not edited.
- Homepage JSON-LD is one graph: `WebSite`, `LocalBusiness`, `WebPage`. Services and descriptions are the four cards on the page. Offers have no price. Address, hours, ratings, and reviews are omitted.
- Open Graph and Twitter tags use the absolute hero image and its alt text, plus site name and `en_US`.
- The hero image is preloaded and marked `fetchpriority="high"`. Gallery images stay lazy.
- `robots.txt` disallows `/api/` and points at the absolute sitemap. The sitemap lists only `/`.
- Estimate responses send `noindex`.
- Service-card "Learn more" / "Get an estimate" labels were not turned into extra links. Each card is already one link (`#holiday` or `#estimate`). Nesting another link inside it broke the card layout and was reverted.
- The estimate form option now says "Flower Bed Cleanouts," matching the heading.
- Google Tag Manager `GTM-WCT6WQWC` is in the shared layout, including the noscript iframe.
- `/llms.txt` summarizes the published services, phone, contact, and area, and states that there is no street address and no Google Business Profile.
- `/404.html` is a branded noindex page. `.htaccess` sets `ErrorDocument 404 /404.html`. The local static server returns that page with status 404.

## Page-level SEO matrix

| | `/` |
|---|---|
| Intent | Commercial. Hire residential lawn care or holiday light installation in North Texas. |
| Title | Green Garden Lawn Care \| Lawn Care & Holiday Light Installation in North Texas |
| Meta description | Green Garden Lawn Care provides residential lawn maintenance, trimming, flower bed cleanouts, and professional holiday light installation in North Texas. Call 214-962-9089 for a free estimate. |
| H1 | Beautiful Homes. Every Season. |
| Canonical | `https://greengardenlawncare.com/` |
| Robots | Default index, follow. No `noindex` on this page. |
| Structured data | `WebSite`, `LocalBusiness`, `WebPage` |
| Visible copy | Unchanged. |
| Internal links | Unchanged. Header, footer, hero, and each service card already point at `#services`, `#holiday`, `#work`, or `#estimate`. |
| Form option | Flower Bed Cleanouts |

`/404.html` is noindex. Title: Page not found | Green Garden Lawn Care. H1: Page not found. Canonical: `https://greengardenlawncare.com/404.html`. It is not in the sitemap.

`/llms.txt` is plain text for AI crawlers. It is not in the sitemap.

## Remaining opportunities

1. Confirm the live site serves `https://greengardenlawncare.com/` and that `www` and `http` redirect there in one hop.
2. On the next deploy, confirm DreamHost is not already using a different `.htaccess`. The build ships one that only sets the 404. Merge any existing rules before uploading if the server already has some.
3. In Google Tag Manager, confirm the container is published and add a form-completion event if you want estimate requests counted.
4. Add hours or a public email only if they are real.
5. Separate URLs for lawn care and holiday lighting are a later information-architecture project. Do not generate city pages from "North Texas."
6. FAQ content needs answers the business will stand behind: installation timing, removal, mowing frequency, and what is included. Do not mark up questions that are not on the page.

## Validation results

| Check | Result |
|---|---|
| `npm test` | 31 passed, 0 failed. |
| `npm run build` | Eleventy wrote `/`, `robots.txt`, and `sitemap.xml`. |
| `npm run audit` | Passed. No broken local links in `_site`. |
| Built `<head>` | Canonical, Open Graph, Twitter, preload, and JSON-LD present. No `noindex` on `/`. Schema types: WebSite, LocalBusiness, WebPage. Business URL matches the canonical. No address, price, or review fields. |
| `robots.txt` | `Disallow: /api/` and `Sitemap: https://greengardenlawncare.com/sitemap.xml`. |
| `sitemap.xml` | One URL: `https://greengardenlawncare.com/`. |
| Playwright `e2e/quality.spec.js` | Passed: axe (WCAG 2 A/AA), keyboard skip-link and menu, mobile overflow. |
| Playwright `e2e/fidelity.spec.js` | Failed on screenshot height: built 1440×5877, design bundle 1440×5923. The first material difference is the estimate form. The design bundle paints "Leave this blank"; the built page hides that honeypot. Removing the new preload and `fetchpriority` attributes did not change the height delta, so those SEO edits are not the cause. |
| Browser, desktop width | Title, one H1, desktop nav, and the four-across service row rendered. "Holiday Lights" and the holiday service card both land on `/#holiday`. Estimate fields are still there. |

## External follow-up

These were not run:

- Google Search Console: submit the sitemap and inspect `https://greengardenlawncare.com/`.
- Google Rich Results Test and the Schema Markup Validator on the live URL.
- PageSpeed Insights or Lighthouse for LCP, INP, and CLS.
- A social debugger for the Open Graph image.
- Bing Webmaster Tools.
- Live HTTP checks for HTTPS, www, trailing slash, and a missing URL's status code.
- Google Analytics 4, once an ID exists.

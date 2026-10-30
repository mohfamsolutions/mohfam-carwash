# Project facts, direction and verification

## References inspected

On October 30, 2026, all five reference sites were fetched directly for source inspection: [MohFam](https://mohfam.co/), [Security](https://mohfamsecurity.com/), [Commercial Cleaning](https://mohfamcommercialcleaning.com/), [Pool Cleaning](https://mohfampoolcleaning.com/), and [Landscaping](https://mohfamlandscaping.com/). Local Landscaping and Pool Cleaning source/readmes/assets were inspected read-only. Reference screenshots, where available, are in `artifacts/qa/reference-*.png`.

Shared conventions retained: clear navigation and service inquiries, warm neutral surfaces, gold actions, a family relationship, shared app section, FAQs and practical contact paths. Car Wash has its own original automotive medallion with fine gold rings and a sculpted car silhouette, automotive photography and Inter-based display treatment. Home moves from introduction to proposed scopes, vehicle inquiries, inquiry process, shared app, FAQs and contact. Other pages vary their sections around their purpose: family background, scope discussion, customer inquiry categories, contact form, and privacy notice.

## Confirmed facts

- The requested division name is MohFam Car Wash, part of the MohFam family.
- Phone: +1 (818) 818-1181.
- Email: mohfamsolutions@gmail.com.
- The supplied shared App Store destination is https://apps.apple.com/app/id6793692825.
- Security’s exact shared QR decodes to that destination. It does not establish Car Wash booking support.

## Explicit proposals and unknowns

Exterior washing, ongoing wash care and business vehicle inquiries are **proposed discussion scopes**, not confirmed services. Personal drivers, multi-vehicle households and business contacts are inquiry categories, not claims of eligibility. Actual offerings, operating model, areas, vehicle types, methods, hours, availability, water/power/access requirements, prices and launch timing remain unconfirmed. Mobile washing, detailing, interior cleaning, fleet washing, paint correction and ceramic coatings are not represented as offered.

There are no invented addresses, reviews, prices, credentials, guarantees, environmental claims or client histories. No credentials or qualifications from another division are transferred to Car Wash. Stock photos are labeled illustrative. The logo and design are proposals for review, not previously approved identity assets.

## Local assets and provenance

`data/asset-sources.json` records exact downloaded source URLs and QR verification. Assets are committed under `public/assets/`; the build does not need network requests.

- `logo.svg`: original vector redesigned for this project: a sculpted gold coupe silhouette, a small finish glint and fine double rings on charcoal. The user requested the premium finish of the Pool Cleaning reference; this automotive medallion has its own geometry and no MF letters or pool-wave motif; no circular pool seal or landscaping tree is reused. `organization-logo.png`: separate 512×512 raster derived from that original.
- `hero.jpg`: Unsplash `photo-1503376780353-7e6692767b70`, dark sedan driving on a road.
- `detail.jpg`: Unsplash `photo-1492144534655-ae79c964c9d7`, silver sports car in a dark automotive setting.
- `wash.jpg`: Unsplash `photo-1607860108855-64acf2078ed9`, hand washing a vehicle.
- `road.jpg`: Unsplash `photo-1493238792000-8113da705763`, vehicles in evening traffic.
- Photography is illustrative stock downloaded from Unsplash image endpoints, not evidence of completed MohFam work. No photographer identity is asserted where it has not been independently verified.
- `inter.woff2` and `inter-LICENSE.txt`: existing local Inter and SIL Open Font License, copied read-only from Pool Cleaning. No font installed on the computer.
- `app-qr.png`: downloaded from Security’s `wp-content/uploads/2026/09/mohfam-app-qr-code.png`. Exact SHA-256: `9ce2fe3736a5a2b074e25c2de98ce6f7185223502dbfe904db910f757aa66214`. Independently decoded with jsQR to `https://apps.apple.com/app/id6793692825`.
- `app-store.png` and `app-screen.jpg`: Security’s same uploads folder, `download-on-the-app-store-badge.png` and `mohfam-app-home-screen-473x1024.jpg`. The shared screenshot is contextual reference, not a new Car Wash booking interface.
- `social/{home,about,services,vehicles,contact,privacy,404}.jpg`: distinct, locally generated 1200×630 JPEGs, all below 300 KB, composed from the respective page photo and original brand treatment. Representative home card visually inspected.

`scripts/assets.mjs` is a one-time provenance/retrieval utility. It verifies the original QR bytes and decodes its destination. Font retrieval in that utility depends on the sibling checkout; normal builds and verification do not.

## Technical SEO

Central distinct titles/descriptions/search purpose, one H1 per page, OG and X large-image metadata with alt/dimensions/MIME, separate logo, factual Organization/WebSite/WebPage/BreadcrumbList schema, route-derived image sitemap and fixed editorial date are implemented. No city-based keywords, ratings, unsupported LocalBusiness attributes or unconfirmed Service schema are emitted. Canonicals and sitemap URLs now use independently verified HTTPS `mohfamcarwash.com`. The initial reserved placeholder was replaced after dedicated-account FTPS/HTTPS marker verification. Local pages use both noindex metadata and HTTP headers; robots disallows crawling.

Publication is authorized. Dedicated-directory production redirects canonicalize HTTP, www, explicit index files and the independently marker-confirmed Security-domain subfolder alias. Local trailing slash and explicit index-file canonical redirects work. Search Console ownership verification and sitemap submission are later, separate tasks. Technical implementation does not establish Google indexing or ranking.

## Checks performed

- Build: seven generated pages, all local assets.
- Content verifier: 204 internal asset/route/anchor references, unique metadata, one H1, structured data, sitemap, noindex, original logo and social card dimensions/sizes.
- Exact Security QR hash and independently decoded destination.
- Eight passing server/security test groups: validation/header protection, HTTP statuses/redirects, origin/CSRF including malformed Unicode tokens, honeypot/minimum fill time, disabled delivery/rate limit, expiry, oversized bodies/content types, deployment lock.
- Actual Chromium 156 browser checks on every page at 1440, 1024, 768, 390 and 320px: no horizontal overflow, no missing images, no page script errors.
- Axe WCAG A/AA scans: no violations on all seven pages at 1440 and 320px. Two CTA text contrast issues found initially were corrected before the passing run.
- Desktop dropdown alignment, keyboard/Tab access and Escape/focus return; header hides downward, returns upward and remains visible with navigation open; mobile nested-menu/Escape; independent FAQ opening/closing; reduced-motion transitions.
- Form disabled-delivery and interrupted-connection feedback preserve entered fields. Backend tests verify validation/spam errors. No real messages sent.
- Representative desktop Home/Contact, narrow Home and branded social preview visually inspected. Screenshots of all pages at 1440 and 390px are retained locally in `artifacts/qa/`.
- Dependency audit: zero known production dependency vulnerabilities at the time of the check. This is not a security certification.

Manual assistive-technology testing, real mobile devices, mail DNS authentication and actual recipient inbox delivery are not verified.

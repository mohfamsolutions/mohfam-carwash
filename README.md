# MohFam Car Wash — local preview

An independent, seven-page website built only in this repository. **Nothing is published. Uploads and real email delivery are disabled.** Other MohFam source projects are unchanged.

## Run locally

Node 22+ (Node 24 recommended):

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Open **http://127.0.0.1:4177**. `npm.cmd` works with Windows PowerShell’s default execution policy. The server binds only to loopback. Stop with Ctrl+C. It serves the generated `dist/` directory, genuine branded 404 responses, and a secure local inquiry API; a generic static-file server will not support that API.

## Pages and content

Home, About, Services, Vehicles / Customer Inquiries, Contact, Privacy and branded 404. Individual service pages are deliberately deferred because no specific offerings are confirmed. The services page presents three explicitly proposed discussion scopes, with anchors rather than pretending they are established offerings.

- `data/site.mjs`: confirmed contact details, proposals, FAQs, shared navigation/footer links, page metadata, search purpose and verified origin.
- `scripts/build.mjs`: page-specific compositions, local social images, logo raster, schema and sitemap.
- `public/styles.css` and `public/app.js`: responsive visual system and interactions.
- `scripts/server.mjs`: local preview, inquiry validation and security controls.
- `deployment.json` and `.github/workflows/`: CI plus a locked deployment preparation workflow.

The proposal uses charcoal `#181c1d`, warm ivory `#f7f5ef`, muted gold `#c7a263`, and local Inter. An original automotive medallion with fine gold rings and a sculpted car silhouette distinguishes Car Wash from the pool seal and landscaping tree. See [project notes](docs/project.md) for references, facts, asset provenance, verification and remaining dependencies.

## Verification

```powershell
npm.cmd run build
npm.cmd run verify
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run qa
```

`verify` checks all seven routes, 204 internal references, one H1 per page, unique metadata, verified-domain HTTPS canonicals, schema, sitemap, noindex, QR hash/decoding, logo dimensions and every social image. Eight server/security test groups cover validation, origin/CSRF, spam, expiration, size limits, disabled delivery, rate limiting, HTTP responses and deployment locks.

Playwright launches actual Chromium. It checks all pages at 1440, 1024, 768, 390 and 320px, performs axe WCAG A/AA scans at 1440/320px, and exercises dropdown/keyboard/Escape, header scrolling, mobile menus, independent FAQs, reduced motion and preserved fields after disabled-delivery/connection errors. Results and screenshots go to ignored `artifacts/qa/`. Automated scans do not substitute for assistive-technology user testing.

## Release boundary

The verified origin is `https://mohfamcarwash.com`. Its dedicated FTPS account root was independently mapped using a temporary HTTPS/FTPS marker, which was removed. Pages and HTTP responses are noindex; robots disallows all crawling. Generated sitemap content is for review only. Mail returns HTTP 503 with an explicit **NOT sent** message; it never simulates success. No environment variable can activate local mail.

The GitHub Actions deployment workflow currently refuses remote work. It has no upload step or hosting secrets. Its guard is preparation, not a completed production deployment integration. Production runtime integration, a fresh destination check, mail integration and production redirects must be finished against the independently verified environment after explicit deployment authorization. See [release requirements](docs/release.md).

# MohFam Car Wash

Website: **https://mohfamcarwash.com/**. Publication authorized by the user on October 30, 2026. Changes and deployment apply only to the dedicated Car Wash account. Real inquiry email delivery remains disabled; visitors are directed to the confirmed phone and email.

## Local preview

Requires Node 22+ (24 recommended).

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Open **http://127.0.0.1:4177**. The local Node server remains loopback-only and noindex. Production is generated separately into ignored `release/` with `npm.cmd run build:production`; local output stays in `dist/`.

## Source and identity

Seven pages: Home, About, Services, Vehicles, Contact, Privacy and branded 404. Specific services and audiences are explicitly proposed or awaiting confirmation. There are no invented locations, prices, credentials, reviews or availability claims. Individual service pages await confirmed scopes.

- `data/site.mjs`: contacts, proposed scopes, FAQ/footer/navigation data, page metadata and search purpose.
- `scripts/build.mjs`: distinct page compositions, local social images, schema and image sitemap.
- `public/`: responsive styles, accessible interactions and local assets.
- `hosting/`: dedicated Apache redirects/headers/404 handling and a secure PHP inquiry endpoint.
- `scripts/deploy.mjs`: destination revalidation, backup and FTPS uploads without remote deletion.
- `deployment.json`: publication authorization and independently verified destination gates.

The approved design direction uses charcoal, warm ivory, muted gold and local Inter. The latest requested logo is an original gold automotive medallion, inspired by the fine finish of Pool Cleaning while using a distinct car silhouette, finish glint and no MF letters or pool-wave motif.

## Checks

```powershell
npm.cmd run build
npm.cmd run verify
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run qa
npm.cmd run build:production
node scripts/verify-production.mjs
npm.cmd run verify:live
node scripts/browser-qa.mjs --live
```

GitHub CI additionally lints the PHP files and exercises the actual PHP endpoint with origin/CSRF/header/spam/rate/disabled-mail tests. Local/browser checks cover all seven pages at 1440, 1024, 768, 390 and 320px; automated WCAG A/AA scans at 1440/320px; navigation, header behavior, FAQs, reduced motion and preserved form fields after errors. Screenshots and reports are in ignored `artifacts/qa/` and `artifacts/qa-live/`.

## Deployment and remaining work

Manual GitHub workflow: `Deploy verified Car Wash site`, protected by a dedicated `carwash-production` environment with its own encrypted FTPS secret. No deployments occur automatically on pushes. The workflow verifies authorization, TLS, exact account-root mapping with a unique temporary HTTPS/FTPS marker, backs up before overwrite, uploads without deletion and verifies live HTTP behavior. Backups are encrypted before being stored as Actions artifacts; the private restore key is Windows-user encrypted in ignored `.local/`.

Real form delivery remains disabled until an authorized sender domain, SPF/DKIM/DMARC review and actual recipient inbox receipt are verified. The PHP endpoint currently validates and returns a truthful NOT SENT response; browser fields remain intact. No test email has been sent. Search Console ownership and sitemap submission remain separate follow-up tasks; SEO implementation does not guarantee indexing or rankings.

See [project details and asset sources](docs/project.md) and [deployment and mail operations](docs/release.md).

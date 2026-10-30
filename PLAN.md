# Local-first Car Wash

1. Inspect references and local sibling sources read-only. Complete.
2. Build distinct responsive pages, original logo, local photography/font/app assets and central content/SEO. Complete.
3. Implement a disabled-by-default inquiry endpoint with server validation, CSRF, origin, spam and rate controls. Complete for local preview; production transport awaits verified sender and runtime.
4. Generate social images, sitemap and noindex preview; prepare locked CI/deployment. Complete. Deployment workflow is a fail-closed scaffold; uploader/runtime integration awaits verified hosting.
5. Run build, HTTP/security/content checks and rendered desktop/mobile/browser interaction checks. Complete; results and release dependencies in docs/project.md and docs/release.md.

Boundaries: changes only in this repository. No deployment, outgoing mail, DNS edits or credentials from siblings. Proposed services/audiences must never be represented as confirmed. No individual Service schema or detail pages until scopes are confirmed.

Revision: removed the header phone number and replaced the car illustration with a premium gold car medallion with fine double rings, a sculpted coupe silhouette and a restrained finish glint, following the user?s Pool Cleaning reference. Dedicated Car Wash FTPS credentials saved with Windows user-bound encryption under ignored .local/. Provider server name and supplied dedicated IP verified with TLS and dedicated login; unique temporary marker proved account-root mapping to https://mohfamcarwash.com, then was removed. Metadata now uses the verified origin; previews remain noindex and deployment/mail remain disabled. Hosting returns HTTP 500 for the removed/missing marker URL; production missing-page behavior remains unresolved.

Inquiry threat model: public inputs are untrusted; fixed recipient/subject, scalar/length/email/header validation, same-origin expiring CSRF cookie, minimum completion time, honeypot, bounded per-IP attempts and body size. No visitor data logged or persisted. Local server binds loopback. Mail cannot activate without independently verified sender/domain/inbox gates. Multi-instance production requires shared abuse storage and trusted proxy configuration.

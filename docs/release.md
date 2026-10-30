# Car Wash deployment and mail operations

The user explicitly authorized publication on October 30, 2026. Canonical origin: https://mohfamcarwash.com. Only the dedicated Car Wash FTP account is used. Other divisions' source and parent hosting configuration are unchanged.

## Verified destination

The supplied FTP alias, ftp.mohfamsecurity.com, returns NXDOMAIN. The user supplied cPanel server name p3plmcpnl503624 and dedicated IP 148.72.28.253. The client connects to that dedicated IP on port 21 with explicit FTPS and verifies the certificate against p3plmcpnl503624.prod.phx3.secureserver.net via SNI. No TLS hostname verification is disabled.

The dedicated account authenticates and its restricted root maps to the Car Wash HTTPS origin. Unique temporary markers were retrieved byte-for-byte through HTTPS and then removed, with removal confirmed in the FTPS listing. The physical server path remains unknown; the dedicated account-relative root is the verified target.

Marker checks identified www.mohfamcarwash.com and mohfamsecurity.com/mohfamcarwash.com as duplicate aliases before redirect changes. Rules inside the Car Wash directory canonicalize them to the primary origin. No Security root or parent configuration was edited.

## Repeat deployment

The repository is mohfamsolutions/mohfam-carwash. The manual Actions workflow uses the dedicated carwash-production environment and CARWASH_FTPS_PASSWORD secret. The local credential is Windows DPAPI encrypted under ignored .local/; no password enters source, command arguments or protocol logs.

1. Build/test the local and production outputs. PHP lint and actual endpoint security tests run on the GitHub runner.
2. Revalidate publication gates, trusted FTPS/TLS, account root and a fresh unpredictable HTTPS marker.
3. Inventory and back up existing files before upload. Refuse unsafe inventory names or symlinks. Keep original directories and never delete remote files as part of upload.
4. Encrypt the backup with AES-256-GCM and an RSA-OAEP-SHA256 wrapped key before uploading an Actions artifact. The public encryption key is in data/backup-public-key.pem; the private key is user-bound encrypted at .local/backup-private-key.dpapi. Keep that private key safe to preserve restore access.
5. Upload only release/, including the account-specific .htaccess and PHP endpoint. No source, credentials, tests or backup directory is deployed.
6. Verify canonical pages, assets/social images, robots/sitemap/schema, HTTP/www/index/subfolder redirects, real branded 404 responses and the API. Browser-test the actual HTTPS site separately.

Download the encrypted Actions backup and use node scripts/decrypt-backup.mjs path/to/backup.enc under the original Windows user to produce artifacts/restored/backup.tar.gz. This does not restore anything remotely. Review contents before a separately authorized restore.

Initial deployment runs caught preview wording before uploads and unbranded missing-page responses during live verification. Production-copy validation and explicit local missing-path routing were added. Final verification evidence is stored in artifacts/hosting/ and artifacts/qa-live/; the successful workflow run is recorded in the final delivery.

## Publication verification completed

Published October 30, 2026: https://mohfamcarwash.com/.

- Successful deployment workflow: https://github.com/mohfamsolutions/mohfam-carwash/actions/runs/40990714623 (release commit 358b202).
- Matching CI run passed: https://github.com/mohfamsolutions/mohfam-carwash/actions/runs/40990713433.
- All six public content routes return HTTP 200 with verified canonicals, indexable metadata, structured data and security headers. Missing routes and both branded 404 entry points return actual HTTP 404 with the branded document.
- HTTP, www, explicit index URLs and the confirmed Security-domain subfolder alias redirect to the canonical Car Wash origin. All seven live social images are valid 1200x630 JPEGs below 300 KB.
- Actual live Chromium QA passed all 38 checks: all seven pages at 1440, 1024, 768, 390 and 320px; no overflow, missing images or page script errors; zero automated WCAG A/AA violations at 1440/320px; navigation/header/FAQ/reduced-motion interactions; field preservation after actual PHP validation, disabled-delivery and connection errors. Representative live desktop Home and mobile Contact screenshots were visually reviewed.
- Actual PHP lint and endpoint security tests passed in CI. Live API origin/CSRF checks passed. No email was sent, and disabled-delivery feedback accurately states NOT SENT.
- The encrypted backup artifact was downloaded and successfully authenticated/decrypted locally to artifacts/restored/backup.tar.gz. Its archive inventory includes the prior site and account configuration. No remote restore or deletion was performed.

Remaining: confirm actual business offerings/details, verify a sender domain and real recipient inbox delivery before enabling form mail, and complete Search Console ownership/sitemap submission. Manual assistive-technology and real-device testing remain separate from the completed browser and automated accessibility checks.

## Production behavior

The public build has indexable metadata, verified HTTPS canonicals and a crawlable robots/sitemap; 404s and API responses remain noindex. Local builds retain noindex. Dedicated-directory Apache rules handle HTTPS, www, explicit index files, the confirmed subfolder alias, security headers and branded HTTP 404s. No HSTS preload or parent-domain policy was introduced.

The PHP form has bounded scalar validation, conservative email validation, control/header rejection, consent/category checks, same-origin enforcement, secure HttpOnly SameSite CSRF sessions, expiry, honeypot, minimum fill time, a 16 KB body limit and flock-protected hashed per-address rate records outside the web root. Untrusted proxy headers are ignored. Inquiry contents are neither logged nor persisted by the endpoint. Hosting may retain technical access/error logs. The browser preserves fields after every failure.

## Mail activation remains pending

The fixed recipient is mohfamsolutions@gmail.com. The prepared subject prefix is [MohFam Car Wash], and Reply-To is the validated visitor email. The endpoint intentionally never invokes a mail transport and returns an explicit NOT SENT response. Real email must not be described as working.

Before activating mail, confirm an authorized sender identity/domain; inspect its actual SPF, provider-specific DKIM selectors and DMARC; report required authentication changes without guessing records or weakening DMARC. Use runtime secrets and server-owned headers. An authorized synthetic message must be observed in the recipient inbox with correct authentication, subject and Reply-To; relay acceptance alone is insufficient. No actual message has been sent or inbox receipt verified.

Actual offerings, service areas, operating model, vehicle eligibility, hours, pricing, availability and water/power requirements still need business confirmation. Proposals remain clearly labeled on the public site. Car Wash booking in the shared app is not claimed.

Search Console ownership verification and sitemap submission remain separate from deployment and technical SEO; indexing and rankings are not guaranteed.

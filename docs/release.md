# Deployment and mail requirements — locked

No deployment is authorized. All work remains local. `deployment.json` records the verified Car Wash domain and dedicated FTPS account-root mapping. Its upload and mail flags remain false. No sender identity has been established. The Actions deployment guard fails closed and no upload action exists. CI builds/tests locally in GitHub if this repository is later pushed; no push or remote workflow run was performed during this work.

## Business review before publication

Confirm the actual offerings first, then publish only their appropriate detail pages and Service schema. Confirm operating model, service areas, vehicle types, hours, availability, methods, prices and water/power/access requirements. Review the proposed logo, stock photography, page text and privacy notice. Confirm whether the shared app supports any Car Wash action; until then retain the explicit disclaimer.

## Independent destination verification

### Local FTPS setup completed

The supplied `ftp.mohfamsecurity.com` name returns NXDOMAIN. The user supplied cPanel server name `p3plmcpnl503624` and dedicated IP `148.72.28.253`. The FTPS client connects to that dedicated IP on port 21 and validates TLS against `p3plmcpnl503624.prod.phx3.secureserver.net` using SNI and normal certificate/hostname validation. The provider hostname also resolves to shared IP `132.148.251.187`; no assumption that the shared address is the dedicated address is made.

The dedicated Car Wash account successfully authenticated over validated explicit FTPS. Its restricted working directory is `/`, containing `.well-known`, `cgi-bin` and `.ftpquota`. A unique random temporary text file was uploaded to that account root and retrieved byte-for-byte over trusted HTTPS at `https://mohfamcarwash.com`. It was then deleted; no site files were uploaded and no existing contents were modified. The server’s absolute filesystem path is not known and is not guessed from this account-relative root.

The removed marker URL returned HTTP 500; the empty site root returned HTTP 403. These existing host responses must be fixed in the dedicated Car Wash configuration during an authorized deployment. They are not treated as passing production 404 checks.

Non-secret connection settings are in `data/hosting.json`. The password is encrypted with Windows DPAPI for the current Windows user in ignored `.local/ftps-password.dpapi`, not committed or placed in shell arguments/logs. The FTPS library runs without protocol debug logging. To replace it locally, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/save-ftps-credential.ps1` and use the hidden prompt. A future CI run can use a dedicated `CARWASH_FTPS_PASSWORD` environment secret; none has been created remotely.

`npm.cmd run hosting:inspect` lists the account read-only. `node scripts/verify-hosting.mjs` intentionally creates and removes only its own unique temporary verification marker; it never uploads website content. Reports are saved under ignored `artifacts/hosting/`. Neither command enables deployment or email.

After explicit deployment authorization:

1. Establish the actual domain, dedicated hosting account and absolute dedicated folder independently. Do not copy another division’s account mapping or assume a sibling folder is safe.
2. Verify TLS and host routing. Place a unique temporary marker over authenticated TLS-protected FTPS into the dedicated folder and read its exact unpredictable content over the intended HTTPS domain. Verify the account-to-folder mapping independently of DNS resolution alone. Remove only the marker created for this verification.
3. Inventory existing files and identify duplicate hostnames, www variants, index URLs and subfolder aliases. Report aliases before changing redirects. Never edit a parent directory or another division’s hosting configuration.
4. Back up existing destination contents before overwrite. Establish the production runtime. The current Node server intentionally accepts only loopback HTTP; the form API needs a verified Node runtime or a separately implemented/tested hosting-native endpoint. A static upload alone cannot supply the inquiry API.
5. Configure a dedicated protected GitHub environment and its own secrets after the account is verified. Credentials must never enter source, shell arguments or logs. Keep automatic deployment off; use manual dispatch. The current workflow intentionally has no upload implementation until these facts are known.
6. Metadata already uses the verified HTTPS domain. Implement domain-specific HTTPS/www and index redirects, genuine 404 behavior, security headers and an API route. Remove noindex only after business and release checks. Keep aliases isolated to the Car Wash destination.
7. Add the verified transport to Actions with revalidation of the HTTPS/FTPS marker, backup, upload-only behavior and no remote deletion by default. Do not deploy source/config/secrets publicly. Verify the hosted pages, all local assets, redirects, social cards, sitemap, robots, structured data and HTTP 404s. Run and verify the manual GitHub deployment workflow.

The account and destination are now verified, and the supplied panel reports cPanel/Apache hosting. Production form-runtime integration and the dedicated deployment configuration are still pending. The guard and manual workflow remain locked; enabling a flag alone does not deploy anything.

## Mail preparation and activation

The local endpoint already validates bounded scalar fields, conservative email format, header controls, consent and inquiry category. It uses same-origin checks, HttpOnly SameSite CSRF sessions with expiration, minimum fill time, a honeypot and five-attempt/hour per-network-address rate limiting. Bodies are capped at 16 KB. Visitors’ form entries are preserved after failure; no inquiry payloads are logged or stored. In-memory maps are bounded, expire and reset on restart; production needs shared persistent abuse controls if the runtime has multiple instances. Establish trusted proxy handling before using forwarded client addresses.

`composeMail()` creates a fixed recipient `mohfamsolutions@gmail.com`, a server-owned subject beginning `[MohFam Car Wash]`, and a Reply-To from the validated visitor email. Its result is **not sent**. The local route hard-stops with HTTP 503 and cannot be activated with an environment variable. The frontend only clears fields on an actual successful API response, which the local endpoint never emits.

Before enabling a production transport:

1. Confirm a sender identity/domain authorized for Car Wash. A recipient Gmail address does not establish a production sender identity. No sibling SMTP credentials or sender settings have been adopted.
2. Inspect the actual SPF, provider-specific DKIM selectors and DMARC records for that confirmed sender domain. The domain/selector is not known yet; no DNS values or authentication status have been guessed. Report required changes based on the actual provider, preserve DMARC strength, and do not change DNS without authorization.
3. Add the transport using runtime secrets, TLS and server-owned From/recipient/subject, with validated Reply-To. Revalidate server-side on every submission. Use production-only activation gates for independently verified domain, sender authentication and authorized mail testing. Ensure failures preserve fields and never report delivery success.
4. Send an explicitly authorized synthetic test message. Inspect the recipient inbox and message headers to verify delivery, authentication, subject prefix and Reply-To. Relay acceptance alone is not proof of receipt. Record inbox evidence before public mail activation; no current test has been sent.
5. Update privacy handling for actual hosting/mail providers, access, retention and request process. Verify the final production error paths, storage boundary and abuse controls.

## Search follow-up

After live verification, establish Search Console ownership and submit the verified sitemap. Monitor crawl/index reports separately from technical launch checks. No Google indexing or ranking is promised.

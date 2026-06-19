# TraceLattice

TraceLattice is a defensive cybersecurity project that runs a bounded static scan of a public web origin and turns observable web, DNS, TLS, cookie, and third-party signals into an explainable posture report.

Live demo: [https://tracelattice.vercel.app](https://tracelattice.vercel.app)

## What it does

TraceLattice looks at the parts of a site that are visible before running any target JavaScript:

- HTTPS state and redirect behavior
- HTTP security headers
- `Set-Cookie` names and attributes, without storing cookie values
- Static scripts, iframes, images, links, forms, and meta refresh references across up to three HTML pages
- First-party vs. third-party root domains
- Known analytics, advertising, social, session replay, tag manager, CDN, and unknown provider patterns
- TLS certificate, DNS email-auth, DNSSEC, CAA, public disclosure, SRI, form, and client-side static risk signals

The result is a static posture report with component scores for header posture, cookie hygiene, third-party exposure, and advanced posture. It is not a vulnerability scanner, compliance audit, or replacement for manual review.

## Technical highlights

- Built with Next.js App Router, React, TypeScript, Tailwind CSS, and Vercel Functions
- DNS-aware SSRF guardrails for public URL scanning
- Manual redirect validation with a three-hop ceiling
- Request timeout and response-size limits to control serverless cost and abuse
- Bounded same-origin HTML sampling: requested page plus up to two ordinary same-site links
- Contextual cookie analysis for `Secure`, `HttpOnly`, `SameSite`, scope, retention, and identifier-like names
- HTTP header checks for CSP, HSTS, frame protection, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and cross-origin isolation headers
- Static third-party resource mapping and tracker categorization
- TLS certificate health, CAA, SPF, DMARC, MX, DNSSEC, MTA-STS, TLS-RPT, security.txt, public discovery-file, mixed-content, SRI, form-action, reverse-tabnabbing, and inline-script risk checks
- Weighted 0-100 posture score with transparent evidence
- Side-by-side comparison that avoids absolute "safer site" claims
- JSON export, copyable summary, and browser-local scan history
- Unit tests for URL validation, cookie analysis, header analysis, tracker detection, third-party extraction, and scoring

## Architecture

```text
Browser
  -> POST /api/scan
    -> Normalize and validate URL
    -> Reject private, local, reserved, and unsafe targets
    -> Resolve DNS and validate every resolved address
    -> Fetch the requested public document with controlled redirects
    -> Fetch up to two same-origin HTML pages from ordinary links
    -> Parse static HTML without executing JavaScript
    -> Analyze headers, cookies, trackers, and third parties
    -> Check TLS, DNS email-auth, DNSSEC, CAA, security.txt, supply-chain, and page hygiene
    -> Return component scores, findings, limitations, and recommendations
  <- Structured JSON report

Recent scan summaries stay in localStorage.
```

## API

`POST /api/scan`

```json
{ "url": "https://example.com" }
```

The response includes normalized and final URLs, timing, HTTPS status, score components, header findings, cookie findings, trackers, third-party domains, resources, recommendations, and explicit limitations.

## Scoring model

The final score is a weighted bounded snapshot:

- Header posture: 35%
- Cookie hygiene: 20%
- Third-party exposure: 25%
- Advanced posture: 20%

Cookie findings are contextual. For example, a likely session or security cookie missing `HttpOnly` is weighted more heavily than a client-readable preference cookie. Optional advanced headers such as COOP, CORP, and COEP are included as evidence but are not treated like missing core controls for every site.

Advanced posture covers TLS certificate expiration, DNS email-auth signals, DNSSEC delegation, CAA records, security.txt, public discovery files, static mixed content, Subresource Integrity coverage, reverse-tabnabbing, third-party form actions, and inline script risk patterns.

Every result is labeled limited-confidence because TraceLattice does not execute JavaScript, broadly crawl a site, authenticate, submit forms, inspect runtime network traffic, or test exploitability.

## Security concepts demonstrated

- SSRF prevention
- DNS and IP range validation
- Redirect-by-redirect trust checks
- HTTP security headers
- Content Security Policy
- HSTS
- Secure cookie attributes
- SameSite and HttpOnly cookie handling
- Static tracker detection
- TLS certificate posture
- SPF, DMARC, MX, and CAA DNS posture
- DNSSEC, MTA-STS, and TLS-RPT posture
- security.txt vulnerability disclosure checks
- Subresource Integrity review
- Mixed-content, form-action, and reverse-tabnabbing review
- Static client-side XSS sink pattern detection
- Third-party JavaScript and supply-chain exposure
- Defensive risk scoring
- Secure serverless API design

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Quality checks:

```bash
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

## Deployment

The project is deployed on Vercel as a Next.js application. No database, queue, cron job, or paid API is required for the current version.

```bash
npx vercel
npx vercel --prod
```

## Limitations

TraceLattice is intentionally scoped:

- It scans one public origin at a time.
- It fetches the requested page and at most two additional same-origin HTML pages.
- It does not execute target JavaScript.
- It does not broadly crawl a site or execute referenced scripts, images, or iframes.
- It may miss dynamic, authenticated, region-specific, or consent-gated behavior.
- It does not prove that a site is secure, insecure, compliant, malicious, or compromised.
- It compares observed static exposure, not the overall security maturity of an organization.

## Future improvements

- Versioned tracker pattern sources
- Shareable signed report snapshots
- Optional browser-based runtime mode
- CSP directive visualization
- Accessibility and visual regression tests
- Distributed rate limiting for production traffic

## Keywords

Cybersecurity, Web Security, Privacy Engineering, HTTP Security Headers, Content Security Policy, HSTS, Secure Cookies, SameSite, HttpOnly, Tracker Detection, Third-Party JavaScript, Risk Scoring, TypeScript, Next.js, React, Tailwind CSS, Serverless Functions, Vercel, SSRF Protection, Secure Coding, Data Privacy, OWASP, Threat Modeling.

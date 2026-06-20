# TraceLattice

TraceLattice is a defensive web security posture scanner for public websites. It combines a hosted passive scanner with a local Playwright runtime scanner for JavaScript-loaded requests, trackers, cookies, browser storage, and WebSockets.

[Live Demo](https://tracelattice.vercel.app)

![TraceLattice report interface](docs/tracelattice-report.png)

## Features

- Scans a public origin and up to two same-origin HTML pages
- Evaluates CSP, HSTS, frame protection, MIME sniffing, referrer policy, permissions policy, and cross-origin controls
- Reviews `Secure`, `HttpOnly`, and `SameSite` cookie attributes without retaining cookie values
- Identifies third-party domains, scripts, trackers, forms, mixed content, and supply-chain exposure
- Checks TLS certificates, SPF, DMARC, MX, CAA, DNSSEC, MTA-STS, TLS-RPT, and `security.txt`
- Produces deterministic component scores with visible deductions and weighted calculations
- Supports JSON export, summary copy, side-by-side comparison, and browser-local scan history
- Includes responsive loading, cancellation, timeout, validation, rate-limit, and failure states
- Runs an optional local Chromium scan that opens its private runtime report in the web interface

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Node.js
- Tailwind CSS
- Vitest
- Playwright
- Vercel Functions

## Security Engineering

TraceLattice treats every submitted URL and redirect as untrusted.

- Accepts only public HTTP and HTTPS origins on standard ports
- Rejects embedded credentials, localhost, internal hostnames, and unsafe protocols
- Resolves and validates IPv4 and IPv6 addresses before requests
- Blocks private, reserved, loopback, link-local, multicast, carrier-grade NAT, and cloud metadata ranges
- Revalidates every redirect destination
- Limits redirects, execution time, response size, pages, and parsed resources
- Keeps fetched HTML in memory only and returns user-safe API errors

## Architecture

```text
Browser
  -> POST /api/scan
  -> Normalize and validate target
  -> Resolve DNS and block unsafe destinations
  -> Fetch with controlled redirects
  -> Parse bounded static HTML
  -> Analyze headers, cookies, resources, TLS, and DNS
  -> Calculate deterministic scores and recommendations
  -> Return a typed ScanReport

Local CLI
  -> Launch isolated Chromium
  -> Validate every HTTP/S destination
  -> Observe runtime network and browser state
  -> Save JSON and open /deep-scan with a compressed URL fragment
```

The final score is calculated from four components:

```text
round(
  headers  * 0.35 +
  cookies  * 0.20 +
  exposure * 0.25 +
  advanced * 0.20
)
```

Each component begins at 100 and receives capped deductions for observed findings. The report displays the component values, deductions, evidence, and final arithmetic.

## Local Development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Runtime Scan

```bash
npm run deep-scan -- https://example.com
```

The command uses installed Chrome when available. To install Playwright Chromium:

```bash
npm run deep-scan:install
```

Every scan writes a JSON report. Ordinary reports are compressed into the URL fragment and opened at `/deep-scan`; URL fragments are not sent to the web server. Larger reports can be imported from the generated JSON file.

## Testing

```bash
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

The test suite covers URL validation, private IP blocking, header analysis, cookie analysis, tracker detection, third-party extraction, scoring behavior, report validation, and demo-score consistency.

## Limitations

- Static analysis only; target JavaScript is not executed
- No authentication, form submission, exploitation, or broad crawling
- Runtime, consent-gated, authenticated, and region-specific behavior may not be visible
- The local runtime scan observes one page load and a bounded settling window; it does not click consent dialogs or authenticate
- Scores are evidence-based heuristics, not compliance certifications or vulnerability assessments
- DNS validation does not provide connection-time IP pinning against DNS rebinding

Additional safeguards are documented in [SECURITY_ETHICS.md](SECURITY_ETHICS.md) and [COST_SAFETY.md](COST_SAFETY.md).

## License

[MIT](LICENSE)

# Security and ethics

TraceLattice is defensive-use software for examining bounded public-origin metadata.

It does not perform exploitation, vulnerability attacks, brute force, payload testing, bypass attempts, credential capture, login automation, private-system scanning, or full-site crawling.

## SSRF controls

- only HTTP and HTTPS are accepted;
- embedded credentials and non-standard ports are rejected;
- localhost, internal suffixes, private, reserved, link-local, multicast, and cloud metadata ranges are blocked;
- hostnames require a public suffix where practical;
- DNS A and AAAA records are checked before requests;
- each redirect destination is independently validated;
- redirects, time, extra same-origin HTML requests, hosted-browser waits, and response body size are bounded;
- internal error details and stack traces are not returned.

DNS validation reduces SSRF risk but a production-grade scanner with higher stakes should additionally pin the validated IP at connection time to mitigate DNS rebinding.

## Enhanced scan

Enhanced scan is optional. When enabled and configured, TraceLattice validates the public URL first, then asks Cloudflare Browser Rendering to load the page once and return rendered HTML. It does not send visitor cookies, authenticate, click, submit forms, bypass consent screens, or store rendered page bodies.

## Data handling

Cookie values are never returned or stored. HTML is held only in memory for the duration of the request and is not persisted. Browser history stores summaries, not page content.

## Accuracy

Standard scan may miss resources loaded after JavaScript execution. Enhanced scan can reveal JavaScript-rendered DOM and resource references, but it may still miss broad crawling, user interaction, consent-gated flows, geography checks, authentication, delayed initialization, and full runtime network behavior. Findings and scores are educational heuristics, not proof of security, maliciousness, GDPR/CCPA compliance, or legal conclusions.

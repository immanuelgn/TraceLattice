# Security and ethics

TraceLattice is defensive-use software for examining bounded public-origin metadata.

The optional local Playwright scanner executes target JavaScript only on the user's computer. It blocks service workers, validates every outgoing HTTP/S hostname, rejects private and reserved destinations, caps requests, and does not collect cookie values, storage values, request bodies, response bodies, or authorization headers.

It does not perform exploitation, vulnerability attacks, brute force, payload testing, bypass attempts, credential capture, login automation, private-system scanning, full-site crawling, or JavaScript execution.

## SSRF controls

- only HTTP and HTTPS are accepted;
- embedded credentials and non-standard ports are rejected;
- localhost, internal suffixes, private, reserved, link-local, multicast, and cloud metadata ranges are blocked;
- hostnames require a public suffix where practical;
- DNS A and AAAA records are checked before requests;
- each redirect destination is independently validated;
- redirects, time, extra same-origin HTML requests, and response body size are bounded;
- internal error details and stack traces are not returned.

DNS validation reduces SSRF risk but a production-grade scanner with higher stakes should additionally pin the validated IP at connection time to mitigate DNS rebinding.

## Data handling

Cookie values are never returned or stored. HTML is held only in memory for the duration of the request and is not persisted. Browser history stores summaries, not page content.

## Accuracy

TraceLattice may miss resources loaded after JavaScript execution, broad crawling, user interaction, consent, geography checks, authentication, or delayed initialization. It inventories static script/link attributes, but it does not run target code. Findings and scores are educational heuristics, not proof of security, maliciousness, GDPR/CCPA compliance, or legal conclusions.

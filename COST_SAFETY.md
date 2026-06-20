# Cost and operational safety

TraceLattice is intentionally designed for a $0 portfolio MVP on Vercel Hobby:

- no database, paid API, authentication provider, queue, or object storage;
- no Puppeteer, Playwright, browser automation, or target JavaScript execution;
- one requested-page fetch plus at most two additional same-origin HTML fetches per scan;
- no broad crawling, asset fetching, background jobs, cron tasks, or scheduled monitoring;
- browser `localStorage` for at most 12 compact scan summaries;
- nine-second timeout per HTML fetch, three redirects per fetch, and a 1.5 MB response ceiling;
- simple in-memory abuse limiting at 10 scans per 10 minutes per observed client IP.

The in-memory limiter is per serverless instance and is not enterprise-grade distributed protection. For a public production service, add platform-level rate controls and spending alerts. Keep Vercel usage notifications enabled and do not add metered services without explicit budgets.

The optional Playwright deep scan runs on the user's computer and does not consume Vercel browser-compute resources. Its JSON report is handed to the web interface through a URL fragment or manual file import; the report is not uploaded to a TraceLattice API.

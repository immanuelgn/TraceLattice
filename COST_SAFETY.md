# Cost and operational safety

TraceLattice is designed to stay free-tier friendly on Vercel Hobby:

- no database, authentication provider, queue, object storage, background jobs, cron tasks, or scheduled monitoring;
- Standard scan uses one requested-page fetch plus at most two additional same-origin HTML fetches;
- Enhanced scan is optional and disabled unless Cloudflare Browser Rendering credentials are configured;
- Enhanced scan sends only the validated public URL to the hosted browser provider and keeps the returned HTML in memory only;
- no broad crawling, asset fetching, login automation, clicking, form submission, consent bypass, or retained page bodies;
- browser `localStorage` stores at most 12 compact scan summaries;
- nine-second timeout per HTML fetch, 18-second hosted-browser timeout, three redirects per fetch, and a 1.5 MB response ceiling;
- simple in-memory abuse limiting at 10 scans per 10 minutes per observed client IP.

The in-memory limiter is per serverless instance and is not enterprise-grade distributed protection. Keep Vercel and Cloudflare usage notifications enabled, monitor free-tier quotas, and do not add metered services without explicit budgets.

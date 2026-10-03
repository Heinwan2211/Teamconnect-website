# DISC assessment — Cloudflare setup (one time)

This adds the DISC assessment to the Team Connect site. It's a small Worker
in front of the existing static pages, plus a Cloudflare D1 database. None of
the existing pages change.

New files:
- `src/index.js` — the Worker (routes, scoring, auth, APIs)
- `src/pages.js` — the branded pages (assessment, dashboard, report, login)
- `src/scoring.js` — the 24 DISC boxes + scoring
- `schema.sql` — the database tables
- `wrangler.jsonc` — updated to run the Worker + bind D1
- `.assetsignore`, `.dev.vars.example` — updated

## What you run (once)

From the repo folder, in Terminal:

```bash
npm install
npx wrangler login        # opens a browser to authorise, if not already
```

### 1. Create the database
```bash
npx wrangler d1 create teamconnect-disc
```
It prints a block containing a `database_id`. **Copy that id** and paste it
into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.

### 2. Create the tables
```bash
npx wrangler d1 execute teamconnect-disc --remote --file=schema.sql
```

### 3. Set the three secrets
```bash
npx wrangler secret put DASHBOARD_PASSWORD   # the password you'll use to sign in
npx wrangler secret put SESSION_SECRET       # paste any long random string
npx wrangler secret put CLAUDE_API_KEY       # any long random string; share it with Claude to read results
```
(For each, it asks you to type/paste the value, then press Enter.)

### 4. Deploy
```bash
npm run deploy
```

## Test it
1. Go to `https://teamconnect-website.heinwan.workers.dev/dashboard` → sign in with your password.
2. Add a company, then create an individual link. Copy it.
3. Open that link in a **private/incognito window** (so you're not signed in), fill in the 24 boxes, submit.
4. Back on the dashboard, refresh — the person shows **done** with Graph 1 / Graph 2, and "Open PDF report" gives a printable branded report (browser → Save as PDF).

## How it works day to day
- **Dashboard** (`/dashboard`): add companies, create links (individual or shared company link), watch results land, open per-person PDF reports, see the team overlay.
- **Client**: opens their link, no login, answers, done. They never see scores.
- **Claude**: with the `CLAUDE_API_KEY`, Claude can read `/api/results` to summarise, compare across companies, and generate richer branded PDFs on request.

## Notes
- Changing the code later still needs `npm run deploy` to go live (the known
  Paperclip gotcha). Normal use — creating links, viewing results — needs no deploy.
- Data lives in your Cloudflare account (D1). You own it. A short POPIA
  consent line on the assessment intro can be added — ask Claude.
- The custom domain (teamconnect.co.za) pointing is separate; until it's
  pointed, the `*.workers.dev` URL above is live and works for links.

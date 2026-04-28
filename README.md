# Team Connect Website

Corporate team building website for Team Connect, based in Tulbagh, Western Cape, South Africa.

**Live URL:** https://teamconnect-website.heinwan.workers.dev

---

## Deployment

This site is deployed as a static site on **Cloudflare Workers** using Wrangler.

### Prerequisites

- Node.js 18+
- npm
- A Cloudflare account with access to the `teamconnect-website` Worker

### Install dependencies

```bash
npm install
```

### Authentication

You need a Cloudflare API token to deploy. Two options:

**Option A — Interactive login (recommended for local use):**
```bash
npx wrangler login
```

**Option B — API token via environment variable:**
1. Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token
2. Use the **"Edit Cloudflare Workers"** template
3. Copy the generated token
4. Create a `.dev.vars` file at the repo root (already excluded from git):

```
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

See `.dev.vars.example` for the expected variable names.

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Run locally with Wrangler dev server |
| `npm run deploy` | Deploy to production |
| `npm run deploy:preview` | Deploy to preview environment |

### First-time deploy checklist

1. Run `npm install` to install wrangler
2. Authenticate with `npx wrangler login` or set up `.dev.vars`
3. Run `npm run deploy` to push live
4. Verify at https://teamconnect-website.heinwan.workers.dev

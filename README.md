# Money Tracker — מעקב כסף

[![CI](https://github.com/yovelamirtech/money-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/yovelamirtech/money-tracker/actions/workflows/ci.yml)

A simple, mobile-first web app (Hebrew, RTL) for tracking income and expenses.
Add what came in and what went out, and see each month's income, expenses and balance.
Everything is stored locally in the browser. No backend, no login.

**Live:** https://yovelamirtech.github.io/money-tracker/

<!-- TODO: add a screenshot: ![screenshot](docs/screenshot.png) -->

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

## Test, lint, build

```bash
npm test          # unit + component tests (Vitest)
npm run test:watch
npm run lint      # ESLint
npm run build     # type-check + production build
```

## How it works

- Money is stored as **integer agorot** (₪12.50 → `1250`), never floats.
- Business logic is in pure functions in `src/lib/` with tests next to each file.
- `src/lib/storage.ts` is the only code that touches `localStorage` (key `money-tracker:v1`).

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request: install → lint → test → build.
A push to `main` that passes all checks deploys to GitHub Pages automatically.

One-time GitHub setup: **Settings → Pages → Source: GitHub Actions**.

See [money-tracker-plan.md](money-tracker-plan.md) for the full plan and progress.

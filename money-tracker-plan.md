# Money Tracker — Project Plan

A simple, mobile-first web app for tracking income and expenses: what came in, what went out, and where the money goes each month.

---

## ⚠️ Read first — how to work with this file (every agent, every session)

1. **Read this whole file before writing any code.**
2. **Work in order.** Phase 0 and Phase 1 are the **MVP for a programming class on CI/CD**. They must stay small and simple and be fully tested. **Do not start Phase 2 or later until the owner explicitly says so.**
3. When you **start** a task, set its Status to 🟡.
4. When you **finish** a task, set it to ✅ and fill in "Notes / what's left": what you did, any decisions you made, anything that is still missing.
5. If you only partly finish, keep it 🟡 and write **exactly** what remains, so the next agent can continue without guessing.
6. A task is ✅ **only if** `npm run lint`, `npm test` and `npm run build` all pass.
7. **Before ending every work session: update the plan table and add a line to the Work Log at the bottom. This is mandatory.**
8. If you change a decision in this file (stack, data model, rules), update the relevant section too, not only the table.

**Status legend:** ⬜ not started · 🟡 in progress · ✅ done · ⏸️ blocked (explain why in notes)

---

## Product

The user adds income and expenses (amount, category, date, optional note) and sees, for each month:
- total income, total expenses, and the balance
- the list of transactions
- (later) where the money goes by category, budgets and trends

Everything is stored locally in the browser. No backend, no login. Currency: ₪ (ILS).

---

## Tech stack

- React + TypeScript, built with Vite
- Tailwind CSS (current stable version, via the official Vite plugin)
- Vitest + jsdom
- React Testing Library + `@testing-library/user-event` + `@testing-library/jest-dom`
- ESLint (flat config; create-vite now defaults to oxlint, we switched back to ESLint)
- localStorage for persistence
- GitHub Actions for CI, GitHub Pages for deploy

Install current stable versions and check the official docs for setup. Don't rely on memory for config syntax.

**UI:** Hebrew, right-to-left (`<html lang="he" dir="rtl">`), mobile-first, large touch targets.

---

## Engineering principles

- **Money is stored as integer agorot** (₪12.50 → `1250`). Never use floats for money. This is a core rule and a good testing lesson.
- **Business logic lives in pure functions in `src/lib/`.** No React and no localStorage in them, so they are trivial to test.
- **Storage is behind one small module** (`src/lib/storage.ts`) so it can be swapped later.
- **Simple over clever.** No state-management libraries in the MVP. Use `useState` / `useReducer`, and context only if really needed.
- Every pure function has unit tests. Every main user flow has at least one component test.
- Tests sit next to the code (`money.ts` + `money.test.ts`).

### Suggested structure

```
src/
  lib/
    types.ts
    money.ts            + money.test.ts       (parse / format)
    summary.ts          + summary.test.ts     (filter by month, totals, by category)
    storage.ts          + storage.test.ts
  data/
    defaultCategories.ts
  components/
  screens/
    MonthScreen.tsx
    AddTransactionScreen.tsx
  App.tsx
.github/workflows/ci.yml
```

---

## Data model (starting point)

```ts
type TransactionType = 'income' | 'expense';

interface Category {
  id: string;
  name: string;            // Hebrew display name
  type: TransactionType;
}

interface Transaction {
  id: string;
  type: TransactionType;
  amountAgorot: number;    // positive integer
  categoryId: string;
  date: string;            // ISO date, YYYY-MM-DD
  note?: string;
  createdAt: string;       // ISO timestamp
}
```

Store everything under one versioned localStorage key, e.g. `money-tracker:v1`.

### Default categories (seed data)

- **Income:** משכורת, אחר
- **Expense:** אוכל, דיור, חשבונות, תחבורה, מנויים, בילויים, בריאות, קניות, אחר

---

## Core logic (MVP)

**`money.ts`**
- `parseAmount(input: string): number | null` turns user input into agorot. `"12.5"` → `1250`, `"12.50"` → `1250`, `"1,200"` → `120000`. Empty, negative, zero, non-numeric or more than 2 decimals → `null`.
- `formatILS(agorot: number): string` returns a display string such as `₪1,200.00`. Use `Intl.NumberFormat`.

**`summary.ts`**
- `filterByMonth(transactions, 'YYYY-MM')`
- `summarize(transactions)` → `{ income, expense, balance }` in agorot
- `groupByCategory(transactions)` → total per category, sorted descending

These are the heart of the testing lesson. Cover them well: empty list, only income, only expenses, negative balance, month boundaries (last day of month, first day of next), rounding and float traps (`0.1 + 0.2`).

---

## Class demo idea (CI/CD)

1. Show green CI and the live GitHub Pages site.
2. On a branch, "simplify" `parseAmount` to `parseFloat(input) * 100` without rounding, push, and open a PR. The float tests fail, CI goes red, and the PR shows a failing check.
3. Fix it, push, and CI goes green. Merge, and the site redeploys automatically.

---

## Plan

### Phase 0 — Setup (class)

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 0.1 | Scaffold Vite + React + TS | `npm run dev` shows the app | ✅ | create-vite 9 (React 19, Vite 8, TS 6). Demo files removed. Checked in browser. |
| 0.2 | Add Tailwind, set Hebrew + RTL | a Tailwind class visibly works; `dir="rtl"` on `<html>` | ✅ | Tailwind 4 via `@tailwindcss/vite`; `src/index.css` is just `@import "tailwindcss"`. |
| 0.3 | Set up Vitest + jsdom + RTL + jest-dom | one sample component test passes with `npm test` | ✅ | Vitest 5, config in `vite.config.ts`; `src/test/setup.ts` loads jest-dom and runs `cleanup()` + `localStorage.clear()` after each test. Tests import from `vitest` explicitly (no globals). |
| 0.4 | ESLint and npm scripts `lint`, `test`, `build` | all three scripts run and pass | ✅ | create-vite now ships oxlint; replaced it with ESLint 10 flat config (`eslint.config.js`: js + typescript-eslint + react-hooks + react-refresh). Also `test:watch`. |
| 0.5 | GitHub Actions CI (`.github/workflows/ci.yml`) | on push and PR: install → lint → test → build; a failing test makes the run red | 🟡 | Workflow written (`check` job, Node 22, actions v7). **Left:** the folder is not a git repo yet; push to GitHub and see it run green/red. |
| 0.6 | Deploy to GitHub Pages | push to `main` deploys automatically; Vite `base` set to the repo name; live URL in README | 🟡 | `deploy` job in `ci.yml`, runs only after `check` passes on a push to `main`. `base` comes from `BASE_PATH`, which CI sets to `/<repo-name>/` (local dev stays `/`). **Left:** create the repo, set Settings → Pages → Source: GitHub Actions, put the live URL in README. |

### Phase 1 — MVP (class)

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 1.1 | Types + default categories | `types.ts` and `defaultCategories.ts` exist with the seed data above | ✅ | Added `MonthKey` type alias. Category ids are English slugs (`food`, `other-expense`, ...). |
| 1.2 | `money.ts`: `parseAmount`, `formatILS` | all rules above implemented; unit tests cover every case listed | ✅ | Regex + integer math, no floats. Commas only as real thousands separators (`1,20` → null). `12.` → null. `formatILS` uses `en-US` locale to get exactly `₪1,200.00`. Float-trap tests (`0.29`, `1.15`) make the class demo fail. |
| 1.3 | `summary.ts`: `filterByMonth`, `summarize`, `groupByCategory` | implemented and fully unit-tested, including month boundaries | ✅ | Also `sortNewestFirst`. Extra helper module `month.ts` (todayISO, toMonthKey, addMonths, labels) with tests, and `id.ts` (createId). |
| 1.4 | `storage.ts`: load and save transactions | tests: save → load round-trip; empty storage returns `[]`; corrupt JSON returns `[]` without crashing | ✅ | Key `money-tracker:v1`, shape `{ transactions: [] }`. Wrong-shape JSON also returns `[]`. Save errors are swallowed. |
| 1.5 | Add transaction form | income/expense toggle, amount, category (filtered by type), date (defaults to today), note; invalid amount shows an error and is not saved | ✅ | `AddTransactionScreen`. After saving, the app jumps to the month of the saved transaction. Tested in `AddTransactionScreen.test.tsx`. |
| 1.6 | Month screen | summary cards (income, expenses, balance); transaction list newest first; previous/next month navigation | ✅ | `MonthScreen` + `MonthNavigator`, `SummaryCards`, `TransactionList`. Screen switching is a simple `useState` in `App` (no router). |
| 1.7 | Delete transaction | with confirmation; summary updates | ✅ | Uses `window.confirm`. |
| 1.8 | Component test for the main flow | add expense → appears in list → totals update → delete → totals update | ✅ | `src/App.test.tsx`, plus cancel-delete and month navigation tests. |
| 1.9 | README | what it is, screenshot, live link, how to run and test, CI status badge | 🟡 | Written. **Left:** replace `OWNER/REPO` in the badge and live link, add a screenshot. |

**🛑 Stop here until the owner says to continue.**

### Phase 2 — A genuinely useful app

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 2.1 | Edit transaction | all fields editable, same validation as add | ⬜ | |
| 2.2 | Manage categories | add, rename, delete (transactions move to "אחר"); optional icon or color | ⬜ | |
| 2.3 | Search and filter | by text in note, category, type, amount range | ⬜ | |
| 2.4 | Recurring transactions | monthly items (rent, salary, subscriptions) generated automatically for each new month, no duplicates; generation logic unit-tested | ⬜ | |
| 2.5 | Quick add | fast entry from the main screen; remembers the last-used category | ⬜ | |

### Phase 3 — Insights and budgets

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 3.1 | Spending by category chart | for the selected month | ⬜ | |
| 3.2 | Monthly trend | income vs expenses over the last 6–12 months | ⬜ | |
| 3.3 | Budgets per category | monthly limit; progress bar; warning when near or over; tested | ⬜ | |
| 3.4 | Savings rate | % of income saved per month | ⬜ | |
| 3.5 | Month-over-month comparison | biggest changes by category highlighted | ⬜ | |

### Phase 4 — Quality and polish

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 4.1 | PWA | installable on iPhone home screen; works offline | ⬜ | |
| 4.2 | Backup | export and import all data as JSON; import validates the data | ⬜ | |
| 4.3 | CSV export | transactions for a chosen range | ⬜ | |
| 4.4 | Dark mode | follows the system setting plus a manual toggle | ⬜ | |
| 4.5 | Accessibility pass | labels, focus states, contrast, keyboard navigation | ⬜ | |
| 4.6 | E2E tests (Playwright) in CI | main flow tested end-to-end on every PR | ⬜ | |
| 4.7 | Coverage threshold in CI | e.g. ≥ 80% on `src/lib`; CI fails below it | ⬜ | |
| 4.8 | English UI (i18n) | language switch; LTR handled correctly | ⬜ | |

### Phase 5 — Optional, only if the owner asks

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 5.1 | Sync across devices | backend chosen with the owner (e.g. Supabase or Firebase); storage module swapped without touching the logic | ⬜ | |
| 5.2 | Bank / credit card CSV import | map columns, de-duplicate, auto-suggest categories | ⬜ | |

---

## Work Log

Add one line at the end of every session.

| Date | Agent / session | What was done | Next step |
|------|-----------------|---------------|-----------|
| 2026-10-23 | Claude Code (Opus 5.5) | Phase 0 + 1 built. lint, 77 tests and build pass; checked in browser at mobile size. | Owner reviews names; create GitHub repo and push (finishes 0.5, 0.6, 1.9). |

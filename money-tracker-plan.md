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
- `vite-plugin-pwa` (Workbox) for the installable/offline app (Phase 4)
- Playwright + `@axe-core/playwright` for end-to-end and accessibility tests, `@vitest/coverage-v8` for coverage (Phase 4)

Install current stable versions and check the official docs for setup. Don't rely on memory for config syntax.

**UI:** Hebrew, right-to-left (`<html lang="he" dir="rtl">`), mobile-first, large touch targets. English (LTR) is available as a setting (4.8).

**Colors:** components use semantic Tailwind tokens defined in `src/index.css` (`bg-card`, `text-muted`, `text-income`, ...), never raw palette colors, so dark mode only redefines the variables under `.dark`.

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

**Phase 2–4 additions** (all optional fields, so old `{ transactions }` data still loads; see `src/lib/types.ts`):

```ts
interface Category { /* … */ color?: CategoryColor; icon?: string }   // color = a name from src/lib/colors.ts
interface Transaction { /* … */ recurringId?: string }                 // set when created by a recurring rule

interface RecurringRule {
  id: string; type: TransactionType; amountAgorot: number; categoryId: string
  dayOfMonth: number;            // 1–31, clamped to shorter months
  note?: string
  startMonth: MonthKey; lastGeneratedMonth?: MonthKey; active: boolean; createdAt: string
}
interface Budget { categoryId: string; limitAgorot: number }          // expense categories only
interface Settings { theme: 'system' | 'light' | 'dark'; language: 'he' | 'en'; lastCategoryId: { income?: string; expense?: string } }

// stored as: { transactions, categories, recurring, budgets, settings }
```

Rules:
- The two "אחר" categories (`other-income`, `other-expense`) can't be deleted. Deleting another category moves its transactions and recurring rules to "אחר" of the same type and removes its budget.
- Recurring rules generate one transaction per month up to the current month, on app start and when the app comes back to the foreground. A month is never generated twice (`lastGeneratedMonth` + a check for an existing transaction), so a deleted generated transaction doesn't come back. Resuming a paused rule continues from the current month without filling the paused months.
- Budget levels: "near" from 80% of the limit, "over" only when spending is above the limit (integer math).
- Loading from localStorage is lenient (drops broken items, keeps the rest). Importing a backup is strict (any invalid item, duplicate id or unknown category rejects the whole file).

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
| 0.5 | GitHub Actions CI (`.github/workflows/ci.yml`) | on push and PR: install → lint → test → build; a failing test makes the run red | ✅ | `check` job: Node 22, `npm ci` → lint → test → build, actions v7. First run on GitHub was green. A failing test fails `npm test`, which turns the run red; that path hasn't been tried on GitHub yet and will be shown in the class demo. |
| 0.6 | Deploy to GitHub Pages | push to `main` deploys automatically; Vite `base` set to the repo name; live URL in README | ✅ | `deploy` job in `ci.yml`, runs only after `check` passes on a push to `main`. `base` comes from `BASE_PATH`, which CI sets to `/<repo-name>/` (local dev stays `/`). Pages source = GitHub Actions. Live: https://yovelamirtech.github.io/money-tracker/ |

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
| 1.9 | README | what it is, screenshot, live link, how to run and test, CI status badge | ✅ | Badge, live link, screenshot (`docs/screenshot.jpg`), run/test instructions. |

**🛑 Stop here until the owner says to continue.** → The owner approved building the rest of the plan on 2026-11-01.

### Phase 2 — A genuinely useful app

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 2.1 | Edit transaction | all fields editable, same validation as add | ✅ | Tap a transaction (month list or search results) to open the same form, pre-filled (`TransactionFormScreen`, renamed from `AddTransactionScreen`). Keeps `id`, `createdAt` and `recurringId`. Delete stays on the list. |
| 2.2 | Manage categories | add, rename, delete (transactions move to "אחר"); optional icon or color | ✅ | Settings → קטגוריות. Name must be unique per type. Emoji icon + one of 9 colors (`src/lib/colors.ts`), shown as a badge. Logic in `src/lib/categories.ts`. |
| 2.3 | Search and filter | by text in note, category, type, amount range | ✅ | Search tab, across all months, live results with totals. `src/lib/filter.ts`. Invalid amount bounds show an error and are ignored. |
| 2.4 | Recurring transactions | monthly items (rent, salary, subscriptions) generated automatically for each new month, no duplicates; generation logic unit-tested | ✅ | "חוזר כל חודש" checkbox when adding. Settings → תנועות קבועות to pause/resume/delete. `src/lib/recurring.ts` (rules above). Editing a rule's amount isn't supported yet: delete and re-create it. |
| 2.5 | Quick add | fast entry from the main screen; remembers the last-used category | ✅ | Card on the month screen: type, category, amount, dated today. Last category per type is saved in settings and also used as the full form's default. |

### Phase 3 — Insights and budgets

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 3.1 | Spending by category chart | for the selected month | ✅ | Insights tab. Horizontal bars (HTML/CSS, no chart library), amount + share at each bar, "show as table" view. |
| 3.2 | Monthly trend | income vs expenses over the last 6–12 months | ✅ | SVG paired columns with a 6/12 month toggle, tap a month for its numbers, table view. Colors checked for color-blind safety. Time runs left→right in both languages. |
| 3.3 | Budgets per category | monthly limit; progress bar; warning when near or over; tested | ✅ | Settings → תקציבים (or from Insights). Progress bars on Insights; a warning banner on the month screen. Status always has icon + text. `src/lib/budget.ts`. |
| 3.4 | Savings rate | % of income saved per month | ✅ | `savingsRate` in `summary.ts` (whole %, toward zero, negative when overspending, `—` without income). On the month summary and Insights. |
| 3.5 | Month-over-month comparison | biggest changes by category highlighted | ✅ | Insights: top 5 expense changes vs the previous month, biggest one highlighted. `compareExpensesByCategory` in `summary.ts`. |

### Phase 4 — Quality and polish

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 4.1 | PWA | installable on iPhone home screen; works offline | ✅ | `vite-plugin-pwa` (auto-update service worker, manifest), Apple meta tags + `apple-touch-icon.png`. New ₪ icon (`public/favicon.svg`; PNGs rendered from it). Offline tested in `e2e/offline.spec.ts`. Not yet tried on a real iPhone. |
| 4.2 | Backup | export and import all data as JSON; import validates the data | ✅ | Settings → נתונים. File format `{ format, version, exportedAt, data }` (`src/lib/backup.ts`). Import asks for confirmation and replaces everything. |
| 4.3 | CSV export | transactions for a chosen range | ✅ | Settings → from/to dates (default: current month). UTF-8 with BOM for Excel, formula-injection safe cells (`src/lib/csv.ts`). |
| 4.4 | Dark mode | follows the system setting plus a manual toggle | ✅ | System / light / dark in Settings. `.dark` class on `<html>` (`useTheme`), plus a small script in `index.html` that applies the saved theme before first paint. |
| 4.5 | Accessibility pass | labels, focus states, contrast, keyboard navigation | ✅ | Focus rings on every control, focus moves to the screen heading on navigation, `aria-current` in the nav, meters/alerts/live regions. axe WCAG 2.1 AA scan of every screen in light and dark runs in E2E (`e2e/a11y.spec.ts`), plus a keyboard-only flow. |
| 4.6 | E2E tests (Playwright) in CI | main flow tested end-to-end on every PR | ✅ | `e2e/` against the production build on a Pixel 7–sized Chromium. New `e2e` CI job; deploy waits for it. Report uploaded on failure. `npm run test:e2e`. |
| 4.7 | Coverage threshold in CI | e.g. ≥ 80% on `src/lib`; CI fails below it | ✅ | `npm run test:coverage` (v8) with 80% thresholds on `src/lib`, used in CI instead of `npm test`. Currently ~99%. |
| 4.8 | English UI (i18n) | language switch; LTR handled correctly | ✅ | `src/i18n/` (typed dictionaries, small context, no library). Sets `lang`/`dir` on `<html>`; arrows flip; default category names are translated until renamed. |

### Phase 5 — Optional, only if the owner asks

| # | Task | Done when | Status | Notes / what's left |
|---|------|-----------|--------|---------------------|
| 5.1 | Sync across devices | backend chosen with the owner (e.g. Supabase or Firebase); storage module swapped without touching the logic | ⏸️ | Needs the owner to choose a backend and create an account/project. Storage is still one module (`storage.ts`, `loadData`/`saveData`). Backup export/import (4.2) can move data between devices meanwhile. |
| 5.2 | Bank / credit card CSV import | map columns, de-duplicate, auto-suggest categories | ⏸️ | Optional, waits for the owner. Needs sample export files from the owner's bank/card to map the columns. |

---

## Work Log

Add one line at the end of every session.

| Date | Agent / session | What was done | Next step |
|------|-----------------|---------------|-----------|
| 2026-10-23 | Claude Code (Opus 5.5) | Phase 0 + 1 built. lint, 77 tests and build pass; checked in browser at mobile size. | Owner reviews names; create GitHub repo and push (finishes 0.5, 0.6, 1.9). |
| 2026-10-23 | Claude Code (Opus 5.5) | Created public repo yovelamirtech/money-tracker, enabled Pages (Actions), pushed. CI green, site live. README finished. | Owner reviews names. Then the class demo (red PR on `parseAmount`). Phase 2 waits for the owner. |
| 2026-11-01 | Claude Code (Opus 5.5) | Owner approved the rest of the plan. Built Phases 2, 3 and 4 on branch `feat/full-app`. lint, 247 unit/component tests (src/lib coverage ~99%), build and 9 Playwright E2E tests (incl. offline + axe WCAG AA) pass. | Owner reviews the PR and tries the app on an iPhone (install to home screen). Phase 5 needs owner decisions (backend for sync, bank CSV samples). |

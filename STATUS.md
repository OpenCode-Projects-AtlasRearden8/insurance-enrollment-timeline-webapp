# STATUS — Insurance Paperwork Timeline

Last updated: 2026-10-28

## What was built

A single-file, offline web app (`index.html`) mapping the yearly insurance-paperwork calendar, per the original goal:

- **Enrollment and open-dates windows per plan type** — Marketplace (ACA) Nov 1–Jan 15, Medicare AEP Oct 15–Dec 7, Medicare Advantage OEP Jan 1–Mar 31, employer window (user-set dates), Special Enrollment Periods (60 days after a life event), Medicaid/CHIP year-round. Rendered as a 12-month calendar grid with year navigation.
- **Deadline countdown cards** — per-window status (open / upcoming / closed / set-your-dates) with plain-English countdowns including "last day" and "opens tomorrow" edge cases.
- **Document grab lists per window** — starter checklists (paycheck stubs/pay sheet, prior-plan details, ANOC, doctor/medication lists, proof-of-event documents); items can be checked off, added, removed, or reset. All persisted in localStorage.
- **Call notes** — log date, contact, phone/reference, topic, and what was said; newest first.
- **Printable "what changed" recap** — record plan/premium/effective-date changes year-round; a January banner nudges a yearly review; the Recap tab prints a one-pager (changes, call notes, checklist status, windows used) via a print stylesheet.
- **All state in localStorage** under the `iet.` prefix; no network calls, no analytics, no accounts.
- **Pure HTML/JS/CSS, zero dependencies, single file** — opens directly from `file://`.
- Framed throughout as education and admin help, never advice, with verification pointers to HealthCare.gov / Medicare.gov / state Medicaid / HR.

Project layout: `index.html` (app), `test/window-math.test.mjs` (tests), `README.md`, `LICENSE` (MIT), `.gitignore`.

Design notes: the pure date/window math is isolated in a `<script id="window-math">` block with no DOM access; the tests extract and execute that exact block from `index.html`, so the shipped code is what gets tested. All user input is HTML-escaped before rendering.

## How to run

- **App:** open `index.html` in any modern browser (double-click works; no server needed).
- **Tests:** `node --test test/window-math.test.mjs` (Node 18+, built-in runner, no packages).

## Verification results (2026-10-28)

- `node --test test/window-math.test.mjs` — **23/23 pass**, 0 failures. Covers year-spanning windows, inclusive boundaries, leap years, custom/invalid employer dates, SEP 60-day math, countdown wording, month coverage, and the January review nudge.
- Both inline script blocks pass `node --check` syntax validation.
- Headless Chrome (file://) render check — **zero console errors**; countdown cards show correct values for the run date (Oct 28, 2026): Marketplace "Opens in 4 days", Medicare AEP "40 days left", MA OEP "Opens in 65 days", employer "Set your dates", Medicaid "Open year-round".
- Headless Chrome UI smoke test (19 scripted checks driving the real DOM: view switching, saving employer dates, adding a SEP event, adding/checking checklist items, logging a call note, recording a change, recap rendering, XSS-escaping check, mark-reviewed) — **19/19 pass**.
- One real bug was found and fixed during verification: the calendar's date label read `.close.d` off a computed window instance instead of the window definition (TypeError on first render). Caught by the headless console check, fixed, re-verified.

## Known gaps

- Window dates are the common federal defaults; state marketplaces and some employers differ. The app says so in the UI, but it does not fetch or verify official dates (by design — it is offline).
- SEP handling is a simplification: one 60-day window starting at the event date. Real rules vary (some events allow 60 days before/after; Medicare SEPs differ).
- No data export/import beyond the printable recap; clearing browser data clears all app data.
- No automated end-to-end test suite is shipped (the headless-Chrome smoke test was run manually during development; reproducing it requires Chrome).
- Print layout is intentionally minimal (plain one-pager); no PDF generation beyond the browser's print dialog.
- Not tested in browsers other than Chrome; the code uses widely supported APIs (localStorage, ES5-style JS, padStart).

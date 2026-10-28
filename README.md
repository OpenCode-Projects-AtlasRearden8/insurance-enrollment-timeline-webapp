# Insurance Paperwork Timeline

A single-file, offline web app that maps the yearly insurance-paperwork calendar: which enrollment window is open, what's coming next, what documents to gather, and a printable "what changed" recap to review each January.

**Education and admin help only — never advice.** Dates and rules vary by state and plan; always confirm with HealthCare.gov, Medicare.gov, your state Medicaid office, or your HR team.

Part of the ASDALE DYNAMICS, LLC family of plain-English guides and tools, and a companion to the *Insurance Paperwork Decoded* guide.

## Quick start

1. Download `index.html`.
2. Double-click it (or drag it into any browser). It runs straight from `file://`.
3. That's it. No install, no server, no account, no internet.

Everything you type is saved in your browser's localStorage on your own device.

## What it does

- **Yearly calendar** — a 12-month grid showing when each enrollment window is open: Marketplace (ACA), Medicare Open Enrollment, Medicare Advantage Open Enrollment, your employer's window (you set the dates), Special Enrollment Periods, and Medicaid/CHIP (year-round). Move between years with the arrows.
- **Deadline countdown cards** — one card per window: open, upcoming, or closed, with a plain-English countdown ("12 days left", "Opens in 4 days", "Last day — deadline is today").
- **Document grab lists** — a starter checklist per window (paycheck stubs/pay sheet, prior-plan details, ANOC letters, doctor and medication lists, proof-of-event paperwork). Check items off, add your own, or reset to the starter list.
- **Call notes** — log who you called, when, the phone/reference number, and what they said, so the next call starts where the last one ended.
- **"What changed" recap** — record plan changes, premium changes, and effective dates as they happen. Each January the app nudges you to review, and the Recap tab prints a clean one-pager: everything that changed, your call notes from the year, checklist status, and the windows you used.
- **Special Enrollment tracking** — add a qualifying life event (move, marriage, birth, losing coverage) and get a 60-day countdown card.

## The common windows (at a glance)

| Window | Typical dates | Notes |
| --- | --- | --- |
| Marketplace (ACA) Open Enrollment | Nov 1 – Jan 15 | Most states; some differ. Enroll by Dec 15 in most states for Jan 1 coverage. |
| Medicare Open Enrollment (AEP) | Oct 15 – Dec 7 | Changes take effect Jan 1. |
| Medicare Advantage Open Enrollment | Jan 1 – Mar 31 | For people already in a Medicare Advantage plan. |
| Employer Open Enrollment | You set it | Often a few weeks in October or November. |
| Special Enrollment Period | 60 days after a qualifying event | Rules vary by event and plan type. |
| Medicaid & CHIP | Year-round | Renewals run on your state's schedule. |

These defaults are editable starting points for education — not authoritative dates.

## Privacy

- No network calls, no analytics, no accounts, no cookies beyond localStorage.
- All data (checklists, notes, changes) stays in your browser on your device.
- The app never asks for a Social Security number — keep documents like that on paper, not in apps.
- Clearing your browser data clears the app's data. Export matters (copy the recap printout) if you want a backup.

## Running the tests

The date/window math is unit-tested. The tests read `index.html`, extract the exact `<script id="window-math">` block the app ships with, and run it — so the tests always exercise the real code.

```bash
node --test test/window-math.test.mjs
```

Requires Node.js 18+ (for the built-in test runner). No packages to install — the project has zero dependencies.

Covered: year-spanning windows (Nov 1 → Jan 15), inclusive boundaries, "last day" and "opens tomorrow" edge cases, leap years, custom (employer) windows including invalid dates, 60-day SEP math, countdown wording, per-year month coverage, and the January review nudge.

## Project structure

```
index.html                    The entire app (HTML + CSS + JS, self-contained)
test/window-math.test.mjs     Unit tests for the date/window math
README.md
LICENSE                       MIT
STATUS.md                     Build status and verification notes
```

## How it works

- **Single file, zero dependencies.** All HTML, CSS, and JavaScript live in `index.html`. No build step, no framework, no CDN.
- **localStorage keys** are prefixed `iet.`: `iet.checklists`, `iet.callNotes`, `iet.changes`, `iet.employerWindow`, `iet.sepEvents`, `iet.recapLastReviewed`.
- **Pure math is isolated** in a `<script id="window-math">` block with no DOM access, which is what makes it unit-testable.
- **Printing** uses a print stylesheet: the Print recap button switches to the Recap view and prints only that section.
- **All user input is HTML-escaped** before rendering.

## Companion project

This app pairs with the *Insurance Paperwork Decoded* guide — the guide explains the paperwork in plain English; this app keeps the calendar and checklists at hand all year.

## Credits and license

Built by **Asdale Dynamics, LLC** — beginner-friendly AI education, books, and practical tools from Dylan Asdale (dylanasdale.github.io).

Released under the MIT License. See [LICENSE](LICENSE).

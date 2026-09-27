# Verification — 27 September 2026

Checked on Windows with the installed Node.js runtime and isolated Playwright Chromium contexts. Sample fixtures are illustrative. Tests do not change the user's browser records or establish farmer usability or income effects.

## Results

- Type checking, 57 unit tests across 11 files, and the production build pass.
- All 39 browser tests pass. All 18 responsive, report and reflow checks also pass after the final contrast and print-layout adjustments; the print report is checked again after the white paper-background refinement.
- Full dependency audit: zero reported vulnerabilities at verification time.
- Git whitespace checks pass.
- GitHub Actions runs type checking, unit tests, build and Chromium browser tests for `main` pushes and pull requests.

## Calculation and storage evidence

Independent fixtures verify ₱70,000 cost, 4,000 kg harvest and ₱20/kg price gives ₱80,000 value, ₱10,000 return and ₱17.50/kg break-even. With F=₱60,000, v=₱2/kg and P=₱20, returns are ₱12,000 at 4,000 kg and −₱6,000 at 3,000 kg. Tests also cover upward rounding, zero denominators, negative contribution margins, missing versus zero amounts, incomplete costs and mismatched conditions.

Tests verify actual-condition isolation, v1-to-v2 database migration without changing amounts, precise sack conversion, v1/v2 backup restoration as new copies, invalid references/fields/amounts, supported sale totals, partial receipts and overpayments. A concurrent writer test checks that exports read all tables inside a single readonly snapshot. Shared validators reject unsupported input precision rather than silently rounding it.

## Browser evidence

- Direct Overview expense entry; search across names/notes combined with category and inclusive date filters; reset and invalid date ordering.
- Expense edits, unknown/zero amounts, failed saves retaining inputs, and rapid receipt submission writing once.
- Scenario drafts protected during navigation, preset replacement, opening a new season and switching seasons; repeated edits remain protected after discard. Confirmation focus trapping, Escape, Tab and Shift+Tab are exercised.
- Independent actual harvest/price conditions, sales and receipts, report identity, detailed CSV data, print ledgers and hidden controls.
- Backup download, invalid rejection, preview, copy restoration, fresh-device restoration and reopen persistence. Reminder timing has separate unit tests.
- Real production service worker, offline reload, new expense saved offline and another offline reload.
- A second service-worker revision produces an update prompt. Unsaved work blocks updating; cancelling keeps the prompt; accepting after saving reloads while retaining the saved scenario.
- English and Filipino, light and dark themes, and all five pages at 360, 390, 768 and 1440 CSS pixels (16 combinations). Record cards, form typography, 44px save controls, keyboard theme activation and reduced motion are checked.
- 200% reflow is simulated by halving the 1440×1050 layout viewport to 720×525. Browser-chrome zoom and a physical phone were not separately verified.

## Visual evidence and limits

Desktop and phone screenshots are stored in `docs/screenshots/`. The browser suite also generates screenshots and an A4 sample report in the ignored `test-results/` directory. All four A4 sample-report pages were rendered and visually checked. Currency amounts remain on one line, summary cards stay together, and ledger headings repeat across pages. Long user-entered notes and unusual printer settings may require a separate print preview check.

Key text/background contrast pairs were calculated: light muted text ≥4.75:1, dark muted text ≥5.73:1, primary button text 7.46:1 and revised light gold labels 5.05:1. The light focus outline has at least 3.86:1 against the checked surfaces. These checks and keyboard tests are not a full WCAG audit or screen-reader evaluation.

The build produces a bundled offline app. Vite reports a roughly 509 kB minified main JavaScript chunk (156 kB gzip); further code splitting and physical low-end-device performance evaluation remain possible follow-up work.

## Delivery boundary

The source is in `D:\PaSiBudget`. The local production preview is `http://127.0.0.1:4173`; development uses port 5173. Different origins have separate storage. The approved delivery includes GitHub source publication and CI verification; it does not include website deployment, accounts, sync, native phone installation or a participant study. See `MIGRATION.md` before moving existing records.

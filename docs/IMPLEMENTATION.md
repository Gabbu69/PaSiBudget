# PaSiBudget implementation contract

Approved source: user plan, 24 September 2026. Build directly in D:\PaSiBudget.
Offline React/TypeScript/Vite app, bilingual English/Filipino, IndexedDB, original rice-grain light/dark switch, mobile/desktop navigation.

Tasks:
1. Calculation, database, backup and sample modules with independent numerical and persistence tests.
2. Budget, expense and report workflows, including sales and independent receipts, backups and validated restore.
3. Root integration, visual design, overview, frozen-baseline scenario editor, season management, PWA and browser verification.

Shared interface: src/types.ts. Financial decimals are nullable strings; unknown is never zero. Cost kinds are mutually exclusive; recorded and planned costs are never added. Cash and full-cost results are distinct. Variable costs use F+vQ. Incomplete totals do not yield complete break-even conclusions. Scenarios freeze their baseline, never edit expenses. No forecasting, crop recommendation, loan approval or external financial API.

Rulings: Work directly in the requested workspace. Core numerical/backup behavior has independent tests; UI behavior has integrated browser tests. The subsequent improvement plan authorizes publication of the verified source to Gabbu69/PaSiBudget on main. Website deployment is outside this pass.

Interface review: calculation consumes BudgetInput and produces BudgetResult; pages consume PageProps; database exposes typed Dexie tables matching WorkspaceData. Root owns types and styling, database agent owns core modules, workflow agent owns three page modules. No file ownership conflicts.

Acceptance: 70000/4000/20 fixture => 80000 value, 10000 return,17.50 break-even. F60000+2Q at P20 => return12000 at Q4000 and -6000 at Q3000. Verify missing/zero, condition mismatch, partial receipt, backup validation, offline reopen, languages, theme, mobile, reduced motion. Deliver localhost preview, startup docs and limitations.

The practical-improvements pass adds direct expense entry and combined filters, responsive record cards, separate sales/payments/unpaid totals, a planned-cash comparison and actionable completeness checklist. It introduces independent actual conditions, Dexie/backup version 2, shared validators, transactionally consistent exports, in-app edit/update protection and unified backup reminders. Reports include farm/season identity, condition and completeness indicators, full cost/expense ledgers, sales and receipts in CSV and print output. See MIGRATION.md for compatibility rules and VERIFICATION.md for executed evidence.

Source references: [WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) and [Vite PWA React update flow](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/frameworks/react.md). Primary app controls target 44px; that design target is above WCAG 2.2's 24px AA minimum and does not constitute a complete accessibility certification.

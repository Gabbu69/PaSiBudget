# PaSiBudget implementation contract

Approved source: user plan, 24 September 2026. Build directly in D:\PaSiBudget.
Offline React/TypeScript/Vite app, bilingual English/Filipino, IndexedDB, original rice-grain light/dark switch, mobile/desktop navigation.

Tasks:
1. Calculation, database, backup and sample modules with independent numerical and persistence tests.
2. Budget, expense and report workflows, including sales and independent receipts, backups and validated restore.
3. Root integration, visual design, overview, frozen-baseline scenario editor, season management, PWA and browser verification.

Shared interface: src/types.ts. Financial decimals are nullable strings; unknown is never zero. Cost kinds are mutually exclusive; recorded and planned costs are never added. Cash and full-cost results are distinct. Variable costs use F+vQ. Incomplete totals do not yield complete break-even conclusions. Scenarios freeze their baseline, never edit expenses. No forecasting, crop recommendation, loan approval or external financial API.

Rulings: User explicitly requests this empty workspace, so build in place on a feature branch without another worktree. Tasks 1 and 2 have disjoint ownership and fixed interfaces, so execute in parallel. Core numerical/backup behavior gets test-first coverage; UI gets integrated browser tests. No publication is needed for local delivery.

Interface review: calculation consumes BudgetInput and produces BudgetResult; pages consume PageProps; database exposes typed Dexie tables matching WorkspaceData. Root owns types and styling, database agent owns core modules, workflow agent owns three page modules. No file ownership conflicts.

Acceptance: 70000/4000/20 fixture => 80000 value, 10000 return,17.50 break-even. F60000+2Q at P20 => return12000 at Q4000 and -6000 at Q3000. Verify missing/zero, condition mismatch, partial receipt, backup validation, offline reopen, languages, theme, mobile, reduced motion. Deliver localhost preview, startup docs and limitations.

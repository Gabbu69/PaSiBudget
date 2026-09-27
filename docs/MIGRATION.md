# Version 2 records and backups

PaSiBudget upgrades its existing `PaSiBudget` IndexedDB database in place. It keeps farms, seasons, amounts, expenses, sales, receipts, scenarios and settings. The upgrade adds nullable `actualGrainCondition` and `actualPriceCondition` fields to every legacy season and initializes both to unknown. Planned conditions cannot establish the condition of an actual harvest.

Open **Reports → Edit actual harvest** to confirm both actual conditions. Recorded production value and returns require matching actual conditions; planned assumptions remain separate. Known expense subtotals remain visible while information is incomplete.

## Backup compatibility

- Downloads use the version 2 envelope. All tables are read in one readonly transaction and the snapshot is validated before a download is requested.
- Valid version 1 files are checked against their original fields and explicitly migrated to version 2 in memory. Existing decimal strings are retained; actual grain conditions become unknown.
- Restore previews the farms, seasons and expenses, then adds copies in one transaction with new identifiers and remapped references. It preserves existing records and sample labels. Restoring the same file twice creates two sets of copies.
- Unknown fields, unsupported versions, duplicate IDs, invalid dates, broken references, unsupported values and overpayments are rejected before any restore writes.
- Optional season measurements/prices preserve entered decimal precision. Cost amounts, rates, sales quantities/prices and receipts accept up to two decimal places and individual values up to 1 trillion. A sale's derived value must also be at most ₱1 trillion. Unsupported precision or totals are rejected; imports do not silently round input fields. Sale proceeds are rounded to cents consistently when applying receipt limits.
- Exact sack conversion preserves significant digits. Displayed calculation results are rounded for readability, with break-even targets rounded upward. Derived summaries use ordinary display numbers and are intended for seasonal farm-scale budgets.

Existing records are never deleted by validation. An unsupported legacy record may need correction before it can be saved or exported under the current rules. Keep any existing backup until the new file has been checked.

## Backup reminders and updates

All backup buttons use the same validated snapshot/download path. The timestamp means **download requested**, not that the browser verified a file was safely stored. Check the Downloads folder and keep an extra copy. Reminders appear before the first request and after seven days, with a one-day dismissal.

Unsaved forms and scenario assumptions trigger **Keep editing / Discard changes** before dismissal, navigation, season switching or replacement. Failed saves keep typed inputs. App updates use an in-app confirmation and cannot reload while a save, unsaved draft or open form is present.

Records belong to a browser origin. `http://127.0.0.1:4173`, `http://127.0.0.1:5173` and `http://localhost:4173` have separate storage. Use backup/restore to move records. This release provides no cloud sync or account system.

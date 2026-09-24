import Dexie, { type Table } from 'dexie'
import type { BudgetItem, Expense, Farm, Receipt, Sale, Scenario, Season, Setting, WorkspaceData } from '../types'

class PaSiDatabase extends Dexie {
  farms!: Table<Farm, string>
  seasons!: Table<Season, string>
  budgetItems!: Table<BudgetItem, string>
  expenses!: Table<Expense, string>
  sales!: Table<Sale, string>
  receipts!: Table<Receipt, string>
  scenarios!: Table<Scenario, string>
  settings!: Table<Setting, string>

  constructor() {
    super('PaSiBudget')
    this.version(1).stores({
      farms: 'id, isSample',
      seasons: 'id, farmId, archived',
      budgetItems: 'id, seasonId',
      expenses: 'id, seasonId, budgetItemId, date',
      sales: 'id, seasonId, date',
      receipts: 'id, seasonId, saleId, date',
      scenarios: 'id, seasonId',
      settings: 'key',
    })
  }
}

export const db = new PaSiDatabase()

export async function loadWorkspace(): Promise<WorkspaceData> {
  const [farms, seasons, budgetItems, expenses, sales, receipts, scenarios, settings] = await Promise.all([
    db.farms.toArray(), db.seasons.toArray(), db.budgetItems.toArray(), db.expenses.toArray(),
    db.sales.toArray(), db.receipts.toArray(), db.scenarios.toArray(), db.settings.toArray(),
  ])
  return { farms, seasons, budgetItems, expenses, sales, receipts, scenarios, settings }
}

export async function createSeason(farm: Farm, season: Season, items: BudgetItem[]): Promise<void> {
  if (season.farmId !== farm.id || items.some(item => item.seasonId !== season.id)) throw new Error('Season references are inconsistent')
  await db.transaction('rw', db.farms, db.seasons, db.budgetItems, async () => {
    await db.farms.put(farm)
    await db.seasons.add(season)
    if (items.length) await db.budgetItems.bulkAdd(items)
  })
}

import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import { createSeason, db, loadWorkspace } from './db'
import type { BudgetItem, Farm, Season } from '../types'

beforeEach(async () => { await db.delete(); await db.open() })

it('creates a farm, season and budget items in one operation', async () => {
  const farm: Farm = { id: 'f', name: 'Farm', location: 'M’lang', isSample: false, createdAt: '2026-01-01T00:00:00.000Z' }
  const season: Season = { id: 's', farmId: 'f', name: 'Wet', areaHa: '2', plantingDate: '2026-06-01', harvestDate: '2026-10-01', quantityKg: '4000', pricePerKg: '20', grainCondition: 'fresh', priceCondition: 'fresh', actualQuantityKg: null, actualPricePerKg: null, budgetComplete: true, recordsComplete: false, archived: false, createdAt: '2026-01-01T00:00:00.000Z' }
  const item: BudgetItem = { id: 'b', seasonId: 's', name: 'Seeds', category: 'seeds', kind: 'cash', basis: 'fixed', amount: '100', evidence: 'estimate', notes: '' }
  await createSeason(farm, season, [item])
  const saved = await loadWorkspace()
  expect(saved.farms).toEqual([farm])
  expect(saved.seasons).toEqual([season])
  expect(saved.budgetItems).toEqual([item])
})

it('rolls back farm and season if a budget item cannot be inserted', async () => {
  const farm: Farm = { id: 'f', name: 'Farm', location: 'M’lang', isSample: false, createdAt: '2026-01-01T00:00:00.000Z' }
  const season: Season = { id: 's', farmId: 'f', name: 'Wet', areaHa: '2', plantingDate: '2026-06-01', harvestDate: '2026-10-01', quantityKg: '4000', pricePerKg: '20', grainCondition: 'fresh', priceCondition: 'fresh', actualQuantityKg: null, actualPricePerKg: null, budgetComplete: true, recordsComplete: false, archived: false, createdAt: '2026-01-01T00:00:00.000Z' }
  const item: BudgetItem = { id: 'taken', seasonId: 's', name: 'Seeds', category: 'seeds', kind: 'cash', basis: 'fixed', amount: '100', evidence: 'estimate', notes: '' }
  await db.budgetItems.add({ ...item, seasonId: 'existing' })
  await expect(createSeason(farm, season, [item])).rejects.toThrow()
  expect(await db.farms.count()).toBe(0)
  expect(await db.seasons.count()).toBe(0)
})

import type { BudgetItem, Expense, Farm, Season } from '../types'
import { createSeason, db } from './db'

export async function createSampleWorkspace(): Promise<string> {
  const existing = (await db.farms.toArray()).find(farm => farm.isSample)
  if (existing) {
    const season = await db.seasons.where('farmId').equals(existing.id).first()
    if (season) { if(season.archived) await db.seasons.update(season.id,{archived:false}); return season.id }
  }
  const now = new Date().toISOString()
  const farm: Farm = { id: crypto.randomUUID(), name: 'Sample farm — San Isidro', location: 'San Isidro, M’lang, Cotabato', isSample: true, createdAt: now }
  const season: Season = {
    id: crypto.randomUUID(), farmId: farm.id, name: 'Sample wet season 2026', areaHa: '2',
    plantingDate: '2026-06-15', harvestDate: '2026-10-15', quantityKg: '8000', pricePerKg: '22.50',
    grainCondition: 'fresh', priceCondition: 'fresh', actualQuantityKg: null, actualPricePerKg: null,
    budgetComplete: true, recordsComplete: false, archived: false, createdAt: now,
  }
  const costRows = [
    ['Certified seed', 'seeds', 'cash', '8000', '2026-06-10'],
    ['Basal and topdress fertilizer', 'fertilizer', 'cash', '18000', '2026-06-20'],
    ['Crop protection', 'protection', 'cash', '5000', '2026-07-15'],
    ['Hired field labor', 'labor', 'cash', '10000', '2026-08-01'],
    ['Land preparation machinery', 'machinery', 'cash', '7000', '2026-06-12'],
    ['Irrigation fees and fuel', 'irrigation', 'cash', '3000', '2026-08-20'],
    ['Transport to buyer', 'transport', 'cash', '1000', '2026-10-16'],
    ['Harvest labor', 'labor', 'cash', '2000', '2026-10-15'],
    ['In-kind harvest payment', 'labor', 'noncash', '6000', null],
    ['Owned land use estimate', 'land', 'imputed', '5000', null],
  ] as const
  const items: BudgetItem[] = costRows.map(([name, category, kind, amount]) => ({
    id: crypto.randomUUID(), seasonId: season.id, name, category, kind, basis: 'fixed', amount,
    evidence: 'estimate', notes: 'Illustrative sample only; replace with your own figures.',
  }))
  const expenses: Expense[] = costRows.slice(0, 8).map(([name, category, kind, amount, date], index) => ({
    id: crypto.randomUUID(), seasonId: season.id, budgetItemId: items[index].id, date: date!, name,
    category, kind, amount, evidence: 'recorded', notes: 'Illustrative sample entry, not a verified farm record.',
  }))
  await db.transaction('rw',[db.farms,db.seasons,db.budgetItems,db.expenses],async()=>{
    await createSeason(farm, season, items)
    await db.expenses.bulkAdd(expenses)
  })
  return season.id
}

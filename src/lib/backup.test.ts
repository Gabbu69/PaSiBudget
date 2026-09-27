import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { createBackup, parseBackup, restoreBackup, summarizeBackup } from './backup'
import { db, loadWorkspace } from './db'
import type { WorkspaceData } from '../types'

const fixture = (): WorkspaceData => ({
  farms: [{ id: 'f', name: 'Farm', location: 'M’lang', isSample: false, createdAt: '2026-01-01T00:00:00.000Z' }],
  seasons: [{ id: 's', farmId: 'f', name: 'Wet', areaHa: '2', plantingDate: '2026-06-01', harvestDate: '2026-10-01', quantityKg: '4000', pricePerKg: '20', grainCondition: 'fresh', priceCondition: 'fresh', actualQuantityKg: null, actualPricePerKg: null, actualGrainCondition: null, actualPriceCondition: null, budgetComplete: true, recordsComplete: false, archived: false, createdAt: '2026-01-01T00:00:00.000Z' }],
  budgetItems: [{ id: 'b', seasonId: 's', name: 'Seeds', category: 'seeds', kind: 'cash', basis: 'fixed', amount: '70000', evidence: 'estimate', notes: '' }],
  expenses: [{ id: 'e', seasonId: 's', budgetItemId: 'b', date: '2026-06-10', name: 'Seeds', category: 'seeds', kind: 'cash', amount: '300', evidence: 'recorded', notes: '' }],
  sales: [{ id: 'a', seasonId: 's', date: '2026-10-11', quantityKg: '100', pricePerKg: '20', condition: 'fresh', buyer: 'Buyer', notes: '' }],
  receipts: [{ id: 'r', seasonId: 's', saleId: 'a', date: '2026-10-12', amount: '1000', notes: '' }],
  scenarios: [{ id: 'c', seasonId: 's', name: 'Alternative', baseline: { items: [{ id: 'b', seasonId: 's', name: 'Seeds', category: 'seeds', kind: 'cash', basis: 'fixed', amount: '70000', evidence: 'estimate', notes: '' }], quantityKg: '4000', pricePerKg: '20', grainCondition: 'fresh', priceCondition: 'fresh', complete: true }, costChangePercent: '5', quantityChangePercent: '-5', priceChangePercent: '10', createdAt: '2026-01-01T00:00:00.000Z' }],
  settings: [{ key: 'lang', value: 'en' }],
})
const envelope = (data: WorkspaceData, version = 2) => JSON.stringify({ app: 'PaSiBudget', version, exportedAt: '2026-09-24T00:00:00.000Z', data })

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup', () => {
  it('round-trips a newly created season with unknown optional dates', () => {
    const data = fixture()
    data.seasons[0].plantingDate = ''
    data.seasons[0].harvestDate = ''
    expect(parseBackup(envelope(data)).seasons[0].plantingDate).toBe('')
  })
  it('parses a valid backup and summarizes its records', () => {
    const data = parseBackup(envelope(fixture()))
    expect(summarizeBackup(data)).toEqual({ farms: 1, seasons: 1, expenses: 1 })
  })

  it('rejects bad versions, unknown fields, invalid references, enums, dates and decimals', () => {
    expect(() => parseBackup(envelope(fixture(), 3))).toThrow()
    const changes: Array<(data: WorkspaceData) => void> = [
      data => { (data.farms[0] as unknown as Record<string, unknown>).unrecognized = true },
      data => { data.seasons[0].farmId = 'missing' },
      data => { data.budgetItems[0].kind = 'mystery' as never },
      data => { data.expenses[0].date = '2026-02-30' },
      data => { data.budgetItems[0].amount = 'NaN' },
      data => { data.budgetItems[0].amount = '-1' },
      data => { data.scenarios[0].baseline.items[0].seasonId = 'other' },
      data => { data.scenarios[0].costChangePercent = '-101' },
      data => { data.scenarios[0].priceChangePercent = '1000.01' },
      data => { data.seasons[0].actualGrainCondition = 'unknown' as never },
      data => { data.seasons[0].quantityKg = '1000000000000.1' },
      data => { data.budgetItems[0].amount = '0.001' },
      data => { data.expenses[0].amount = '0.001' },
      data => { data.sales[0].quantityKg = '0' },
      data => { data.sales[0].pricePerKg = '0.001' },
      data => { data.receipts[0].amount = '0.001' },
      data => { data.scenarios[0].baseline.items[0].amount = '0.001' },
      data => { data.scenarios[0].baseline.items[0].category = 'unknown' as never },
      data => { data.farms[0].isSample = 'false' as never },
      data => { data.receipts[0].saleId = 'missing' },
      data => { data.budgetItems.push({ ...data.budgetItems[0] }) },
      data => { data.farms[0].createdAt = '2026-02-30T00:00:00.000Z' },
      data => { data.farms[0].id = data.seasons[0].id; data.seasons[0].farmId = data.farms[0].id },
    ]
    for (const change of changes) {
      const data = fixture(); change(data)
      expect(() => parseBackup(envelope(data))).toThrow()
    }
  })

  it('restores copies with remapped IDs and preserves existing records', async () => {
    const original = fixture()
    await restoreBackup(original)
    await restoreBackup(original)
    const saved = await loadWorkspace()
    expect(saved.farms).toHaveLength(2)
    expect(saved.scenarios).toHaveLength(2)
    for (const scenario of saved.scenarios) {
      expect(scenario.baseline.items[0].seasonId).toBe(scenario.seasonId)
      expect(saved.budgetItems.some(item => item.id === scenario.baseline.items[0].id)).toBe(true)
    }
    expect(saved.expenses.every(expense => saved.budgetItems.some(item => item.id === expense.budgetItemId))).toBe(true)
    expect(saved.receipts.every(receipt => saved.sales.some(sale => sale.id === receipt.saleId))).toBe(true)
  })

  it('exports a versioned envelope containing saved data', async () => {
    await restoreBackup(fixture())
    const text = await createBackup()
    const parsed = JSON.parse(text)
    expect(parsed.app).toBe('PaSiBudget')
    expect(parsed.version).toBe(2)
    expect(parseBackup(text).farms).toHaveLength(1)
  })

  it('migrates strict version 1 backups without guessing actual grain conditions or losing precision', async () => {
    const original = fixture()
    original.seasons[0].actualQuantityKg = '4000.123456789012345678901'
    original.seasons[0].actualPricePerKg = '20.123456789012345678901'
    const legacy = JSON.parse(envelope(original, 1))
    delete legacy.data.seasons[0].actualGrainCondition
    delete legacy.data.seasons[0].actualPriceCondition
    const migrated = parseBackup(JSON.stringify(legacy))
    expect(migrated.seasons[0]).toMatchObject({
      actualQuantityKg: original.seasons[0].actualQuantityKg,
      actualPricePerKg: original.seasons[0].actualPricePerKg,
      actualGrainCondition: null, actualPriceCondition: null,
    })
    await restoreBackup(migrated)
    const exported = await createBackup()
    expect(JSON.parse(exported).version).toBe(2)
    expect(parseBackup(exported).seasons[0].actualQuantityKg).toBe(original.seasons[0].actualQuantityKg)
    expect(() => parseBackup(envelope(original, 1))).toThrow(/unknown fields/)
  })

  it('preserves confirmed actual conditions and decimal precision in version 2 restore/export', async () => {
    const original = fixture()
    Object.assign(original.seasons[0], { actualGrainCondition: 'dried', actualPriceCondition: 'dried', quantityKg: '1.000000000000000000001' })
    await restoreBackup(parseBackup(envelope(original)))
    const restored = parseBackup(await createBackup()).seasons[0]
    expect(restored.actualGrainCondition).toBe('dried')
    expect(restored.actualPriceCondition).toBe('dried')
    expect(restored.quantityKg).toBe('1.000000000000000000001')
  })

  it('validates exported snapshots before returning a file', async () => {
    await restoreBackup(fixture())
    const receipt = await db.receipts.toCollection().first()
    await db.receipts.update(receipt!.id, { amount: '2000.01' })
    await expect(createBackup()).rejects.toThrow(/exceed/)
  })

  it('exports all tables in one readonly snapshot while concurrent writes wait', async () => {
    await restoreBackup(fixture())
    let writer: Promise<unknown> | undefined
    const read = db.farms.toArray.bind(db.farms)
    const spy = vi.spyOn(db.farms, 'toArray').mockImplementation(() => {
      const transaction = Dexie.currentTransaction
      expect(transaction?.mode).toBe('readonly')
      expect([...transaction!.storeNames].sort()).toEqual(db.tables.map(table => table.name).sort())
      writer = Dexie.ignoreTransaction(() => db.transaction('rw', db.farms, db.seasons, async () => {
        await db.farms.add({ ...fixture().farms[0], id: 'concurrent-farm' })
        await db.seasons.add({ ...fixture().seasons[0], id: 'concurrent-season', farmId: 'concurrent-farm' })
      }))
      return read()
    })
    try {
      const snapshot = parseBackup(await createBackup())
      expect(snapshot.farms).toHaveLength(1)
      expect(snapshot.seasons).toHaveLength(1)
      await writer
      expect(await db.farms.count()).toBe(2)
      expect(await db.seasons.count()).toBe(2)
    } finally { spy.mockRestore() }
  })

  it('rejects aggregate receipts above the sale value rounded to cents', () => {
    const data = fixture()
    data.sales[0].quantityKg = '100.25'
    data.sales[0].pricePerKg = '20.50'
    data.receipts[0].amount = '2055.13'
    expect(() => parseBackup(envelope(data))).not.toThrow()
    data.receipts.push({ ...data.receipts[0], id: 'r2', amount: '0.01' })
    expect(() => parseBackup(envelope(data))).toThrow()
  })

  it('uses the same sale-total boundary as financial record entry', () => {
    const data = fixture()
    data.sales[0].quantityKg = '1000000'
    data.sales[0].pricePerKg = '1000000'
    expect(() => parseBackup(envelope(data))).not.toThrow()
    data.sales[0].quantityKg = '1000000.01'
    expect(() => parseBackup(envelope(data))).toThrow(/1 trillion/)
  })

  it('rejects records whose derived planned, actual, scenario or sale values overflow', () => {
    const huge = `1${'0'.repeat(200)}`
    const changes: Array<(data: WorkspaceData) => void> = [
      data => { data.seasons[0].quantityKg = huge; data.seasons[0].pricePerKg = huge },
      data => { data.seasons[0].actualQuantityKg = huge; data.seasons[0].actualPricePerKg = huge },
      data => { data.scenarios[0].baseline.quantityKg = huge; data.scenarios[0].baseline.pricePerKg = huge },
      data => { data.sales[0].quantityKg = huge; data.sales[0].pricePerKg = huge },
    ]
    for (const change of changes) {
      const data = fixture(); change(data)
      expect(() => parseBackup(envelope(data))).toThrow()
    }
  })
})

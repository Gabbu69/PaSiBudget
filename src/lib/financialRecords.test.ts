import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { saveReceiptRecord, saveSaleRecord } from './financialRecords'
import type { Receipt, Sale } from '../types'

const sale = (overrides: Partial<Sale> = {}): Sale => ({ id: 'sale', seasonId: 'season', date: '2026-09-24', quantityKg: '100.25', pricePerKg: '20.50', condition: 'fresh', buyer: 'Buyer', notes: '', ...overrides })
const receipt = (overrides: Partial<Receipt> = {}): Receipt => ({ id: 'receipt', seasonId: 'season', saleId: 'sale', date: '2026-09-24', amount: '2055.13', notes: '', ...overrides })

beforeEach(async () => { await db.delete(); await db.open() })

describe('transactional financial records', () => {
  it('accepts the rounded full sale value and updates a receipt without counting itself twice', async () => {
    await saveSaleRecord(sale())
    await saveReceiptRecord(receipt({ amount: '1000' }))
    await saveReceiptRecord(receipt())
    expect(await db.receipts.toArray()).toEqual([receipt()])
  })

  it('rejects receipts for missing sales and other seasons without writing', async () => {
    await expect(saveReceiptRecord(receipt())).rejects.toThrow(/sale/i)
    await saveSaleRecord(sale())
    await expect(saveReceiptRecord(receipt({ seasonId: 'other' }))).rejects.toThrow(/season/i)
    expect(await db.receipts.count()).toBe(0)
  })

  it('rechecks current receipts and preserves the record when an edit would overpay', async () => {
    await saveSaleRecord(sale())
    await saveReceiptRecord(receipt({ amount: '1000' }))
    await saveReceiptRecord(receipt({ id: 'second', amount: '1055.13' }))
    await expect(saveReceiptRecord(receipt({ amount: '1000.01' }))).rejects.toThrow(/exceed/i)
    expect((await db.receipts.get('receipt'))?.amount).toBe('1000')
  })

  it('serializes concurrent receipts so only one full payment is stored', async () => {
    await saveSaleRecord(sale())
    const results = await Promise.allSettled([
      saveReceiptRecord(receipt()),
      saveReceiptRecord(receipt({ id: 'second' })),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    expect(await db.receipts.count()).toBe(1)
  })

  it('rejects sale reductions below receipts and preserves the original sale', async () => {
    await saveSaleRecord(sale())
    await saveReceiptRecord(receipt())
    await expect(saveSaleRecord(sale({ quantityKg: '100' }))).rejects.toThrow(/exceed/i)
    expect(await db.sales.get('sale')).toEqual(sale())
    await saveSaleRecord(sale({ buyer: 'Renamed buyer' }))
    expect((await db.sales.get('sale'))?.buyer).toBe('Renamed buyer')
  })

  it('rechecks sale value when receipt insertion races with a sale reduction', async () => {
    await saveSaleRecord(sale())
    const results = await Promise.allSettled([
      saveSaleRecord(sale({ quantityKg: '50' })),
      saveReceiptRecord(receipt()),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
  })

  it('rejects moving a sale away from its linked receipt season', async () => {
    await saveSaleRecord(sale())
    await saveReceiptRecord(receipt())
    await expect(saveSaleRecord(sale({ seasonId: 'other' }))).rejects.toThrow(/season/i)
    expect((await db.sales.get('sale'))?.seasonId).toBe('season')
  })

  it('rejects negative or sub-cent receipt amounts rather than persisting invalid money', async () => {
    await saveSaleRecord(sale())
    await expect(saveReceiptRecord(receipt({ amount: '-1' }))).rejects.toThrow()
    await expect(saveReceiptRecord(receipt({ amount: '0.001' }))).rejects.toThrow()
    expect(await db.receipts.count()).toBe(0)
  })

  it('enforces the supported sale-total limit without overwriting an existing sale', async () => {
    const boundary = sale({ quantityKg: '1000000', pricePerKg: '1000000' })
    await saveSaleRecord(boundary)
    await expect(saveSaleRecord({ ...boundary, quantityKg: '1000000.01' })).rejects.toThrow(/1 trillion/)
    expect(await db.sales.get(boundary.id)).toEqual(boundary)
  })
})

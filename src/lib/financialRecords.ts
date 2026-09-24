import Decimal from 'decimal.js'
import { db } from './db'
import { saleValue } from './sales'
import type { Receipt, Sale } from '../types'

function amount(value: string, positive = false): Decimal {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Invalid financial amount')
  const parsed = new Decimal(value)
  if (!parsed.isFinite() || parsed.gt(1e12) || (positive && parsed.lte(0))) throw new Error('Invalid financial amount')
  return parsed
}

// The transaction serializes overlapping writes, including writes from another tab.
export async function saveSaleRecord(sale: Sale): Promise<void> {
  amount(sale.quantityKg, true)
  amount(sale.pricePerKg)
  await db.transaction('rw', db.sales, db.receipts, async () => {
    const receipts = await db.receipts.where('saleId').equals(sale.id).toArray()
    if (receipts.some(receipt => receipt.seasonId !== sale.seasonId)) throw new Error('Receipt season does not match sale season')
    const paid = receipts.reduce((sum, receipt) => sum.plus(receipt.amount), new Decimal(0))
    if (paid.gt(saleValue(sale.quantityKg, sale.pricePerKg))) throw new Error('Existing receipts exceed sale value')
    await db.sales.put(sale)
  })
}

export async function saveReceiptRecord(receipt: Receipt): Promise<void> {
  const payment = amount(receipt.amount)
  await db.transaction('rw', db.sales, db.receipts, async () => {
    const sale = await db.sales.get(receipt.saleId)
    if (!sale) throw new Error('Sale no longer exists')
    if (sale.seasonId !== receipt.seasonId) throw new Error('Receipt season does not match sale season')
    const receipts = await db.receipts.where('saleId').equals(sale.id).toArray()
    const paid = receipts.filter(item => item.id !== receipt.id).reduce((sum, item) => sum.plus(item.amount), payment)
    if (paid.gt(saleValue(sale.quantityKg, sale.pricePerKg))) throw new Error('Receipts would exceed sale value')
    await db.receipts.put(receipt)
  })
}

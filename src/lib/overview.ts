import Decimal from 'decimal.js'
import type { BudgetItem, Expense, Receipt, Sale, Season } from '../types'
import { calculateBudget, seasonInput } from './calculations'
import { saleValue, sumMoney } from './sales'

/** Budget comparisons and money collected are separate from estimated production value. */
export function overviewFinances(season: Season, items: BudgetItem[], expenses: Expense[], sales: Sale[], receipts: Receipt[]) {
  const plannedItems = items.filter(item => item.seasonId === season.id)
  const cashExpenses = expenses.filter(expense => expense.seasonId === season.id && expense.kind === 'cash')
  const seasonSales = sales.filter(sale => sale.seasonId === season.id)
  const saleIds = new Set(seasonSales.map(sale => sale.id))
  const planned = calculateBudget(seasonInput(season, plannedItems))
  const cashSpending = cashExpenses.reduce((total, expense) => expense.amount === null ? total : total.plus(expense.amount), new Decimal(0))
  const salesValue = sumMoney(seasonSales.map(sale => new Decimal(saleValue(sale.quantityKg, sale.pricePerKg)).toFixed(2)))
  const paymentsReceived = sumMoney(receipts.filter(receipt => receipt.seasonId === season.id && saleIds.has(receipt.saleId)).map(receipt => receipt.amount))
  const unpaidSales = sumMoney([new Decimal(salesValue).toFixed(2), new Decimal(paymentsReceived).neg().toFixed(2)])
  const cashAmountsKnown = cashExpenses.every(expense => expense.amount !== null)
  // Sum the original decimal strings before subtracting; only display formatting rounds the comparison.
  const plannedCash = plannedItems.filter(item => item.kind === 'cash' && item.amount !== null).reduce((total, item) => {
    const amount = new Decimal(item.amount!)
    return total.plus(item.basis === 'fixed' ? amount : amount.times(season.quantityKg ?? '0'))
  }, new Decimal(0))
  const plannedCashLessSpending = planned.cash.complete && cashAmountsKnown ? plannedCash.minus(cashSpending).toNumber() : null
  return { salesValue, paymentsReceived, unpaidSales, cashSpending: cashSpending.toNumber(), cashAmountsKnown, plannedCashLessSpending }
}

import { expect, it } from 'vitest'
import { overviewFinances } from './overview'
import type { BudgetItem, Expense, Receipt, Sale } from '../types'

const season = { id: 's', farmId: 'f', name: 'Season', areaHa: '1', plantingDate: '', harvestDate: '', quantityKg: '4000', pricePerKg: '20', grainCondition: 'fresh' as const, priceCondition: 'fresh' as const, actualQuantityKg: null, actualPricePerKg: null, actualGrainCondition: null, actualPriceCondition: null, budgetComplete: true, recordsComplete: false, archived: false, createdAt: '' }
const item = (amount: string | null, kind: BudgetItem['kind'] = 'cash', basis: BudgetItem['basis'] = 'fixed'): BudgetItem => ({ id: 'i', seasonId: 's', name: 'Cost', category: 'other', kind, basis, amount, evidence: 'estimate', notes: '' })
const expense = (amount: string | null, kind: Expense['kind'] = 'cash'): Expense => ({ id: 'e', seasonId: 's', budgetItemId: null, date: '2026-01-01', name: 'Expense', category: 'other', kind, amount, evidence: 'recorded', notes: '' })
const sale: Sale = { id: 'sale', seasonId: 's', date: '2026-01-01', quantityKg: '100.25', pricePerKg: '20.50', condition: 'fresh', buyer: '', notes: '' }
const receipt: Receipt = { id: 'r', seasonId: 's', saleId: 'sale', date: '2026-01-01', amount: '1000.10', notes: '' }

it('keeps rounded sales, partial payments, and unpaid sales separate', () => {
  const result = overviewFinances(season, [], [], [sale, { ...sale, id: 'other', seasonId: 'other' }], [receipt, { ...receipt, id: 'r2', amount: '0.20' }, { ...receipt, id: 'other', seasonId: 'other' }])
  expect(result.salesValue).toBe(2055.13)
  expect(result.paymentsReceived).toBe(1000.3)
  expect(result.unpaidSales).toBe(1054.83)
})

it('subtracts only recorded cash costs and retains an incomplete-record comparison', () => {
  const result = overviewFinances(season, [item('60000'), item('2', 'cash', 'perKg'), item('5000', 'imputed')], [expense('10000'), expense('3000', 'imputed')], [], [])
  expect(result.cashSpending).toBe(10000)
  expect(result.plannedCashLessSpending).toBe(58000)
})

it('withholds comparison for an incomplete budget, unknown cash cost, or unknown cash expense', () => {
  expect(overviewFinances({ ...season, budgetComplete: false }, [item('100')], [], [], []).plannedCashLessSpending).toBeNull()
  expect(overviewFinances(season, [item(null)], [], [], []).plannedCashLessSpending).toBeNull()
  expect(overviewFinances(season, [item('100')], [expense(null)], [], []).plannedCashLessSpending).toBeNull()
  expect(overviewFinances({ ...season, quantityKg: null }, [item('1', 'cash', 'perKg')], [], [], []).plannedCashLessSpending).toBeNull()
})

it('keeps confirmed zero, ignores unknown noncash expense, and permits a negative comparison', () => {
  expect(overviewFinances(season, [item('0')], [expense('0'), expense(null, 'imputed')], [], []).plannedCashLessSpending).toBe(0)
  expect(overviewFinances(season, [item('0.10')], [expense('0.20')], [], []).plannedCashLessSpending).toBe(-0.1)
})

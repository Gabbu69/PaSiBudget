import { describe, expect, it } from 'vitest'
import { calculateBudget, calculateRecorded, calculateScenario } from './calculations'
import type { BudgetInput, BudgetItem, Expense, Season } from '../types'

const item = (amount: string | null, kind: BudgetItem['kind'] = 'cash', basis: BudgetItem['basis'] = 'fixed'): BudgetItem => ({ id: crypto.randomUUID(), seasonId: 's', name: 'Cost', category: 'other', kind, basis, amount, evidence: 'estimate', notes: '' })
const input = (items: BudgetItem[], quantityKg: string | null = '4000', pricePerKg: string | null = '20'): BudgetInput => ({ items, quantityKg, pricePerKg, grainCondition: 'fresh', priceCondition: 'fresh', complete: true })

describe('calculations', () => {
  it('matches the reference budget and lower-harvest examples', () => {
    const fixed = calculateBudget(input([item('70000')]))
    expect([fixed.productionValue,fixed.full.estimatedReturn,fixed.full.breakEvenPrice,fixed.full.breakEvenQuantity]).toEqual([80000,10000,17.5,3500])
    const lower = calculateBudget(input([item('60000'),item('2','cash','perKg')],'3000','20'))
    expect([lower.full.knownTotal,lower.full.estimatedReturn,lower.full.breakEvenPrice,lower.full.breakEvenQuantity]).toEqual([66000,-6000,22,3333.34])
  })
  it('allows confirmed zero costs and flags zero harvest without dividing by zero', () => {
    const knownZero = calculateBudget(input([item('0')]))
    expect(knownZero.full.complete).toBe(true)
    expect(knownZero.full.breakEvenPrice).toBe(0)
    const noHarvest = calculateBudget(input([item('60000')],'0','20'))
    expect(noHarvest.productionValue).toBe(0)
    expect(noHarvest.full.estimatedReturn).toBe(-60000)
    expect(noHarvest.full.breakEvenPrice).toBeNull()
  })
  it('keeps cash and full cost distinct and calculates exact break-even values', () => {
    const result = calculateBudget(input([item('60000'), item('2', 'cash', 'perKg'), item('2000', 'imputed')]))
    expect(result.productionValue).toBe(80000)
    expect(result.cash.knownTotal).toBe(68000)
    expect(result.full.knownTotal).toBe(70000)
    expect(result.cash.estimatedReturn).toBe(12000)
    expect(result.full.estimatedReturn).toBe(10000)
    expect(result.full.breakEvenPrice).toBe(17.5)
    expect(result.full.breakEvenQuantity).toBe(3444.45)
  })

  it('does not turn unknown costs into complete conclusions', () => {
    const result = calculateBudget(input([item('100'), item(null)]))
    expect(result.cash.knownTotal).toBe(100)
    expect(result.cash.complete).toBe(false)
    expect(result.cash.estimatedReturn).toBeNull()
    expect(result.cash.breakEvenPrice).toBeNull()
    expect(result.cash.breakEvenQuantity).toBeNull()
  })

  it('withholds break-even quantity when the contribution margin is nonpositive', () => {
    const result = calculateBudget(input([item('60000'), item('21', 'cash', 'perKg')]))
    expect(result.cash.breakEvenQuantity).toBeNull()
    expect(result.cash.breakEvenQuantityStatus).toBe('impossible')
  })

  it('rounds break-even price upward to the next cent', () => {
    expect(calculateBudget(input([item('100')], '3', '50')).cash.breakEvenPrice).toBe(33.34)
  })

  it('withholds return and break-even on mismatched grain condition', () => {
    const result = calculateBudget({ ...input([item('70000')]), priceCondition: 'dried' })
    expect(result.productionValue).toBeNull()
    expect(result.full.estimatedReturn).toBeNull()
    expect(result.full.breakEvenPrice).toBeNull()
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('rejects invalid decimal strings and negative values', () => {
    expect(() => calculateBudget(input([item('NaN')]))).toThrow()
    expect(() => calculateBudget(input([item('-1')]))).toThrow()
    expect(() => calculateBudget(input([], 'Infinity'))).toThrow()
    expect(() => calculateBudget(input([], '9'.repeat(400)))).toThrow()
    expect(() => calculateBudget(input([], '9'.repeat(200), '9'.repeat(200)))).toThrow()
  })

  it('uses a frozen scenario baseline with decimal percentage changes', () => {
    const baseline = input([item('60000'), item('2', 'cash', 'perKg')])
    const result = calculateScenario({ id: 'x', seasonId: 's', name: 'Scenario', baseline, costChangePercent: '10', quantityChangePercent: '-25', priceChangePercent: '5', createdAt: '2026-01-01T00:00:00.000Z' })
    expect(result.quantityKg).toBe(3000)
    expect(result.pricePerKg).toBe(21)
    expect(result.cash.knownTotal).toBe(72600)
    expect(result.cash.estimatedReturn).toBe(-9600)
    expect(baseline.items[0].amount).toBe('60000')
  })

  it('keeps tiny finite scenario values in decimal form', () => {
    const baseline = input([item('0.000000000000000000001')], '0.000000000000000000001', '1')
    const result = calculateScenario({ id: 'tiny', seasonId: 's', name: 'Tiny', baseline, costChangePercent: '0', quantityChangePercent: '0', priceChangePercent: '0', createdAt: '2026-01-01T00:00:00.000Z' })
    expect(result.quantityKg).toBe(1e-21)
    expect(result.cash.knownTotal).toBe(1e-21)
  })

  it('uses recorded costs and actual production separately from planned budget', () => {
    const season: Season = { id: 's', farmId: 'f', name: 'Wet', areaHa: '2', plantingDate: '2026-06-01', harvestDate: '2026-10-01', quantityKg: '9000', pricePerKg: '30', grainCondition: 'fresh', priceCondition: 'fresh', actualQuantityKg: '4000', actualPricePerKg: '20', budgetComplete: true, recordsComplete: true, archived: false, createdAt: '2026-01-01T00:00:00.000Z' }
    const expense: Expense = { id: 'e', seasonId: 's', budgetItemId: null, date: '2026-06-01', name: 'Actual', category: 'other', kind: 'cash', amount: '70000', evidence: 'recorded', notes: '' }
    const result = calculateRecorded(season, [expense])
    expect(result.productionValue).toBe(80000)
    expect(result.full.estimatedReturn).toBe(10000)
    expect(result.full.breakEvenPrice).toBe(17.5)
  })
})

import Decimal from 'decimal.js'
import type { BudgetInput, BudgetItem, BudgetResult, CostResult, Expense, GrainCondition, Scenario, Season } from '../types'
import { validPercent } from './validation'

const zero = new Decimal(0)
const numberPattern = /^\d+(?:\.\d+)?$/

function decimal(value: string | null, field: string): Decimal | null {
  if (value === null) return null
  if (typeof value !== 'string' || !numberPattern.test(value) || !Number.isFinite(Number(value))) {
    throw new Error(`${field} must be a finite nonnegative decimal`)
  }
  return new Decimal(value)
}

function finiteNumber(value: Decimal): number {
  const result = value.toNumber()
  if (!Number.isFinite(result)) throw new Error('Calculated value exceeds the supported numeric range')
  return result
}

function percent(value: string, field: string): Decimal {
  if (!validPercent(value)) throw new Error(`${field} must be between -100 and 1000 percent`)
  const parsed = new Decimal(value)
  return parsed.div(100).plus(1)
}

function makeCost(items: BudgetItem[], quantity: Decimal | null, price: Decimal | null, complete: boolean, comparable: boolean): CostResult {
  let fixed = zero
  let variable = zero
  let hasUnknown = false
  for (const item of items) {
    const amount = decimal(item.amount, `Cost ${item.name}`)
    if (amount === null) { hasUnknown = true; continue }
    if (item.basis === 'fixed') fixed = fixed.plus(amount)
    else if (item.basis === 'perKg') variable = variable.plus(amount)
    else throw new Error('Invalid cost basis')
  }
  const knownTotal = fixed.plus(quantity === null ? zero : variable.times(quantity))
  const costsComplete = complete && !hasUnknown && (quantity !== null || variable.eq(0))
  const canConclude = costsComplete && comparable && quantity !== null && price !== null
  const productionValue = canConclude ? quantity.times(price) : null
  const estimatedReturn = productionValue === null ? null : finiteNumber(productionValue.minus(knownTotal))
  const breakEvenPrice = canConclude && quantity.gt(0) ? finiteNumber(knownTotal.div(quantity).toDecimalPlaces(2, Decimal.ROUND_CEIL)) : null
  let breakEvenQuantity: number | null = null
  let breakEvenQuantityStatus: CostResult['breakEvenQuantityStatus'] = 'unavailable'
  if (canConclude) {
    const margin = price.minus(variable)
    // The target is a positive-production break-even requirement. With P < v,
    // every positive harvest loses money even when F = 0. When P = v and F = 0,
    // every harvest returns zero, so F / (P - v) has no defined quantity target.
    if (margin.lt(0) || (margin.eq(0) && fixed.gt(0))) breakEvenQuantityStatus = 'impossible'
    else if (margin.gt(0)) {
      breakEvenQuantity = finiteNumber(fixed.div(margin).toDecimalPlaces(2, Decimal.ROUND_CEIL))
      breakEvenQuantityStatus = 'available'
    }
  }
  return { knownTotal: finiteNumber(knownTotal), complete: costsComplete, fixedCost: finiteNumber(fixed), variableRate: finiteNumber(variable), estimatedReturn, breakEvenPrice, breakEvenQuantity, breakEvenQuantityStatus }
}

type CalculationInput = Omit<BudgetInput, 'grainCondition' | 'priceCondition'> & {
  grainCondition: GrainCondition | null; priceCondition: GrainCondition | null
}

export function calculateBudget(input: CalculationInput): BudgetResult {
  const quantity = decimal(input.quantityKg, 'Quantity')
  const price = decimal(input.pricePerKg, 'Price')
  const conditionsKnown = input.grainCondition !== null && input.priceCondition !== null
  const comparable = conditionsKnown && input.grainCondition === input.priceCondition
  const issues: string[] = []
  if (quantity === null) issues.push('Quantity is unknown')
  if (price === null) issues.push('Price is unknown')
  if (!conditionsKnown) issues.push('Grain or price condition is unknown')
  else if (!comparable) issues.push('Grain and price conditions do not match')
  if (!input.complete) issues.push('Costs are marked incomplete')
  if (input.items.some(item => item.amount === null)) issues.push('Some costs are unknown')
  const productionValue = quantity !== null && price !== null && comparable ? finiteNumber(quantity.times(price)) : null
  return {
    quantityKg: quantity === null ? null : finiteNumber(quantity),
    pricePerKg: price === null ? null : finiteNumber(price),
    productionValue,
    cash: makeCost(input.items.filter(item => item.kind === 'cash'), quantity, price, input.complete, comparable),
    full: makeCost(input.items, quantity, price, input.complete, comparable),
    issues,
  }
}

export function seasonInput(season: Season, items: BudgetItem[]): BudgetInput {
  return { items, quantityKg: season.quantityKg, pricePerKg: season.pricePerKg, grainCondition: season.grainCondition, priceCondition: season.priceCondition, complete: season.budgetComplete }
}

export function calculateScenario(scenario: Scenario): BudgetResult {
  const costFactor = percent(scenario.costChangePercent, 'Cost change')
  const quantityFactor = percent(scenario.quantityChangePercent, 'Quantity change')
  const priceFactor = percent(scenario.priceChangePercent, 'Price change')
  const baseline = scenario.baseline
  const scaled = (value: string | null, factor: Decimal, field: string) => {
    const parsed = decimal(value, field)
    return parsed === null ? null : parsed.times(factor).toFixed()
  }
  return calculateBudget({
    ...baseline,
    items: baseline.items.map(item => ({ ...item, amount: scaled(item.amount, costFactor, item.name) })),
    quantityKg: scaled(baseline.quantityKg, quantityFactor, 'Quantity'),
    pricePerKg: scaled(baseline.pricePerKg, priceFactor, 'Price'),
  })
}

export function calculateRecorded(season: Season, expenses: Expense[]): BudgetResult {
  const items: BudgetItem[] = expenses.filter(expense => expense.seasonId === season.id).map(expense => ({
    id: expense.id, seasonId: expense.seasonId, name: expense.name, category: expense.category,
    kind: expense.kind, basis: 'fixed', amount: expense.amount, evidence: expense.evidence, notes: expense.notes,
  }))
  return calculateBudget({ items, quantityKg: season.actualQuantityKg, pricePerKg: season.actualPricePerKg, grainCondition: season.actualGrainCondition ?? null, priceCondition: season.actualPriceCondition ?? null, complete: season.recordsComplete })
}

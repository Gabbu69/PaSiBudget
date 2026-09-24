import Decimal from 'decimal.js'
import type { BudgetInput, BudgetItem, BudgetResult, CostResult, Expense, Scenario, Season } from '../types'

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
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error(`${field} must be a finite percentage`)
  const parsed = new Decimal(value)
  if (!parsed.isFinite() || parsed.lt(-100)) throw new Error(`${field} must be at least -100`)
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
    if (margin.lte(0) && fixed.gt(0)) breakEvenQuantityStatus = 'impossible'
    else if (margin.gt(0)) {
      breakEvenQuantity = finiteNumber(fixed.div(margin).toDecimalPlaces(2, Decimal.ROUND_CEIL))
      breakEvenQuantityStatus = 'available'
    } else if (fixed.eq(0)) {
      breakEvenQuantity = 0
      breakEvenQuantityStatus = 'available'
    }
  }
  return { knownTotal: finiteNumber(knownTotal), complete: costsComplete, fixedCost: finiteNumber(fixed), variableRate: finiteNumber(variable), estimatedReturn, breakEvenPrice, breakEvenQuantity, breakEvenQuantityStatus }
}

export function calculateBudget(input: BudgetInput): BudgetResult {
  const quantity = decimal(input.quantityKg, 'Quantity')
  const price = decimal(input.pricePerKg, 'Price')
  const comparable = input.grainCondition === input.priceCondition
  const issues: string[] = []
  if (quantity === null) issues.push('Quantity is unknown')
  if (price === null) issues.push('Price is unknown')
  if (!comparable) issues.push('Grain and price conditions do not match')
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
  return calculateBudget({ items, quantityKg: season.actualQuantityKg, pricePerKg: season.actualPricePerKg, grainCondition: season.grainCondition, priceCondition: season.priceCondition, complete: season.recordsComplete })
}

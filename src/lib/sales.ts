import Decimal from 'decimal.js'
import { MAX_INPUT } from './validation'

const signedDecimalPattern = /^-?\d+(?:\.\d+)?$/

function parseAmount(value: string, signed: boolean): Decimal {
  if (typeof value !== 'string' || !signedDecimalPattern.test(value) || (!signed && value.startsWith('-')) || !Number.isFinite(Number(value))) {
    throw new Error('Amount must be a finite decimal')
  }
  return new Decimal(value)
}

function cents(value: Decimal): number {
  const result = value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
  if (!Number.isFinite(result)) throw new Error('Money value exceeds the supported numeric range')
  return result
}

export function saleValue(quantityKg: string, pricePerKg: string): number {
  return cents(parseAmount(quantityKg, false).times(parseAmount(pricePerKg, false)))
}

/** Keep supported transaction totals within a range that preserves every cent. */
export function validatedSaleValue(quantityKg: string, pricePerKg: string): number {
  const total = parseAmount(quantityKg, false).times(parseAmount(pricePerKg, false))
  if (total.gt(MAX_INPUT)) throw new Error('Sale total must not exceed 1 trillion pesos')
  return cents(total)
}

export function sumMoney(amounts: string[]): number {
  return cents(amounts.reduce((total, amount) => total.plus(parseAmount(amount, true)), new Decimal(0)))
}

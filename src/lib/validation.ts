import Decimal from 'decimal.js'
import type { DecimalInput } from '../types'

export const MAX_INPUT = '1000000000000'
export const decimalPattern = /^\d+(?:\.\d{1,2})?$/
const preciseDecimalPattern = /^\d+(?:\.\d+)?$/
const percentPattern = /^-?\d+(?:\.\d+)?$/

function withinRange(value: unknown, pattern: RegExp, min: string, max: string): value is string {
  if (typeof value !== 'string' || !pattern.test(value)) return false
  const parsed = new Decimal(value)
  return parsed.isFinite() && parsed.gte(min) && parsed.lte(max)
}

/** Nullable season quantities/prices retain the decimal precision entered. */
export function validDecimal(value: unknown): value is DecimalInput {
  return value === null || withinRange(value, preciseDecimalPattern, '0', MAX_INPUT)
}

/** Stored cash amounts and rates support whole pesos and up to two decimal places. */
export function validAmount(value: unknown): value is DecimalInput {
  return value === null || withinRange(value, decimalPattern, '0', MAX_INPUT)
}

export function validPositive(value: unknown): value is string {
  return withinRange(value, decimalPattern, '0', MAX_INPUT) && new Decimal(value).gt(0)
}

export function validPercent(value: unknown): value is string {
  return withinRange(value, percentPattern, '-100', '1000')
}

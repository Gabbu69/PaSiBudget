import Decimal from 'decimal.js'
import { MAX_INPUT, validDecimal } from './validation'

/** Convert entered sack weights without losing digits from a valid stored decimal. */
export function sacksToKilograms(sacks: string, kilogramsPerSack: string): string {
  if (!validDecimal(sacks) || !validDecimal(kilogramsPerSack) || new Decimal(kilogramsPerSack).lte(0)) {
    throw new Error('Sacks and kilograms per sack must be valid; sack weight must be above zero')
  }
  // A product needs at most the combined significant digits of its two factors.
  // Use an isolated constructor so this conversion cannot change other calculations.
  const Exact = Decimal.clone({ precision: Math.max(20, sacks.length + kilogramsPerSack.length) })
  const kilograms = new Exact(sacks).times(kilogramsPerSack)
  if (kilograms.gt(MAX_INPUT)) throw new Error('Converted harvest must not exceed 1 trillion kilograms')
  return kilograms.toFixed()
}

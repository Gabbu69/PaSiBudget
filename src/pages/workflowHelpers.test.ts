import { describe, expect, it } from 'vitest'
import { validAmount, validPositive } from './workflowHelpers'

describe('workflow decimal input validation', () => {
  it('preserves unknown versus confirmed zero and requires a positive sale quantity', () => {
    expect(validAmount(null)).toBe(true)
    expect(validAmount('0')).toBe(true)
    expect(validPositive('0')).toBe(false)
    expect(validPositive('0.01')).toBe(true)
  })

  it('rejects values too large to use safely in UI totals', () => {
    expect(validAmount('1000000000000')).toBe(true)
    expect(validAmount('1000000000000.01')).toBe(false)
    expect(validAmount('9'.repeat(400))).toBe(false)
    expect(validPositive('9'.repeat(400))).toBe(false)
  })
})

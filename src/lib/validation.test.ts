import { describe, expect, it } from 'vitest'
import { validAmount, validDecimal, validPercent, validPositive } from './validation'

describe('shared record validation', () => {
  it('retains unknown and confirmed-zero semantics for amounts and season decimals', () => {
    expect(validAmount(null)).toBe(true)
    expect(validDecimal(null)).toBe(true)
    expect(validAmount('0')).toBe(true)
    expect(validPositive('0')).toBe(false)
    expect(validAmount('1000000000000')).toBe(true)
    expect(validAmount('1000000000000.01')).toBe(false)
  })

  it('preserves supported precision and rejects unsupported precision without rounding', () => {
    const precise = '0.12345678901234567890123456789'
    expect(validDecimal(precise)).toBe(true)
    expect(validDecimal('1000000000000.000000000000000000001')).toBe(false)
    expect(validAmount(precise)).toBe(false)
    expect(validAmount('123.45')).toBe(true)
    expect(validPositive('0.01')).toBe(true)
    expect(validPositive('0.001')).toBe(false)
  })

  it('uses finite bounded numeric strings and rejects unsupported representations', () => {
    for (const value of ['', '-1', 'NaN', 'Infinity', '1e2', ' 1 ', '1.', '.5', 5, undefined]) {
      expect(validAmount(value)).toBe(false)
      expect(validDecimal(value)).toBe(false)
      expect(validPositive(value)).toBe(false)
    }
    expect(validDecimal('9'.repeat(400))).toBe(false)
  })

  it('limits scenario changes to the same -100 to 1000 percent range', () => {
    for (const value of ['-100', '0', '12.12345', '1000']) expect(validPercent(value)).toBe(true)
    for (const value of ['-100.01', '1000.01', '1e2', 'Infinity', null, '']) expect(validPercent(value)).toBe(false)
  })
})

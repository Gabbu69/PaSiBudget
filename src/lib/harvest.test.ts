import { describe, expect, it } from 'vitest'
import { sacksToKilograms } from './harvest'

describe('sack conversion', () => {
  it('preserves all accepted decimal digits instead of silently rounding the saved harvest', () => {
    expect(sacksToKilograms('0.123456789012345678901', '1')).toBe('0.123456789012345678901')
    expect(sacksToKilograms('1.000000000000000000001', '1.000000000000000000001'))
      .toBe('1.000000000000000000002000000000000000000001')
  })

  it('converts ordinary weights and retains a confirmed zero harvest', () => {
    expect(sacksToKilograms('80', '50')).toBe('4000')
    expect(sacksToKilograms('0', '50')).toBe('0')
  })

  it('rejects unknown, invalid, zero-weight and oversized conversions without rounding them into range', () => {
    for (const [sacks, weight] of [['', '50'], ['-1', '50'], ['1', '0'], ['1e2', '50'], ['1000000000000', '1.000000000000000000001']]) {
      expect(() => sacksToKilograms(sacks, weight)).toThrow()
    }
  })
})

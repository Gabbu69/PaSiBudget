import { expect, it } from 'vitest'
import { saleValue, sumMoney } from './sales'

it('rounds sale value to cents with half-up rounding', () => {
  expect(saleValue('100.25', '20.50')).toBe(2055.13)
  expect(saleValue('1', '0.005')).toBe(0.01)
})

it('sums decimal receipt amounts before rounding once to cents', () => {
  expect(sumMoney(['0.10', '0.20'])).toBe(0.3)
  expect(sumMoney(['0.005', '0.005'])).toBe(0.01)
  expect(sumMoney(['2055.13', '-2000'])).toBe(55.13)
  expect(sumMoney([])).toBe(0)
})

it('rejects invalid sale and receipt decimals', () => {
  expect(() => saleValue('-1', '20')).toThrow()
  expect(() => sumMoney(['NaN'])).toThrow()
  expect(() => saleValue('9'.repeat(200), '9'.repeat(200))).toThrow()
})

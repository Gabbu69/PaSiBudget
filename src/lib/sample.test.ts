import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import { createSampleWorkspace } from './sample'
import { db, loadWorkspace } from './db'
import { calculateBudget, seasonInput } from './calculations'

beforeEach(async () => { await db.delete(); await db.open() })

it('creates one reusable illustrative season with cash and full cost examples', async () => {
  const first = await createSampleWorkspace()
  expect(await createSampleWorkspace()).toBe(first)
  const data = await loadWorkspace()
  expect(data.farms).toHaveLength(1)
  expect(data.farms[0].isSample).toBe(true)
  expect(data.seasons).toHaveLength(1)
  expect(data.seasons[0].recordsComplete).toBe(false)
  expect(data.expenses).toHaveLength(8)
  expect(data.sales).toHaveLength(0)
  expect(data.receipts).toHaveLength(0)
  const result = calculateBudget(seasonInput(data.seasons[0], data.budgetItems))
  expect(result.productionValue).toBe(180000)
  expect(result.cash.knownTotal).toBe(54000)
  expect(result.full.knownTotal).toBe(65000)
  expect(result.full.complete).toBe(true)
})

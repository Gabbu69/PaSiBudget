import { db, loadWorkspace } from './db'
import Decimal from 'decimal.js'
import { calculateBudget, calculateRecorded, calculateScenario, seasonInput } from './calculations'
import { saleValue } from './sales'
import { categories, kinds, type BudgetInput, type BudgetItem, type WorkspaceData } from '../types'

const grainConditions = ['fresh', 'dried']
const bases = ['fixed', 'perKg']
const evidence = ['recorded', 'estimate', 'quotation']
const decimalPattern = /^\d+(?:\.\d+)?$/
const signedDecimalPattern = /^-?\d+(?:\.\d+)?$/

function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== keys.length || Object.keys(record).some(key => !keys.includes(key))) throw new Error(`${label} has missing or unknown fields`)
  return record
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text`)
  return value
}

function id(value: unknown, label: string): string {
  const result = string(value, label)
  if (!result.trim()) throw new Error(`${label} must not be empty`)
  return result
}

function bool(value: unknown, label: string): void {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`)
}

function member(value: unknown, choices: readonly string[], label: string): void {
  if (typeof value !== 'string' || !choices.includes(value)) throw new Error(`Invalid ${label}`)
}

function decimal(value: unknown, label: string, nullable = false, signed = false): void {
  if (nullable && value === null) return
  if (typeof value !== 'string' || !(signed ? signedDecimalPattern : decimalPattern).test(value) || !Number.isFinite(Number(value))) throw new Error(`Invalid ${label}`)
  if (signed && Number(value) < -100) throw new Error(`${label} is below -100 percent`)
}

function date(value: unknown, label: string): void {
  const text = string(value, label)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || new Date(`${text}T00:00:00.000Z`).toISOString().slice(0, 10) !== text) throw new Error(`Invalid ${label}`)
}

function timestamp(value: unknown, label: string): void {
  const text = string(value, label)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString() !== (text.includes('.') ? text : text.replace('Z', '.000Z'))) throw new Error(`Invalid ${label}`)
}

function validateBudgetItem(value: unknown): BudgetItem {
  const item = object(value, ['id', 'seasonId', 'name', 'category', 'kind', 'basis', 'amount', 'evidence', 'notes'], 'Budget item')
  id(item.id, 'Budget item id'); id(item.seasonId, 'Budget item season'); string(item.name, 'Budget item name')
  member(item.category, categories, 'category'); member(item.kind, kinds, 'cost kind'); member(item.basis, bases, 'cost basis')
  decimal(item.amount, 'amount', true); member(item.evidence, evidence, 'evidence'); string(item.notes, 'notes')
  return item as unknown as BudgetItem
}

function validateBaseline(value: unknown, seasonId: string): BudgetInput {
  const baseline = object(value, ['items', 'quantityKg', 'pricePerKg', 'grainCondition', 'priceCondition', 'complete'], 'Scenario baseline')
  const items = array(baseline.items, 'Baseline items').map(validateBudgetItem)
  if (items.some(item => item.seasonId !== seasonId)) throw new Error('Scenario baseline item references another season')
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate baseline item ID')
  decimal(baseline.quantityKg, 'baseline quantity', true); decimal(baseline.pricePerKg, 'baseline price', true)
  member(baseline.grainCondition, grainConditions, 'grain condition'); member(baseline.priceCondition, grainConditions, 'price condition')
  bool(baseline.complete, 'baseline complete')
  return baseline as unknown as BudgetInput
}

function unique(rows: Array<{ id: string }>, label: string): void {
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error(`Duplicate ${label} ID`)
}

function validateWorkspace(value: unknown): WorkspaceData {
  const data = object(value, ['farms', 'seasons', 'budgetItems', 'expenses', 'sales', 'receipts', 'scenarios', 'settings'], 'Workspace')
  const farms = array(data.farms, 'farms').map(value => {
    const row = object(value, ['id', 'name', 'location', 'isSample', 'createdAt'], 'Farm')
    id(row.id, 'Farm id'); string(row.name, 'Farm name'); string(row.location, 'Location'); bool(row.isSample, 'Sample flag'); timestamp(row.createdAt, 'Farm createdAt')
    return row as unknown as WorkspaceData['farms'][number]
  })
  const seasons = array(data.seasons, 'seasons').map(value => {
    const row = object(value, ['id', 'farmId', 'name', 'areaHa', 'plantingDate', 'harvestDate', 'quantityKg', 'pricePerKg', 'grainCondition', 'priceCondition', 'actualQuantityKg', 'actualPricePerKg', 'budgetComplete', 'recordsComplete', 'archived', 'createdAt'], 'Season')
    id(row.id, 'Season id'); id(row.farmId, 'Season farm'); string(row.name, 'Season name')
    decimal(row.areaHa, 'area', true)
    if (row.plantingDate !== '') date(row.plantingDate, 'planting date')
    if (row.harvestDate !== '') date(row.harvestDate, 'harvest date')
    if (row.plantingDate && row.harvestDate && String(row.harvestDate) < String(row.plantingDate)) throw new Error('Harvest date precedes planting')
    decimal(row.quantityKg, 'quantity', true); decimal(row.pricePerKg, 'price', true)
    member(row.grainCondition, grainConditions, 'grain condition'); member(row.priceCondition, grainConditions, 'price condition')
    decimal(row.actualQuantityKg, 'actual quantity', true); decimal(row.actualPricePerKg, 'actual price', true)
    bool(row.budgetComplete, 'budgetComplete'); bool(row.recordsComplete, 'recordsComplete'); bool(row.archived, 'archived'); timestamp(row.createdAt, 'Season createdAt')
    return row as unknown as WorkspaceData['seasons'][number]
  })
  const budgetItems = array(data.budgetItems, 'budgetItems').map(validateBudgetItem)
  const expenses = array(data.expenses, 'expenses').map(value => {
    const row = object(value, ['id', 'seasonId', 'budgetItemId', 'date', 'name', 'category', 'kind', 'amount', 'evidence', 'notes'], 'Expense')
    id(row.id, 'Expense id'); id(row.seasonId, 'Expense season'); if (row.budgetItemId !== null) id(row.budgetItemId, 'Expense budget item')
    date(row.date, 'Expense date'); string(row.name, 'Expense name'); member(row.category, categories, 'category'); member(row.kind, kinds, 'cost kind')
    decimal(row.amount, 'expense amount', true); member(row.evidence, evidence, 'evidence'); string(row.notes, 'notes')
    return row as unknown as WorkspaceData['expenses'][number]
  })
  const sales = array(data.sales, 'sales').map(value => {
    const row = object(value, ['id', 'seasonId', 'date', 'quantityKg', 'pricePerKg', 'condition', 'buyer', 'notes'], 'Sale')
    id(row.id, 'Sale id'); id(row.seasonId, 'Sale season'); date(row.date, 'Sale date')
    decimal(row.quantityKg, 'sale quantity'); decimal(row.pricePerKg, 'sale price'); member(row.condition, grainConditions, 'sale condition')
    string(row.buyer, 'buyer'); string(row.notes, 'notes')
    return row as unknown as WorkspaceData['sales'][number]
  })
  const receipts = array(data.receipts, 'receipts').map(value => {
    const row = object(value, ['id', 'seasonId', 'saleId', 'date', 'amount', 'notes'], 'Receipt')
    id(row.id, 'Receipt id'); id(row.seasonId, 'Receipt season'); id(row.saleId, 'Receipt sale'); date(row.date, 'Receipt date'); decimal(row.amount, 'receipt amount'); string(row.notes, 'notes')
    return row as unknown as WorkspaceData['receipts'][number]
  })
  const scenarios = array(data.scenarios, 'scenarios').map(value => {
    const row = object(value, ['id', 'seasonId', 'name', 'baseline', 'costChangePercent', 'quantityChangePercent', 'priceChangePercent', 'createdAt'], 'Scenario')
    id(row.id, 'Scenario id'); id(row.seasonId, 'Scenario season'); string(row.name, 'Scenario name')
    validateBaseline(row.baseline, row.seasonId as string)
    decimal(row.costChangePercent, 'cost change', false, true); decimal(row.quantityChangePercent, 'quantity change', false, true); decimal(row.priceChangePercent, 'price change', false, true)
    timestamp(row.createdAt, 'Scenario createdAt')
    return row as unknown as WorkspaceData['scenarios'][number]
  })
  const settings = array(data.settings, 'settings').map(value => {
    const row = object(value, ['key', 'value'], 'Setting')
    id(row.key, 'Setting key'); string(row.value, 'Setting value')
    return row as unknown as WorkspaceData['settings'][number]
  })
  for (const [label, rows] of Object.entries({ farms, seasons, budgetItems, expenses, sales, receipts, scenarios })) unique(rows, label)
  const allIds = [farms, seasons, budgetItems, expenses, sales, receipts, scenarios].flatMap(rows => rows.map(row => row.id))
  if (new Set(allIds).size !== allIds.length) throw new Error('Duplicate record ID')
  if (new Set(settings.map(setting => setting.key)).size !== settings.length) throw new Error('Duplicate setting key')
  const farmIds = new Set(farms.map(farm => farm.id))
  const seasonIds = new Set(seasons.map(season => season.id))
  const items = new Map(budgetItems.map(item => [item.id, item]))
  const saleMap = new Map(sales.map(sale => [sale.id, sale]))
  if (seasons.some(season => !farmIds.has(season.farmId))) throw new Error('Missing farm reference')
  if (budgetItems.some(item => !seasonIds.has(item.seasonId)) || expenses.some(expense => !seasonIds.has(expense.seasonId)) || sales.some(sale => !seasonIds.has(sale.seasonId)) || receipts.some(receipt => !seasonIds.has(receipt.seasonId)) || scenarios.some(scenario => !seasonIds.has(scenario.seasonId))) throw new Error('Missing season reference')
  if (expenses.some(expense => expense.budgetItemId !== null && (!items.has(expense.budgetItemId) || items.get(expense.budgetItemId)?.seasonId !== expense.seasonId))) throw new Error('Invalid expense budget reference')
  if (receipts.some(receipt => !saleMap.has(receipt.saleId) || saleMap.get(receipt.saleId)?.seasonId !== receipt.seasonId)) throw new Error('Invalid receipt sale reference')
  const receiptTotals = new Map<string, Decimal>()
  for (const receipt of receipts) receiptTotals.set(receipt.saleId, (receiptTotals.get(receipt.saleId) ?? new Decimal(0)).plus(receipt.amount))
  for (const sale of sales) {
    const roundedValue = saleValue(sale.quantityKg, sale.pricePerKg)
    if ((receiptTotals.get(sale.id) ?? new Decimal(0)).gt(roundedValue)) throw new Error('Receipts exceed rounded sale value')
  }
  for (const season of seasons) {
    calculateBudget(seasonInput(season, budgetItems.filter(item => item.seasonId === season.id)))
    calculateRecorded(season, expenses.filter(expense => expense.seasonId === season.id))
  }
  for (const scenario of scenarios) calculateScenario(scenario)
  return { farms, seasons, budgetItems, expenses, sales, receipts, scenarios, settings }
}

export function parseBackup(text: string): WorkspaceData {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('Backup is not valid JSON') }
  const envelope = object(parsed, ['app', 'version', 'exportedAt', 'data'], 'Backup')
  if (envelope.app !== 'PaSiBudget' || envelope.version !== 1) throw new Error('Unsupported backup app or version')
  timestamp(envelope.exportedAt, 'exportedAt')
  return validateWorkspace(envelope.data)
}

export async function createBackup(): Promise<string> {
  return JSON.stringify({ app: 'PaSiBudget', version: 1, exportedAt: new Date().toISOString(), data: await loadWorkspace() }, null, 2)
}

export function summarizeBackup(data: WorkspaceData): { farms: number; seasons: number; expenses: number } {
  const valid = validateWorkspace(data)
  return { farms: valid.farms.length, seasons: valid.seasons.length, expenses: valid.expenses.length }
}

export async function restoreBackup(data: WorkspaceData): Promise<void> {
  const valid = validateWorkspace(data)
  const remap = <T extends { id: string }>(rows: T[]) => new Map(rows.map(row => [row.id, crypto.randomUUID()]))
  const farmIds = remap(valid.farms)
  const seasonIds = remap(valid.seasons)
  const itemIds = remap(valid.budgetItems)
  const saleIds = remap(valid.sales)
  const farms = valid.farms.map(farm => ({ ...farm, id: farmIds.get(farm.id)! }))
  const seasons = valid.seasons.map(season => ({ ...season, id: seasonIds.get(season.id)!, farmId: farmIds.get(season.farmId)! }))
  const budgetItems = valid.budgetItems.map(item => ({ ...item, id: itemIds.get(item.id)!, seasonId: seasonIds.get(item.seasonId)! }))
  const expenses = valid.expenses.map(expense => ({ ...expense, id: crypto.randomUUID(), seasonId: seasonIds.get(expense.seasonId)!, budgetItemId: expense.budgetItemId === null ? null : itemIds.get(expense.budgetItemId)! }))
  const sales = valid.sales.map(sale => ({ ...sale, id: saleIds.get(sale.id)!, seasonId: seasonIds.get(sale.seasonId)! }))
  const receipts = valid.receipts.map(receipt => ({ ...receipt, id: crypto.randomUUID(), seasonId: seasonIds.get(receipt.seasonId)!, saleId: saleIds.get(receipt.saleId)! }))
  const scenarios = valid.scenarios.map(scenario => ({ ...scenario, id: crypto.randomUUID(), seasonId: seasonIds.get(scenario.seasonId)!, baseline: { ...scenario.baseline, items: scenario.baseline.items.map(item => ({ ...item, id: itemIds.get(item.id) ?? crypto.randomUUID(), seasonId: seasonIds.get(item.seasonId)! })) } }))
  await db.transaction('rw', [db.farms, db.seasons, db.budgetItems, db.expenses, db.sales, db.receipts, db.scenarios, db.settings], async () => {
    if (farms.length) await db.farms.bulkAdd(farms)
    if (seasons.length) await db.seasons.bulkAdd(seasons)
    if (budgetItems.length) await db.budgetItems.bulkAdd(budgetItems)
    if (expenses.length) await db.expenses.bulkAdd(expenses)
    if (sales.length) await db.sales.bulkAdd(sales)
    if (receipts.length) await db.receipts.bulkAdd(receipts)
    if (scenarios.length) await db.scenarios.bulkAdd(scenarios)
    for (const setting of valid.settings) if (!(await db.settings.get(setting.key))) await db.settings.add({ ...setting })
  })
}

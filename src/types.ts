export type Lang = 'en' | 'fil'
export type GrainCondition = 'fresh' | 'dried'
export type CostKind = 'cash' | 'noncash' | 'imputed'
export type CostBasis = 'fixed' | 'perKg'
export type Evidence = 'recorded' | 'estimate' | 'quotation'
export type Category = 'seeds' | 'fertilizer' | 'protection' | 'labor' | 'machinery' | 'irrigation' | 'transport' | 'land' | 'other'
export type DecimalInput = string | null
export interface Farm { id: string; name: string; location: string; isSample: boolean; createdAt: string }
export interface Season {
  id: string; farmId: string; name: string; areaHa: DecimalInput;
  plantingDate: string; harvestDate: string;
  quantityKg: DecimalInput; pricePerKg: DecimalInput;
  grainCondition: GrainCondition; priceCondition: GrainCondition;
  actualQuantityKg: DecimalInput; actualPricePerKg: DecimalInput;
  actualGrainCondition: GrainCondition | null; actualPriceCondition: GrainCondition | null;
  budgetComplete: boolean; recordsComplete: boolean; archived: boolean; createdAt: string
}
export interface BudgetItem {
  id: string; seasonId: string; name: string; category: Category; kind: CostKind;
  basis: CostBasis; amount: DecimalInput; evidence: Evidence; notes: string
}
export interface Expense {
  id: string; seasonId: string; budgetItemId: string | null; date: string;
  name: string; category: Category; kind: CostKind; amount: DecimalInput; evidence: Evidence; notes: string
}
export interface Sale {
  id: string; seasonId: string; date: string; quantityKg: string; pricePerKg: string;
  condition: GrainCondition; buyer: string; notes: string
}
export interface Receipt { id: string; seasonId: string; saleId: string; date: string; amount: string; notes: string }
export interface BudgetInput {
  items: BudgetItem[]; quantityKg: DecimalInput; pricePerKg: DecimalInput;
  grainCondition: GrainCondition; priceCondition: GrainCondition; complete: boolean
}
export interface Scenario {
  id: string; seasonId: string; name: string; baseline: BudgetInput;
  costChangePercent: string; quantityChangePercent: string; priceChangePercent: string; createdAt: string
}
export interface Setting { key: string; value: string }
export interface WorkspaceData {
  farms: Farm[]; seasons: Season[]; budgetItems: BudgetItem[]; expenses: Expense[];
  sales: Sale[]; receipts: Receipt[]; scenarios: Scenario[]; settings: Setting[]
}
export interface CostResult {
  knownTotal: number; complete: boolean; fixedCost: number; variableRate: number;
  estimatedReturn: number | null; breakEvenPrice: number | null; breakEvenQuantity: number | null;
  breakEvenQuantityStatus: 'available' | 'unavailable' | 'impossible'
}
export interface BudgetResult {
  quantityKg: number | null; pricePerKg: number | null; productionValue: number | null;
  cash: CostResult; full: CostResult; issues: string[]
}
export interface PageProps {
  data: WorkspaceData; season: Season; lang: Lang;
  onSave: (operation: () => Promise<unknown>, success?: string) => Promise<boolean>
}
export const categories: Category[] = ['seeds', 'fertilizer', 'protection', 'labor', 'machinery', 'irrigation', 'transport', 'land', 'other']
export const kinds: CostKind[] = ['cash', 'noncash', 'imputed']

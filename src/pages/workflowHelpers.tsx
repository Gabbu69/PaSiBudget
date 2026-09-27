import type { Category, CostKind, DecimalInput, Evidence, Lang } from '../types'
import { categories, kinds } from '../types'
import { categoryLabel, evidenceLabel, kindLabel, tr } from '../lib/format'

export { decimalPattern, validAmount, validPositive } from '../lib/validation'

export const amountValue = (value: DecimalInput): number | null => value === null ? null : Number(value)

export function categoryOptions(lang: Lang) {
  return categories.map(category => <option key={category} value={category}>{categoryLabel(category, lang)}</option>)
}

export function kindOptions(lang: Lang) {
  return kinds.map(kind => <option key={kind} value={kind}>{kindLabel(kind, lang)}</option>)
}

export function evidenceOptions(lang: Lang) {
  const evidence: Evidence[] = ['estimate', 'recorded', 'quotation']
  return evidence.map(item => <option key={item} value={item}>{evidenceLabel(item, lang)}</option>)
}

export function amountHelp(lang: Lang) {
  return tr(lang, 'Leave blank when unknown. Enter 0 only when confirmed. Maximum: 1 trillion.', 'Iwang blangko kung hindi alam. Ilagay ang 0 kung nakumpirma lamang. Pinakamataas: 1 trilyon.')
}

export function joinExpenseLabels(category: Category, kind: CostKind, lang: Lang) {
  return `${categoryLabel(category, lang)} · ${kindLabel(kind, lang)}`
}

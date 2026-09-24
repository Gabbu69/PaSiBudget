import type { Category, CostKind, Evidence, Lang } from '../types'
export const tr = (lang: Lang, en: string, fil: string) => lang === 'fil' ? fil : en
export const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
export const number = (value: number | null | undefined, digits = 0) => value == null ? '—' : new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value)
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const uid = () => crypto.randomUUID()
export const categoryLabel = (c: Category, lang: Lang): string => ({ seeds: ['Seeds', 'Binhi'], fertilizer: ['Fertilizer', 'Pataba'], protection: ['Crop protection', 'Proteksyon sa pananim'], labor: ['Labor', 'Paggawa'], machinery: ['Machinery', 'Makinarya'], irrigation: ['Irrigation', 'Patubig'], transport: ['Transport', 'Transportasyon'], land: ['Land & resources', 'Lupa at kagamitan'], other: ['Other', 'Iba pa'] }[c][lang === 'fil' ? 1 : 0])
export const kindLabel = (k: CostKind, lang: Lang) => ({ cash: ['Cash', 'Salaping gastos'], noncash: ['Non-cash', 'Di-salaping gastos'], imputed: ['Imputed', 'Tinatayang halaga'] }[k][lang === 'fil' ? 1 : 0])
export const evidenceLabel = (e: Evidence, lang: Lang) => ({ recorded: ['Recorded', 'May tala'], estimate: ['Estimate', 'Tantiya'], quotation: ['Quotation', 'Presyo sa alok'] }[e][lang === 'fil' ? 1 : 0])
export const optionalDecimal = (v: string) => v.trim() === '' ? null : v.trim()
export function download(content: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

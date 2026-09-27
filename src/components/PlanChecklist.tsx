import { ArrowRight, CheckCircle2, ClipboardCheck } from 'lucide-react'
import type { BudgetItem, Lang, Season } from '../types'
import { tr } from '../lib/format'

export interface PlanChecklistProps {
  season: Season
  items: BudgetItem[]
  lang: Lang
  editSeason: () => void
  reviewBudget: () => void
}

export default function PlanChecklist({ season, items, lang, editSeason, reviewBudget }: PlanChecklistProps) {
  const unknownCosts = items.filter(item => item.seasonId === season.id && item.amount === null).length
  const issues = [
    ...(season.quantityKg === null ? [{ key: 'quantity', label: tr(lang, 'Add your expected harvest', 'Ilagay ang inaasahang ani'), action: editSeason }] : []),
    ...(season.pricePerKg === null ? [{ key: 'price', label: tr(lang, 'Add your assumed price', 'Ilagay ang palagay na presyo'), action: editSeason }] : []),
    ...(unknownCosts ? [{ key: 'costs', label: tr(lang, `Fill in ${unknownCosts} unknown cost ${unknownCosts === 1 ? 'amount' : 'amounts'}`, `Ilagay ang ${unknownCosts} hindi pa alam na halaga ng gastos`), action: reviewBudget }] : []),
    ...(!season.budgetComplete ? [{ key: 'complete', label: tr(lang, 'Review costs and confirm the budget is complete', 'Suriin ang gastos at kumpirmahing kumpleto ang badyet'), action: reviewBudget }] : []),
    ...(season.grainCondition !== season.priceCondition ? [{ key: 'condition', label: tr(lang, 'Match harvest and price conditions: fresh or dried', 'Pagtugmain ang kondisyon ng ani at presyo: basa o tuyo'), action: editSeason }] : []),
  ]

  return <section className="card plan-checklist" aria-label={tr(lang, 'Plan completeness checklist', 'Talaan ng pagkakumpleto ng plano')}>
    <div className="card-header"><div><h2>{tr(lang, 'Complete your plan', 'Kumpletuhin ang iyong plano')}</h2><p className="muted">{tr(lang, 'Fill in what is missing to make your estimates useful. Zero means a confirmed zero.', 'Ilagay ang kulang para maging kapaki-pakinabang ang mga tantiya. Ang zero ay kumpirmadong wala.')}</p></div><span className="icon-tile sage"><ClipboardCheck size={20} /></span></div>
    {issues.length ? <ul className="checklist-items">{issues.map(issue => <li key={issue.key}><button className="button secondary checklist-item" onClick={issue.action}><span>{issue.label}</span><ArrowRight size={18} aria-hidden="true" /></button></li>)}</ul> : <p className="checklist-complete"><CheckCircle2 size={20} aria-hidden="true" /><span>{tr(lang, 'Your planned assumptions are complete. Actual harvest, costs, and prices can still differ.', 'Kumpleto ang mga palagay sa iyong plano. Maaari pa ring mag-iba ang aktuwal na ani, gastos, at presyo.')}</span></p>}
  </section>
}

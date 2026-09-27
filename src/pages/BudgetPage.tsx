import { useMemo, useState, type FormEvent } from 'react'
import { CircleHelp, Pencil, Plus, Trash2 } from 'lucide-react'
import { db } from '../lib/db'
import { calculateBudget, seasonInput } from '../lib/calculations'
import { categoryLabel, evidenceLabel, kindLabel, money, number, tr, uid } from '../lib/format'
import type { BudgetItem, Category, CostBasis, CostKind, Evidence, PageProps } from '../types'
import { EmptyState, Field, Modal, PageHeading } from '../components/UI'
import { amountHelp, categoryOptions, evidenceOptions, kindOptions, validAmount } from './workflowHelpers'
import Decimal from 'decimal.js'
import { useDirtyDraft, useEditGuard } from '../components/EditGuard'

type Draft = Pick<BudgetItem, 'name' | 'category' | 'kind' | 'basis' | 'amount' | 'evidence' | 'notes'>
const blank: Draft = { name: '', category: 'seeds', kind: 'cash', basis: 'fixed', amount: null, evidence: 'estimate', notes: '' }

export default function BudgetPage({ data, season, lang, onSave }: PageProps) {
  const items = useMemo(() => data.budgetItems.filter(item => item.seasonId === season.id), [data.budgetItems, season.id])
  const result = calculateBudget(seasonInput(season, items))
  const [editing, setEditing] = useState<string | null>(null)
  const guard = useEditGuard()
  const [original, setOriginal] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  useDirtyDraft(draft, original, draft !== null)
  const close = () => guard.attempt(() => setDraft(null))
  const label = (en: string, fil: string) => tr(lang, en, fil)

  function open(item?: BudgetItem) {
    setOriginal(item ? { name: item.name, category: item.category, kind: item.kind, basis: item.basis, amount: item.amount, evidence: item.evidence, notes: item.notes } : { ...blank })
    setEditing(item?.id ?? null)
    setDraft(item ? { name: item.name, category: item.category, kind: item.kind, basis: item.basis, amount: item.amount, evidence: item.evidence, notes: item.notes } : { ...blank })
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    if (!draft.name.trim()) { setError(label('Enter an item name.', 'Maglagay ng pangalan ng item.')); return }
    if (!validAmount(draft.amount)) { setError(label('Enter a nonnegative amount up to 1 trillion with at most two decimal places, or leave it blank.', 'Maglagay ng halagang hindi negatibo hanggang 1 trilyon na may hanggang dalawang decimal, o iwang blangko.')); return }
    const item: BudgetItem = { ...draft, id: editing ?? uid(), seasonId: season.id, name: draft.name.trim(), amount: draft.amount?.trim() ?? null, notes: draft.notes.trim() }
    const ok = await onSave(() => db.budgetItems.put(item), label('Budget item saved.', 'Nai-save ang item sa badyet.'))
    if (ok) setDraft(null)
  }

  async function remove(item: BudgetItem) {
    if (!await guard.confirm({title:label('Delete planned cost?', 'Burahin ang planong gastos?'),message:label(`Delete ${item.name}? Recorded expenses linked to this item will keep their amounts.`, `Burahin ang ${item.name}? Mananatili ang mga halagang naitala sa mga kaugnay na gastos.`),confirmLabel:label('Delete','Burahin')})) return
    await onSave(async () => {
      await db.transaction('rw', db.budgetItems, db.expenses, async () => {
        await db.expenses.where('budgetItemId').equals(item.id).modify({ budgetItemId: null })
        await db.budgetItems.delete(item.id)
      })
    }, label('Budget item deleted.', 'Nabura ang item sa badyet.'))
  }

  const projected = (item: BudgetItem): number | null => item.amount === null || (item.basis === 'perKg' && result.quantityKg === null)
    ? null : new Decimal(item.amount).times(item.basis === 'perKg' ? result.quantityKg! : 1).toNumber()

  return <>
    <PageHeading eyebrow={label('Planning', 'Pagpaplano')} title={label('Season budget', 'Badyet ng panahon')} description={label('Plan fixed and per-kilogram costs before comparing them with recorded expenses.', 'Planuhin ang nakapirmi at bawat-kilong gastos bago ihambing sa mga naitalang gastos.')} actions={<button className="button primary" onClick={() => open()}><Plus size={18} /> {label('Add planned cost', 'Magdagdag ng planong gastos')}</button>} />
    <div className="grid-3 section-gap">
      <div className="stat-card"><span className="eyebrow">{label('Cash budget', 'Badyet na salapi')}</span><strong>{money(result.cash.knownTotal)}</strong><span className="muted">{result.cash.complete ? label('Complete planned total', 'Kumpletong planong kabuuan') : label('Known items only', 'Mga kilalang item lamang')}</span></div>
      <div className="stat-card"><span className="eyebrow">{label('Full-cost budget', 'Buong badyet sa gastos')}</span><strong>{money(result.full.knownTotal)}</strong><span className="muted">{result.full.complete ? label('Complete planned total', 'Kumpletong planong kabuuan') : label('Known items only', 'Mga kilalang item lamang')}</span></div>
      <div className="stat-card"><span className="eyebrow">{label('Planned harvest', 'Planong ani')}</span><strong>{number(result.quantityKg, 2)} {result.quantityKg === null ? '' : 'kg'}</strong><span className="muted">{label('Per-kilogram costs use this quantity.', 'Ginagamit ang daming ito sa gastos bawat kilo.')}</span></div>
    </div>
    <div className="notice section-gap"><CircleHelp size={18} /><span>{label('Cash costs are paid out. Non-cash and imputed costs count only in the full-cost view. Blank amounts and an unknown harvest make totals incomplete; recorded expenses are tracked separately.', 'Ang salaping gastos ay binabayaran. Ang di-salapi at tinatayang gastos ay kasama lamang sa buong gastos. Hindi kumpleto ang kabuuan kung may blangkong halaga o hindi alam ang ani; hiwalay na sinusubaybayan ang naitalang gastos.')}</span></div>
    <label className="card section-gap" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}><input type="checkbox" checked={season.budgetComplete} onChange={event => { void onSave(() => db.seasons.update(season.id, { budgetComplete: event.target.checked }), label('Budget completeness updated.', 'Na-update ang pagkakumpleto ng badyet.')) }} /><span><strong>{label('I have entered every planned cost for this season', 'Nailagay ko na ang lahat ng planong gastos sa panahong ito')}</strong><br /><small className="muted">{label('Only check this after reviewing the list. Known totals can still be incomplete when an item amount is blank or harvest quantity is unknown.', 'Lagyan lamang ng tsek matapos suriin ang listahan. Maaari pa ring hindi kumpleto ang kabuuan kung may blangkong halaga o hindi alam ang dami ng ani.')}</small></span></label>
    {items.length === 0 ? <EmptyState title={label('No planned costs yet', 'Wala pang planong gastos')} description={label('Add seeds, labor, transport, or other costs to start a season budget.', 'Magdagdag ng binhi, paggawa, transportasyon, o ibang gastos para simulan ang badyet.')} action={<button className="button primary" onClick={() => open()}>{label('Add planned cost', 'Magdagdag ng planong gastos')}</button>} /> :
      <div className="card section-gap"><div className="card-header"><h2>{label('Planned cost items', 'Mga planong gastos')}</h2><span className="muted">{items.length} {label('items', 'item')}</span></div><div className="table-wrap"><table className="data-table record-table budget-records"><thead><tr><th>{label('Item', 'Item')}</th><th>{label('Category / kind', 'Kategorya / uri')}</th><th>{label('Basis', 'Batayan')}</th><th>{label('Input', 'Halaga')}</th><th>{label('At planned harvest', 'Sa planong ani')}</th><th>{label('Evidence', 'Batayan ng tala')}</th><th>{label('Actions', 'Gawain')}</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td data-label={label('Item','Item')}><strong>{item.name}</strong>{item.notes && <div className="muted">{item.notes}</div>}</td><td data-label={label('Category / kind','Kategorya / uri')}>{categoryLabel(item.category, lang)}<br /><small className="muted">{kindLabel(item.kind, lang)}</small></td><td data-label={label('Basis','Batayan')}>{item.basis === 'fixed' ? label('Fixed', 'Nakapirmi') : label('Per kg', 'Bawat kilo')}</td><td data-label={label('Input','Halaga')} className="amount">{item.amount === null ? '—' : money(Number(item.amount))}{item.basis === 'perKg' && item.amount !== null ? '/kg' : ''}</td><td data-label={label('At planned harvest','Sa planong ani')} className="amount">{money(projected(item))}</td><td data-label={label('Evidence','Batayan ng tala')}>{evidenceLabel(item.evidence, lang)}</td><td data-label={label('Actions','Gawain')}><div className="form-actions"><button className="button ghost small" aria-label={label(`Edit ${item.name}`, `Baguhin ang ${item.name}`)} onClick={() => open(item)}><Pencil size={16} /></button><button className="button ghost small" aria-label={label(`Delete ${item.name}`, `Burahin ang ${item.name}`)} onClick={() => void remove(item)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div></div>}
    {draft && <Modal title={editing ? label('Edit planned cost', 'Baguhin ang planong gastos') : label('Add planned cost', 'Magdagdag ng planong gastos')} onClose={close}><form onSubmit={event => void save(event)}><div className="form-grid">
      <Field label={label('Item name', 'Pangalan ng item')}><input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder={label('e.g. Seed purchase', 'hal. Pagbili ng binhi')} /></Field>
      <Field label={label('Category', 'Kategorya')}><select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as Category })}>{categoryOptions(lang)}</select></Field>
      <Field label={label('Cost kind', 'Uri ng gastos')} hint={label('Cash is money paid; non-cash and imputed amounts appear in full cost only.', 'Ang salapi ay perang binayaran; ang di-salapi at tinataya ay kasama lamang sa buong gastos.')}><select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as CostKind })}>{kindOptions(lang)}</select></Field>
      <Field label={label('Cost basis', 'Batayan ng gastos')}><select value={draft.basis} onChange={event => setDraft({ ...draft, basis: event.target.value as CostBasis })}><option value="fixed">{label('Fixed amount', 'Nakapirming halaga')}</option><option value="perKg">{label('Amount per kg harvested', 'Halaga sa bawat kilo ng ani')}</option></select></Field>
      <Field label={draft.basis === 'fixed' ? label('Planned amount (₱)', 'Planong halaga (₱)') : label('Planned amount per kg (₱)', 'Planong halaga bawat kilo (₱)')} hint={amountHelp(lang)}><input inputMode="decimal" type="number" min="0" step="0.01" value={draft.amount ?? ''} onChange={event => setDraft({ ...draft, amount: event.target.value === '' ? null : event.target.value })} placeholder={label('Unknown', 'Hindi alam')} /></Field>
      <Field label={label('Evidence', 'Batayan ng tala')}><select value={draft.evidence} onChange={event => setDraft({ ...draft, evidence: event.target.value as Evidence })}>{evidenceOptions(lang)}</select></Field>
      <Field label={label('Notes (optional)', 'Tala (opsyonal)')}><textarea rows={3} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></Field>
    </div>{error && <p role="alert" className="negative">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={close}>{label('Cancel', 'Kanselahin')}</button><button type="submit" className="button primary">{label('Save planned cost', 'I-save ang planong gastos')}</button></div></form></Modal>}
  </>
}

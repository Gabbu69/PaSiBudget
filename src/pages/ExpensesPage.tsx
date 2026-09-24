import { useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { db } from '../lib/db'
import { categoryLabel, evidenceLabel, kindLabel, money, today, tr, uid } from '../lib/format'
import { categories, type Category, type CostKind, type Evidence, type Expense, type PageProps } from '../types'
import { EmptyState, Field, Modal, PageHeading } from '../components/UI'
import { amountHelp, categoryOptions, evidenceOptions, kindOptions, validAmount } from './workflowHelpers'
import Decimal from 'decimal.js'
import { sumMoney } from '../lib/sales'

type Draft = Pick<Expense, 'budgetItemId' | 'date' | 'name' | 'category' | 'kind' | 'amount' | 'evidence' | 'notes'>
const initial = (): Draft => ({ budgetItemId: null, date: today(), name: '', category: 'seeds', kind: 'cash', amount: null, evidence: 'recorded', notes: '' })

export default function ExpensesPage({ data, season, lang, onSave }: PageProps) {
  const expenses = useMemo(() => data.expenses.filter(expense => expense.seasonId === season.id).sort((a, b) => b.date.localeCompare(a.date)), [data.expenses, season.id])
  const budgetItems = useMemo(() => data.budgetItems.filter(item => item.seasonId === season.id), [data.budgetItems, season.id])
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const label = (en: string, fil: string) => tr(lang, en, fil)
  const visible = filter === 'all' ? expenses : expenses.filter(expense => expense.category === filter)
  const cashExpenses = expenses.filter(expense => expense.kind === 'cash')
  const knownCash = sumMoney(cashExpenses.filter(expense => expense.amount !== null).map(expense => expense.amount!))
  const unknownCount = expenses.filter(expense => expense.amount === null).length

  function open(expense?: Expense) {
    setDraft(expense ? { budgetItemId: expense.budgetItemId, date: expense.date, name: expense.name, category: expense.category, kind: expense.kind, amount: expense.amount, evidence: expense.evidence, notes: expense.notes } : initial())
    setEditing(expense?.id ?? null)
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    if (!draft.name.trim() || !draft.date) { setError(label('Enter a name and date.', 'Maglagay ng pangalan at petsa.')); return }
    if (!validAmount(draft.amount)) { setError(label('Enter a nonnegative amount up to 1 trillion with at most two decimal places, or leave it blank.', 'Maglagay ng halagang hindi negatibo hanggang 1 trilyon na may hanggang dalawang decimal, o iwang blangko.')); return }
    const expense: Expense = { ...draft, id: editing ?? uid(), seasonId: season.id, name: draft.name.trim(), amount: draft.amount?.trim() ?? null, notes: draft.notes.trim() }
    const ok = await onSave(() => db.expenses.put(expense), label('Expense saved.', 'Nai-save ang gastos.'))
    if (ok) setDraft(null)
  }

  function choosePlan(id: string) {
    const item = budgetItems.find(entry => entry.id === id)
    if (draft) setDraft({ ...draft, budgetItemId: item?.id ?? null, name: item?.name ?? draft.name, category: item?.category ?? draft.category, kind: item?.kind ?? draft.kind })
  }

  async function remove(expense: Expense) {
    if (!window.confirm(label(`Delete recorded expense ${expense.name}?`, `Burahin ang naitalang gastos na ${expense.name}?`))) return
    await onSave(() => db.expenses.delete(expense.id), label('Expense deleted.', 'Nabura ang gastos.'))
  }

  const planned = (category: Category) => {
    const rows = budgetItems.filter(item => item.category === category)
    if (!season.budgetComplete || rows.some(item => item.amount === null || (item.basis === 'perKg' && season.quantityKg === null))) return null
    return rows.reduce((sum, item) => sum.plus(new Decimal(item.amount!).times(item.basis === 'perKg' ? season.quantityKg! : 1)), new Decimal(0)).toNumber()
  }
  const actual = (category: Category) => {
    const rows = expenses.filter(item => item.category === category)
    if (!season.recordsComplete || rows.some(item => item.amount === null)) return null
    return sumMoney(rows.map(item => item.amount!))
  }

  return <>
    <PageHeading eyebrow={label('Recording', 'Pagtatala')} title={label('Expenses', 'Mga gastos')} description={label('Record what happened. Planned budget items stay separate and are never added to these totals.', 'Itala ang aktuwal na nangyari. Hiwalay ang mga planong gastos at hindi idinaragdag sa mga kabuuang ito.')} actions={<button className="button primary" onClick={() => open()}><Plus size={18} /> {label('Add expense', 'Magdagdag ng gastos')}</button>} />
    <div className="grid-3 section-gap">
      <div className="stat-card"><span className="eyebrow">{label('Recorded cash', 'Naitalang salaping gastos')}</span><strong>{money(knownCash)}</strong><span className="muted">{season.recordsComplete && cashExpenses.every(item => item.amount !== null) ? label('Complete', 'Kumpleto') : label('Known amounts only', 'Mga kilalang halaga lamang')}</span></div>
      <div className="stat-card"><span className="eyebrow">{label('Entries', 'Mga tala')}</span><strong>{expenses.length}</strong><span className="muted">{label('For this season', 'Para sa panahong ito')}</span></div>
      <div className="stat-card"><span className="eyebrow">{label('Unknown amounts', 'Hindi alam ang halaga')}</span><strong>{unknownCount}</strong><span className="muted">{label('Blank is not zero', 'Ang blangko ay hindi sero')}</span></div>
    </div>
    <label className="card section-gap" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}><input type="checkbox" checked={season.recordsComplete} onChange={event => { void onSave(() => db.seasons.update(season.id, { recordsComplete: event.target.checked }), label('Expense completeness updated.', 'Na-update ang pagkakumpleto ng tala ng gastos.')) }} /><span><strong>{label('I have entered every expense for this season', 'Nailagay ko na ang lahat ng gastos sa panahong ito')}</strong><br /><small className="muted">{label('Check after reviewing cash and non-cash records. An unknown amount still makes its total incomplete.', 'Lagyan ng tsek matapos suriin ang salapi at di-salaping tala. Ang hindi alam na halaga ay mag-iiwang hindi kumpleto sa kabuuan.')}</small></span></label>
    <div className="card section-gap"><div className="card-header"><h2>{label('Plan vs recorded by category', 'Plano at naitala ayon sa kategorya')}</h2></div><div className="table-wrap"><table className="data-table"><thead><tr><th>{label('Category', 'Kategorya')}</th><th>{label('Planned full cost', 'Planong buong gastos')}</th><th>{label('Recorded full cost', 'Naitalang buong gastos')}</th><th>{label('Difference', 'Pagkakaiba')}</th></tr></thead><tbody>{categories.map(category => { const p = planned(category), a = actual(category); return <tr key={category}><td>{categoryLabel(category, lang)}</td><td className="amount">{money(p)}</td><td className="amount">{money(a)}</td><td className="amount">{p === null || a === null ? '—' : money(a - p)}</td></tr> })}</tbody></table></div><p className="muted">{label('A difference appears only when both lists are marked complete and all required amounts and planned harvest quantity are known.', 'Lalabas lamang ang pagkakaiba kapag minarkahang kumpleto ang parehong listahan at alam ang lahat ng kailangang halaga at planong dami ng ani.')}</p></div>
    <div className="card section-gap"><div className="card-header"><h2>{label('Expense log', 'Talaan ng gastos')}</h2><select aria-label={label('Filter by category', 'Salain ayon sa kategorya')} value={filter} onChange={event => setFilter(event.target.value as Category | 'all')}><option value="all">{label('All categories', 'Lahat ng kategorya')}</option>{categoryOptions(lang)}</select></div>
      {visible.length === 0 ? <EmptyState title={filter === 'all' ? label('No expenses yet', 'Wala pang gastos') : label('No expenses in this category', 'Walang gastos sa kategoryang ito')} description={label('Add dated expense records as they occur.', 'Magdagdag ng gastos na may petsa habang nangyayari ang mga ito.')} action={<button className="button primary" onClick={() => open()}>{label('Add expense', 'Magdagdag ng gastos')}</button>} /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>{label('Date / expense', 'Petsa / gastos')}</th><th>{label('Category / kind', 'Kategorya / uri')}</th><th>{label('Amount', 'Halaga')}</th><th>{label('Evidence', 'Batayan ng tala')}</th><th>{label('Actions', 'Gawain')}</th></tr></thead><tbody>{visible.map(expense => <tr key={expense.id}><td><strong>{expense.name}</strong><div className="muted">{expense.date}{expense.budgetItemId && budgetItems.find(item => item.id === expense.budgetItemId) && ` · ${label('Linked to plan', 'Kaugnay sa plano')}`}</div>{expense.notes && <div className="muted">{expense.notes}</div>}</td><td>{categoryLabel(expense.category, lang)}<br /><small className="muted">{kindLabel(expense.kind, lang)}</small></td><td className="amount">{expense.amount === null ? '—' : money(Number(expense.amount))}</td><td>{evidenceLabel(expense.evidence, lang)}</td><td><div className="form-actions"><button className="button ghost small" aria-label={label(`Edit ${expense.name}`, `Baguhin ang ${expense.name}`)} onClick={() => open(expense)}><Pencil size={16} /></button><button className="button ghost small" aria-label={label(`Delete ${expense.name}`, `Burahin ang ${expense.name}`)} onClick={() => void remove(expense)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
    </div>
    {draft && <Modal title={editing ? label('Edit expense', 'Baguhin ang gastos') : label('Add expense', 'Magdagdag ng gastos')} onClose={() => setDraft(null)}><form onSubmit={event => void save(event)}><div className="form-grid">
      <Field label={label('Date', 'Petsa')}><input type="date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></Field>
      <Field label={label('Link to planned item (optional)', 'Iugnay sa planong item (opsyonal)')} hint={label('Selecting an item fills its name and category; its planned amount is not copied into this record.', 'Pupunan ng napiling item ang pangalan at kategorya; hindi kokopyahin dito ang planong halaga.')}><select value={draft.budgetItemId ?? ''} onChange={event => choosePlan(event.target.value)}><option value="">{label('No linked item', 'Walang kaugnay na item')}</option>{budgetItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label={label('Expense name', 'Pangalan ng gastos')}><input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field>
      <Field label={label('Category', 'Kategorya')}><select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as Category })}>{categoryOptions(lang)}</select></Field>
      <Field label={label('Cost kind', 'Uri ng gastos')}><select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as CostKind })}>{kindOptions(lang)}</select></Field>
      <Field label={label('Amount paid or valued (₱)', 'Binayaran o tinayang halaga (₱)')} hint={amountHelp(lang)}><input inputMode="decimal" type="number" min="0" step="0.01" value={draft.amount ?? ''} onChange={event => setDraft({ ...draft, amount: event.target.value === '' ? null : event.target.value })} placeholder={label('Unknown', 'Hindi alam')} /></Field>
      <Field label={label('Evidence', 'Batayan ng tala')}><select value={draft.evidence} onChange={event => setDraft({ ...draft, evidence: event.target.value as Evidence })}>{evidenceOptions(lang)}</select></Field>
      <Field label={label('Notes (optional)', 'Tala (opsyonal)')}><textarea rows={3} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></Field>
    </div>{error && <p role="alert" className="negative">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setDraft(null)}>{label('Cancel', 'Kanselahin')}</button><button type="submit" className="button primary">{label('Save expense', 'I-save ang gastos')}</button></div></form></Modal>}
  </>
}

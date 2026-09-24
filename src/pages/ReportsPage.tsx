import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, FileDown, Pencil, Plus, Printer, Trash2, Upload } from 'lucide-react'
import { db } from '../lib/db'
import { calculateBudget, calculateRecorded, seasonInput } from '../lib/calculations'
import { createBackup, parseBackup, restoreBackup, summarizeBackup } from '../lib/backup'
import { saleValue, sumMoney } from '../lib/sales'
import { saveReceiptRecord, saveSaleRecord } from '../lib/financialRecords'
import { download, money, number, today, tr, uid } from '../lib/format'
import Decimal from 'decimal.js'
import type { DecimalInput, GrainCondition, PageProps, Receipt, Sale, WorkspaceData } from '../types'
import { EmptyState, Field, Modal, PageHeading } from '../components/UI'
import { amountHelp, validAmount, validPositive } from './workflowHelpers'

type SaleDraft = Pick<Sale, 'date' | 'quantityKg' | 'pricePerKg' | 'condition' | 'buyer' | 'notes'>
type ReceiptDraft = Pick<Receipt, 'date' | 'amount' | 'notes'>
const conditionName = (condition: GrainCondition, lang: PageProps['lang']) => condition === 'fresh' ? tr(lang, 'Fresh palay', 'Basang palay') : tr(lang, 'Dried palay', 'Tuyong palay')
const csvCell = (value: unknown) => {
  const text = String(value ?? '')
  const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
const csvRow = (...cells: unknown[]) => cells.map(csvCell).join(',')

export default function ReportsPage({ data, season, lang, onSave }: PageProps) {
  const label = (en: string, fil: string) => tr(lang, en, fil)
  const budget = calculateBudget(seasonInput(season, data.budgetItems.filter(item => item.seasonId === season.id)))
  const recorded = calculateRecorded(season, data.expenses.filter(item => item.seasonId === season.id))
  const sales = useMemo(() => data.sales.filter(sale => sale.seasonId === season.id).sort((a, b) => b.date.localeCompare(a.date)), [data.sales, season.id])
  const receipts = useMemo(() => data.receipts.filter(receipt => receipt.seasonId === season.id), [data.receipts, season.id])
  const [actualOpen, setActualOpen] = useState(false)
  const [actualQuantity, setActualQuantity] = useState<DecimalInput>(null)
  const [actualPrice, setActualPrice] = useState<DecimalInput>(null)
  const [saleDraft, setSaleDraft] = useState<SaleDraft | null>(null)
  const [saleEdit, setSaleEdit] = useState<string | null>(null)
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null)
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null)
  const [receiptEdit, setReceiptEdit] = useState<string | null>(null)
  const [importData, setImportData] = useState<WorkspaceData | null>(null)
  const [importName, setImportName] = useState('')
  const [error, setError] = useState('')

  const receiptTotal = (saleId: string, excludingId?: string | null) => sumMoney(receipts.filter(receipt => receipt.saleId === saleId && receipt.id !== excludingId).map(receipt => receipt.amount))
  const gross = (sale: Sale) => saleValue(sale.quantityKg, sale.pricePerKg)
  const saleGross = sumMoney(sales.map(sale => new Decimal(gross(sale)).toFixed(2)))
  const received = sumMoney(receipts.filter(receipt => sales.some(sale => sale.id === receipt.saleId)).map(receipt => receipt.amount))
  const balance = (value: number, paid: number) => sumMoney([new Decimal(value).toFixed(2), new Decimal(paid).neg().toFixed(2)])
  const hasConditionMismatch = season.grainCondition !== season.priceCondition || sales.some(sale => sale.condition !== season.grainCondition)

  function openActual() {
    setActualQuantity(season.actualQuantityKg)
    setActualPrice(season.actualPricePerKg)
    setActualOpen(true)
    setError('')
  }

  async function saveActual(event: FormEvent) {
    event.preventDefault()
    if (!validAmount(actualQuantity) || !validAmount(actualPrice)) { setError(label('Enter nonnegative values up to 1 trillion with at most two decimal places, or leave them blank.', 'Maglagay ng halagang hindi negatibo hanggang 1 trilyon na may hanggang dalawang decimal, o iwang blangko.')); return }
    const ok = await onSave(() => db.seasons.update(season.id, { actualQuantityKg: actualQuantity, actualPricePerKg: actualPrice }), label('Actual harvest details saved.', 'Nai-save ang detalye ng aktuwal na ani.'))
    if (ok) setActualOpen(false)
  }

  function openSale(sale?: Sale) {
    setSaleEdit(sale?.id ?? null)
    setSaleDraft(sale ? { date: sale.date, quantityKg: sale.quantityKg, pricePerKg: sale.pricePerKg, condition: sale.condition, buyer: sale.buyer, notes: sale.notes } : { date: today(), quantityKg: '', pricePerKg: '', condition: season.grainCondition, buyer: '', notes: '' })
    setError('')
  }

  async function saveSale(event: FormEvent) {
    event.preventDefault()
    if (!saleDraft) return
    if (!saleDraft.date || !validPositive(saleDraft.quantityKg) || !validAmount(saleDraft.pricePerKg)) { setError(label('Enter a date, quantity above zero, and a nonnegative price per kg. Each value must be at most 1 trillion with up to two decimal places.', 'Maglagay ng petsa, daming higit sa sero, at presyong hindi negatibo bawat kilo. Bawat halaga ay dapat hanggang 1 trilyon at may hanggang dalawang decimal.')); return }
    const newGross = saleValue(saleDraft.quantityKg, saleDraft.pricePerKg)
    if (receiptTotal(saleEdit ?? '') > newGross) { setError(label('Existing receipts exceed this sale value. Edit the receipts first.', 'Lampas sa halaga ng bentang ito ang mga kasalukuyang resibo. Baguhin muna ang mga resibo.')); return }
    const sale: Sale = { ...saleDraft, id: saleEdit ?? uid(), seasonId: season.id, buyer: saleDraft.buyer.trim(), notes: saleDraft.notes.trim() }
    const ok = await onSave(() => saveSaleRecord(sale), label('Sale saved.', 'Nai-save ang benta.'))
    if (ok) setSaleDraft(null)
  }

  async function deleteSale(sale: Sale) {
    if (!window.confirm(label(`Delete this sale and its ${receipts.filter(receipt => receipt.saleId === sale.id).length} receipts?`, `Burahin ang bentang ito at ang ${receipts.filter(receipt => receipt.saleId === sale.id).length} resibo nito?`))) return
    await onSave(async () => { await db.transaction('rw', db.sales, db.receipts, async () => { await db.receipts.where('saleId').equals(sale.id).delete(); await db.sales.delete(sale.id) }) }, label('Sale and linked receipts deleted.', 'Nabura ang benta at mga kaugnay na resibo.'))
  }

  function openReceipt(saleId: string, receipt?: Receipt) {
    setReceiptSaleId(saleId)
    setReceiptEdit(receipt?.id ?? null)
    setReceiptDraft(receipt ? { date: receipt.date, amount: receipt.amount, notes: receipt.notes } : { date: today(), amount: '', notes: '' })
    setError('')
  }

  async function saveReceipt(event: FormEvent) {
    event.preventDefault()
    if (!receiptDraft || !receiptSaleId) return
    const sale = sales.find(item => item.id === receiptSaleId)
    if (!sale || !receiptDraft.date || !validAmount(receiptDraft.amount)) { setError(label('Enter a date and a nonnegative receipt amount up to 1 trillion with at most two decimal places.', 'Maglagay ng petsa at halagang hindi negatibo sa resibo hanggang 1 trilyon na may hanggang dalawang decimal.')); return }
    const existingReceipts = receipts.filter(receipt => receipt.saleId === sale.id && receipt.id !== receiptEdit).map(receipt => receipt.amount)
    if (sumMoney([...existingReceipts, receiptDraft.amount]) > gross(sale)) { setError(label('Receipt would exceed the unpaid sale balance.', 'Lalampas ang resibo sa natitirang balanse ng benta.')); return }
    const receipt: Receipt = { ...receiptDraft, id: receiptEdit ?? uid(), seasonId: season.id, saleId: sale.id, notes: receiptDraft.notes.trim() }
    const ok = await onSave(() => saveReceiptRecord(receipt), label('Receipt saved.', 'Nai-save ang resibo.'))
    if (ok) setReceiptDraft(null)
  }

  async function deleteReceipt(receipt: Receipt) {
    if (!window.confirm(label('Delete this receipt?', 'Burahin ang resibong ito?'))) return
    await onSave(() => db.receipts.delete(receipt.id), label('Receipt deleted.', 'Nabura ang resibo.'))
  }

  async function backup() {
    try { download(await createBackup(), `PaSiBudget-${today()}.json`) }
    catch { setError(label('Backup could not be created. Try again.', 'Hindi nagawa ang backup. Subukan muli.')) }
  }

  async function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportData(null)
    setError('')
    try { setImportData(parseBackup(await file.text())); setImportName(file.name) }
    catch { setError(label('This file is not a valid PaSiBudget backup. No data was changed.', 'Hindi wastong PaSiBudget backup ang file na ito. Walang nabagong datos.')) }
    event.target.value = ''
  }

  async function importBackup() {
    if (!importData) return
    if (!window.confirm(label('Add copies of the farms, seasons, and records in this backup to this device?', 'Magdagdag ng mga kopya ng bukid, panahon, at tala mula sa backup na ito sa device na ito?'))) return
    const ok = await onSave(() => restoreBackup(importData), label('Backup restored.', 'Naibalik ang backup.'))
    if (ok) setImportData(null)
  }

  function exportCsv() {
    const rows = [
      csvRow(label('PaSiBudget report', 'Ulat ng PaSiBudget'), season.name),
      csvRow(label('Metric', 'Sukatan'), label('Value', 'Halaga'), label('Status / note', 'Katayuan / tala')),
      csvRow(label('Planned production value', 'Planong halaga ng ani'), budget.productionValue ?? '', label('Projected, not cash received', 'Tinataya, hindi natanggap na salapi')),
      csvRow(label('Planned cash costs', 'Planong salaping gastos'), budget.cash.knownTotal, budget.cash.complete ? label('Complete', 'Kumpleto') : label('Known items only', 'Mga kilalang item lamang')),
      csvRow(label('Planned full costs', 'Planong buong gastos'), budget.full.knownTotal, budget.full.complete ? label('Complete', 'Kumpleto') : label('Known items only', 'Mga kilalang item lamang')),
      csvRow(label('Recorded production value', 'Naitalang halaga ng ani'), recorded.productionValue ?? '', label('Harvest x price, not receipts', 'Ani x presyo, hindi mga resibo')),
      csvRow(label('Recorded cash costs', 'Naitalang salaping gastos'), recorded.cash.knownTotal, recorded.cash.complete ? label('Complete', 'Kumpleto') : label('Known items only', 'Mga kilalang item lamang')),
      csvRow(label('Recorded full costs', 'Naitalang buong gastos'), recorded.full.knownTotal, recorded.full.complete ? label('Complete', 'Kumpleto') : label('Known items only', 'Mga kilalang item lamang')),
      csvRow(label('Sales value', 'Halaga ng mga benta'), saleGross), csvRow(label('Receipts', 'Mga natanggap'), received), csvRow(label('Unpaid balance', 'Hindi pa nabayaran'), balance(saleGross, received)),
      '', csvRow(label('Sales', 'Mga benta')),
      csvRow(label('Date', 'Petsa'), label('Buyer', 'Mamimili'), label('Quantity kg', 'Dami kg'), label('Price per kg', 'Presyo bawat kg'), label('Condition', 'Kondisyon'), label('Sale value', 'Halaga ng benta'), label('Received', 'Natanggap'), label('Unpaid', 'Hindi pa nabayaran')),
      ...sales.map(sale => csvRow(sale.date, sale.buyer, sale.quantityKg, sale.pricePerKg, conditionName(sale.condition, lang), gross(sale), receiptTotal(sale.id), balance(gross(sale), receiptTotal(sale.id)))),
      '', csvRow(label('Receipts', 'Mga resibo')),
      csvRow(label('Sale date', 'Petsa ng benta'), label('Receipt date', 'Petsa ng resibo'), label('Amount', 'Halaga'), label('Notes', 'Tala')),
      ...receipts.map(receipt => csvRow(sales.find(sale => sale.id === receipt.saleId)?.date ?? '', receipt.date, receipt.amount, receipt.notes)),
    ]
    rows.push('', csvRow(label('Calculation details', 'Mga detalye ng pagkalkula')))
    rows.push(csvRow(label('Measure', 'Sukatan'), label('Planned cash', 'Planong salapi'), label('Planned full cost', 'Planong buong gastos'), label('Recorded cash', 'Naitalang salapi'), label('Recorded full cost', 'Naitalang buong gastos')))
    const cases = [budget.cash, budget.full, recorded.cash, recorded.full]
    rows.push(csvRow(label('Fixed costs', 'Nakapirming gastos'), ...cases.map(value => value.fixedCost)))
    rows.push(csvRow(label('Variable cost per kg', 'Gastos na nagbabago bawat kilo'), ...cases.map(value => value.variableRate)))
    rows.push(csvRow(label('Estimated return', 'Tinatayang natitira'), ...cases.map(value => value.estimatedReturn ?? '')))
    rows.push(csvRow(label('Break-even price per kg', 'Presyong pantapat bawat kilo'), ...cases.map(value => value.breakEvenPrice ?? '')))
    rows.push(csvRow(label('Break-even quantity kg', 'Daming pantapat kg'), ...cases.map(value => value.breakEvenQuantityStatus === 'impossible' ? label('Not reachable', 'Hindi maaabot') : value.breakEvenQuantity ?? '')))
    rows.push(csvRow(label('Complete inputs', 'Kumpletong datos'), ...cases.map(value => value.complete ? label('Yes', 'Oo') : label('No', 'Hindi'))))
    rows.push(csvRow(label('Assumption', 'Palagay'), label('Fixed + per-kg cost x harvest quantity. Unknown values remain unknown. Receipts are not production value.', 'Nakapirming gastos + gastos bawat kilo x ani. Ang hindi alam ay mananatiling hindi alam. Ang resibo ay hindi halaga ng ani.')))
    download('\uFEFF' + rows.join('\r\n'), `PaSiBudget-report-${season.id}-${today()}.csv`, 'text/csv;charset=utf-8')
  }

  const metric = (title: string, result: number | null, help?: string, unit?: string) => <div className="stat-card"><span className="eyebrow">{title}</span><strong>{unit === 'kg' ? `${number(result, 2)}${result === null ? '' : ' kg'}` : money(result)}</strong>{help && <span className="muted">{help}</span>}</div>
  const status = (complete: boolean) => complete ? label('Complete', 'Kumpleto') : label('Known amounts only; conclusion unavailable', 'Mga kilalang halaga lamang; walang sapat na batayan sa konklusyon')
  const breakEvenQuantity = (value: typeof budget.cash) => value.breakEvenQuantityStatus === 'impossible'
    ? label('Not reachable at this price', 'Hindi maaabot sa presyong ito')
    : value.breakEvenQuantityStatus === 'unavailable' ? '—' : `${number(value.breakEvenQuantity, 2)} kg`

  return <>
    <PageHeading eyebrow={label('Evidence & records', 'Batayan at mga tala')} title={label('Reports', 'Mga ulat')} description={label('Compare the plan with recorded results, sales, and cash actually received.', 'Ihambing ang plano sa naitalang resulta, benta, at salaping tunay na natanggap.')} actions={<div className="form-actions"><button className="button secondary" onClick={exportCsv}><FileDown size={17} /> {label('Export CSV', 'I-export ang CSV')}</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} /> {label('Print', 'I-print')}</button></div>} />
    {error && !actualOpen && !saleDraft && !receiptDraft && <p role="alert" className="notice negative">{error}</p>}
    {hasConditionMismatch && <div className="notice section-gap">{label('Grain conditions differ across harvest, price, or sales. Compare values only when the conditions match; no conversion is assumed.', 'Magkakaiba ang kondisyon ng palay sa ani, presyo, o benta. Ihambing lamang ang mga halaga kapag magkatugma ang kondisyon; walang ipinapalagay na conversion.')}</div>}
    <section className="section-gap"><div className="card-header"><h2>{label('Planned outlook', 'Planong kalagayan')}</h2><span className="badge gold">{label('Estimate', 'Tantiya')}</span></div><div className="grid-3">{metric(label('Production value', 'Halaga ng ani'), budget.productionValue, label('Planned kg × planned price', 'Planong kg × planong presyo'))}{metric(label('Cash costs', 'Salaping gastos'), budget.cash.knownTotal, status(budget.cash.complete))}{metric(label('Full costs', 'Buong gastos'), budget.full.knownTotal, status(budget.full.complete))}{metric(label('Cash return', 'Natitirang salapi'), budget.cash.estimatedReturn, label('Value less cash costs', 'Halaga bawas salaping gastos'))}{metric(label('Full-cost return', 'Natitira matapos ang buong gastos'), budget.full.estimatedReturn, label('Value less all costs', 'Halaga bawas lahat ng gastos'))}{metric(label('Full-cost break-even price / kg', 'Presyong pantapat sa buong gastos / kg'), budget.full.breakEvenPrice, label('Available only with complete, matching inputs', 'Lalabas lamang kung kumpleto at magkatugma ang datos'))}</div></section>
    <section className="section-gap"><div className="card-header"><h2>{label('Recorded outcome', 'Naitalang resulta')}</h2><button className="button secondary small" onClick={openActual}><Pencil size={16} /> {label('Edit actual harvest', 'Baguhin ang aktuwal na ani')}</button></div><div className="grid-3">{metric(label('Actual harvest', 'Aktuwal na ani'), recorded.quantityKg, undefined, 'kg')}{metric(label('Actual farmgate price / kg', 'Aktuwal na presyo sa bukid / kg'), recorded.pricePerKg)}{metric(label('Production value', 'Halaga ng ani'), recorded.productionValue, label('Actual kg × actual price; not receipts', 'Aktuwal na kg × presyo; hindi mga resibo'))}{metric(label('Recorded cash costs', 'Naitalang salaping gastos'), recorded.cash.knownTotal, status(recorded.cash.complete))}{metric(label('Recorded full costs', 'Naitalang buong gastos'), recorded.full.knownTotal, status(recorded.full.complete))}{metric(label('Recorded full-cost return', 'Natitira matapos ang buong naitalang gastos'), recorded.full.estimatedReturn, label('Only with complete comparable inputs', 'Kung kumpleto at magkatugma lamang ang datos'))}</div><p className="muted">{label('A recorded outcome uses your actual harvest and recorded expenses. It does not add the planned budget to actual costs.', 'Ginagamit ng naitalang resulta ang aktuwal na ani at mga naitalang gastos. Hindi idinaragdag ang planong badyet sa aktuwal na gastos.')}</p></section>
    <section className="card section-gap"><div className="card-header"><h2>{label('Comparison details', 'Mga detalye ng paghahambing')}</h2></div><div className="table-wrap"><table className="data-table"><thead><tr><th>{label('Measure', 'Sukatan')}</th><th>{label('Planned cash', 'Planong salapi')}</th><th>{label('Planned full cost', 'Planong buong gastos')}</th><th>{label('Recorded cash', 'Naitalang salapi')}</th><th>{label('Recorded full cost', 'Naitalang buong gastos')}</th></tr></thead><tbody>
      <tr><td>{label('Fixed costs', 'Nakapirming gastos')}</td>{[budget.cash, budget.full, recorded.cash, recorded.full].map((value, index) => <td className="amount" key={index}>{money(value.fixedCost)}</td>)}</tr>
      <tr><td>{label('Variable cost per kg', 'Gastos na nagbabago bawat kilo')}</td>{[budget.cash, budget.full, recorded.cash, recorded.full].map((value, index) => <td className="amount" key={index}>{money(value.variableRate)}</td>)}</tr>
      <tr><td>{label('Estimated return', 'Tinatayang natitira')}</td>{[budget.cash, budget.full, recorded.cash, recorded.full].map((value, index) => <td className="amount" key={index}>{money(value.estimatedReturn)}</td>)}</tr>
      <tr><td>{label('Break-even price per kg', 'Presyong pantapat bawat kilo')}</td>{[budget.cash, budget.full, recorded.cash, recorded.full].map((value, index) => <td className="amount" key={index}>{money(value.breakEvenPrice)}</td>)}</tr>
      <tr><td>{label('Break-even quantity', 'Daming pantapat')}</td>{[budget.cash, budget.full, recorded.cash, recorded.full].map((value, index) => <td className="amount" key={index}>{breakEvenQuantity(value)}</td>)}</tr>
    </tbody></table></div><p className="muted">{label('Fixed + per-kg cost × harvest quantity. Return = production value − cost. Break-even values require complete cost entries, known quantity and price, and matching grain conditions.', 'Nakapirming gastos + gastos bawat kilo × dami ng ani. Natitira = halaga ng ani − gastos. Kailangan ng kumpletong gastos, alam na dami at presyo, at magkatugmang kondisyon ng palay para sa pantapat na halaga.')}</p></section>
    <section className="section-gap"><div className="card-header"><h2>{label('Sales and receipts', 'Mga benta at resibo')}</h2><button className="button primary small" onClick={() => openSale()}><Plus size={16} /> {label('Add sale', 'Magdagdag ng benta')}</button></div><div className="grid-3">{metric(label('Sales value', 'Halaga ng mga benta'), saleGross, label('Quantity × agreed price', 'Dami × napagkasunduang presyo'))}{metric(label('Cash received', 'Salaping natanggap'), received, label('Only entered receipts', 'Mga naitalang resibo lamang'))}{metric(label('Unpaid balance', 'Hindi pa nabayaran'), balance(saleGross, received), label('Sales less receipts', 'Benta bawas resibo'))}</div>
      {sales.length === 0 ? <EmptyState title={label('No sales recorded', 'Wala pang naitalang benta')} description={label('Add sales when rice is sold. Add receipts as payments arrive, including partial payments.', 'Itala ang mga benta kapag naibenta ang palay. Idagdag ang mga resibo habang dumarating ang bayad, kabilang ang bahagyang bayad.')} action={<button className="button primary" onClick={() => openSale()}>{label('Add sale', 'Magdagdag ng benta')}</button>} /> : <div className="card table-wrap section-gap"><table className="data-table"><thead><tr><th>{label('Sale', 'Benta')}</th><th>{label('Quantity / price', 'Dami / presyo')}</th><th>{label('Value', 'Halaga')}</th><th>{label('Received', 'Natanggap')}</th><th>{label('Unpaid', 'Hindi pa nabayaran')}</th><th>{label('Actions', 'Gawain')}</th></tr></thead><tbody>{sales.map(sale => <tr key={sale.id}><td><strong>{sale.buyer || label('Buyer not named', 'Walang pangalan ng mamimili')}</strong><div className="muted">{sale.date} · {conditionName(sale.condition, lang)}</div>{sale.condition !== season.grainCondition && <small className="badge gold">{label('Condition differs', 'Iba ang kondisyon')}</small>}{sale.notes && <div className="muted">{sale.notes}</div>}</td><td>{number(Number(sale.quantityKg), 2)} kg<br /><small className="muted">{money(Number(sale.pricePerKg))}/kg</small></td><td className="amount">{money(gross(sale))}</td><td className="amount">{money(receiptTotal(sale.id))}</td><td className="amount">{money(balance(gross(sale), receiptTotal(sale.id)))}</td><td><div className="form-actions"><button className="button secondary small" onClick={() => openReceipt(sale.id)}>{label('Add receipt', 'Magdagdag ng resibo')}</button><button className="button ghost small" aria-label={label('Edit sale', 'Baguhin ang benta')} onClick={() => openSale(sale)}><Pencil size={16} /></button><button className="button ghost small" aria-label={label('Delete sale', 'Burahin ang benta')} onClick={() => void deleteSale(sale)}><Trash2 size={16} /></button></div>{receipts.filter(receipt => receipt.saleId === sale.id).map(receipt => <div key={receipt.id} className="muted" style={{ marginTop: 8 }}>{receipt.date}: {money(Number(receipt.amount))} <button className="button ghost small" onClick={() => openReceipt(sale.id, receipt)}>{label('Edit', 'Baguhin')}</button><button className="button ghost small" onClick={() => void deleteReceipt(receipt)}>{label('Delete', 'Burahin')}</button></div>)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="card section-gap"><div className="card-header"><h2>{label('Data and backup', 'Datos at backup')}</h2></div><p className="muted">{label('This app stores records on this device. Download a backup before clearing browser data or moving devices.', 'Nakatago sa device na ito ang mga tala. Mag-download ng backup bago burahin ang datos ng browser o lumipat ng device.')}</p><div className="form-actions"><button className="button secondary" onClick={() => void backup()}><Download size={17} /> {label('Download backup', 'I-download ang backup')}</button><label className="button secondary" htmlFor="restore-file"><Upload size={17} /> {label('Choose backup to restore', 'Pumili ng backup na ibabalik')}</label><input id="restore-file" className="visually-hidden" type="file" accept=".json,application/json" onChange={event => void readBackup(event)} /></div>{importData && <div className="notice section-gap"><div><strong>{label('Restore preview', 'Silip ng ibabalik na datos')}: {importName}</strong><p>{(() => { const s = summarizeBackup(importData); return `${s.farms} ${label('farms', 'bukid')} · ${s.seasons} ${label('seasons', 'panahon')} · ${s.expenses} ${label('expenses', 'gastos')}` })()}</p><p>{label('Restoring adds copies of these records. Existing records stay on this device.', 'Magdadagdag ng mga kopya ang pagbabalik. Mananatili sa device na ito ang kasalukuyang mga tala.')}</p><div className="form-actions"><button className="button primary" onClick={() => void importBackup()}>{label('Restore this backup', 'Ibalik ang backup na ito')}</button><button className="button ghost" onClick={() => setImportData(null)}>{label('Cancel', 'Kanselahin')}</button></div></div></div>}</section>
    <div className="notice section-gap">{label('Use these figures as a private planning and record-keeping aid. Unknown inputs remain unknown; no local buyer price, yield forecast, or credit decision is inferred.', 'Gamitin ang mga numerong ito sa pribadong pagpaplano at pagtatala. Ang hindi alam na datos ay mananatiling hindi alam; walang hinuhulaang presyo ng lokal na mamimili, ani, o desisyon sa pautang.')}</div>
    {actualOpen && <Modal title={label('Actual harvest and price', 'Aktuwal na ani at presyo')} onClose={() => setActualOpen(false)}><form onSubmit={event => void saveActual(event)}><div className="form-grid"><Field label={label('Actual harvested kg', 'Aktuwal na kilo ng ani')} hint={amountHelp(lang)}><input type="number" inputMode="decimal" min="0" step="0.01" value={actualQuantity ?? ''} onChange={event => setActualQuantity(event.target.value || null)} /></Field><Field label={label('Actual farmgate price per kg (₱)', 'Aktuwal na presyo sa bukid bawat kilo (₱)')} hint={amountHelp(lang)}><input type="number" inputMode="decimal" min="0" step="0.01" value={actualPrice ?? ''} onChange={event => setActualPrice(event.target.value || null)} /></Field></div>{error && <p role="alert" className="negative">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setActualOpen(false)}>{label('Cancel', 'Kanselahin')}</button><button className="button primary">{label('Save actual result', 'I-save ang aktuwal na resulta')}</button></div></form></Modal>}
    {saleDraft && <Modal title={saleEdit ? label('Edit sale', 'Baguhin ang benta') : label('Add sale', 'Magdagdag ng benta')} onClose={() => setSaleDraft(null)}><form onSubmit={event => void saveSale(event)}><div className="form-grid"><Field label={label('Date sold', 'Petsa ng benta')}><input type="date" required value={saleDraft.date} onChange={event => setSaleDraft({ ...saleDraft, date: event.target.value })} /></Field><Field label={label('Buyer (optional)', 'Mamimili (opsyonal)')}><input value={saleDraft.buyer} onChange={event => setSaleDraft({ ...saleDraft, buyer: event.target.value })} /></Field><Field label={label('Quantity sold (kg)', 'Daming naibenta (kg)')}><input type="number" inputMode="decimal" min="0.01" step="0.01" required value={saleDraft.quantityKg} onChange={event => setSaleDraft({ ...saleDraft, quantityKg: event.target.value })} /></Field><Field label={label('Agreed price per kg (₱)', 'Napagkasunduang presyo bawat kilo (₱)')}><input type="number" inputMode="decimal" min="0" step="0.01" required value={saleDraft.pricePerKg} onChange={event => setSaleDraft({ ...saleDraft, pricePerKg: event.target.value })} /></Field><Field label={label('Grain condition', 'Kondisyon ng palay')}><select value={saleDraft.condition} onChange={event => setSaleDraft({ ...saleDraft, condition: event.target.value as GrainCondition })}><option value="fresh">{conditionName('fresh', lang)}</option><option value="dried">{conditionName('dried', lang)}</option></select></Field><Field label={label('Notes (optional)', 'Tala (opsyonal)')}><textarea rows={3} value={saleDraft.notes} onChange={event => setSaleDraft({ ...saleDraft, notes: event.target.value })} /></Field></div>{saleDraft.condition !== season.grainCondition && <p className="notice">{label('This sale condition differs from the season harvest condition. No weight or price conversion will be assumed.', 'Iba ang kondisyon ng bentang ito sa kondisyon ng ani sa panahon. Walang ipinapalagay na conversion sa timbang o presyo.')}</p>}{error && <p role="alert" className="negative">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setSaleDraft(null)}>{label('Cancel', 'Kanselahin')}</button><button className="button primary">{label('Save sale', 'I-save ang benta')}</button></div></form></Modal>}
    {receiptDraft && <Modal title={receiptEdit ? label('Edit receipt', 'Baguhin ang resibo') : label('Add receipt', 'Magdagdag ng resibo')} onClose={() => setReceiptDraft(null)}><form onSubmit={event => void saveReceipt(event)}><p className="muted">{label('Enter the amount actually received for this sale. Partial payments can be recorded separately.', 'Ilagay ang halagang tunay na natanggap para sa bentang ito. Maaaring magkahiwalay na itala ang mga bahagyang bayad.')}</p><div className="form-grid"><Field label={label('Date received', 'Petsa ng pagtanggap')}><input type="date" required value={receiptDraft.date} onChange={event => setReceiptDraft({ ...receiptDraft, date: event.target.value })} /></Field><Field label={label('Amount received (₱)', 'Halagang natanggap (₱)')}><input type="number" inputMode="decimal" min="0" step="0.01" required value={receiptDraft.amount} onChange={event => setReceiptDraft({ ...receiptDraft, amount: event.target.value })} /></Field><Field label={label('Notes (optional)', 'Tala (opsyonal)')}><textarea rows={3} value={receiptDraft.notes} onChange={event => setReceiptDraft({ ...receiptDraft, notes: event.target.value })} /></Field></div>{error && <p role="alert" className="negative">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={() => setReceiptDraft(null)}>{label('Cancel', 'Kanselahin')}</button><button className="button primary">{label('Save receipt', 'I-save ang resibo')}</button></div></form></Modal>}
  </>
}

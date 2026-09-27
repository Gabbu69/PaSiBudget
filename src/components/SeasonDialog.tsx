import { useState } from 'react'
import type { FormEvent } from 'react'
import Decimal from 'decimal.js'
import { db, createSeason } from '../lib/db'
import { Field, Modal } from './UI'
import { optionalDecimal, tr, uid, categoryLabel } from '../lib/format'
import type { Farm, Season, BudgetItem, Lang, WorkspaceData, PageProps, GrainCondition } from '../types'
import { categories } from '../types'
import { useDirtyDraft, useEditGuard } from './EditGuard'
import { validDecimal } from '../lib/validation'
import { sacksToKilograms } from '../lib/harvest'

export default function SeasonDialog({ data, lang, onSave, onClose, onCreated, editing }: { data: WorkspaceData; lang: Lang; onSave: PageProps['onSave']; onClose: () => void; onCreated: (id: string) => void; editing?: Season }) {
  const guard = useEditGuard()
  const close = () => guard.attempt(onClose)
  const realFarms = data.farms.filter(f => !f.isSample)
  const [farmId, setFarmId] = useState(editing?.farmId || realFarms[0]?.id || 'new')
  const [farmName, setFarmName] = useState('')
  const [name, setName] = useState(editing?.name || '')
  const [area, setArea] = useState(editing?.areaHa || '')
  const [quantity, setQuantity] = useState(editing?.quantityKg || '')
  const [unit, setUnit] = useState('kg'); const [sackWeight, setSackWeight] = useState('')
  const [price, setPrice] = useState(editing?.pricePerKg || '')
  const [condition, setCondition] = useState<GrainCondition>(editing?.grainCondition || 'fresh')
  const [priceCondition, setPriceCondition] = useState<GrainCondition>(editing?.priceCondition || 'fresh')
  const [planting, setPlanting] = useState(editing?.plantingDate || '')
  const [harvest, setHarvest] = useState(editing?.harvestDate || '')
  const [copyId, setCopyId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const fields = { farmId, farmName, name, area, quantity, unit, sackWeight, price, condition, priceCondition, planting, harvest, copyId }
  const [original] = useState(fields)
  useDirtyDraft(fields, original)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    const values = [area, quantity, price, ...(unit === 'sacks' ? [sackWeight] : [])]
    if (values.some(v => v.trim() !== '' && !validDecimal(v)) || (area !== '' && Number(area) <= 0) || (unit === 'sacks' && (!sackWeight || Number(sackWeight) <= 0))) { setError(tr(lang, 'Enter valid amounts up to 1 trillion. Area and sack weight must be greater than zero.', 'Maglagay ng wastong halaga hanggang 1 trilyon. Dapat higit sa zero ang lawak at timbang ng sako.')); return }
    if (planting && harvest && harvest < planting) { setError(tr(lang, 'Harvest date must be on or after planting.', 'Dapat kasunod o kapareho ng pagtatanim ang petsa ng ani.')); return }
    let q: string | null
    try { q = quantity.trim() === '' ? null : unit === 'sacks' ? sacksToKilograms(quantity, sackWeight) : new Decimal(quantity).toFixed() }
    catch { setError(tr(lang,'Converted harvest must not exceed 1 trillion kilograms.','Hindi dapat lumampas sa 1 trilyong kilo ang ani matapos i-convert.')); return }
    const farm: Farm = farmId === 'new' ? { id: uid(), name: farmName.trim(), location: 'M’lang, North Cotabato', isSample: false, createdAt: new Date().toISOString() } : data.farms.find(f => f.id === farmId)!
    const season: Season = { ...(editing || {}), id: editing?.id || uid(), farmId: farm.id, name: name.trim(), areaHa: optionalDecimal(area)===null?null:new Decimal(area).toFixed(), quantityKg: q, pricePerKg: optionalDecimal(price)===null?null:new Decimal(price).toFixed(), grainCondition: condition, priceCondition, plantingDate: planting, harvestDate: harvest, actualQuantityKg: editing?.actualQuantityKg ?? null, actualPricePerKg: editing?.actualPricePerKg ?? null, actualGrainCondition: editing?.actualGrainCondition ?? null, actualPriceCondition: editing?.actualPriceCondition ?? null, budgetComplete: editing?.budgetComplete || false, recordsComplete: editing?.recordsComplete || false, archived: editing?.archived || false, createdAt: editing?.createdAt || new Date().toISOString() }
    const items: BudgetItem[] = copyId ? data.budgetItems.filter(i => i.seasonId === copyId).map(i => ({ ...i, id: uid(), seasonId: season.id })) : categories.map(category => ({ id: uid(), seasonId: season.id, name: categoryLabel(category, lang), category, kind: 'cash', basis: 'fixed', amount: null, evidence: 'estimate', notes: '' }))
    setBusy(true)
    const ok = await onSave(() => editing ? db.seasons.put(season) : createSeason(farm, season, items), tr(lang, 'Season saved on this device.', 'Na-save ang taniman sa device na ito.'))
    setBusy(false); if (ok) { onCreated(season.id); onClose() }
  }
  return <Modal title={editing ? tr(lang, 'Season details', 'Detalye ng taniman') : tr(lang, 'Start a new season', 'Magsimula ng bagong taniman')} onClose={close} wide><form onSubmit={submit} className="section-gap">
    <p className="muted">{tr(lang, 'Give your season a home. You can fill in harvest and price assumptions later.', 'Simulan ang tala ng iyong taniman. Maaaring idagdag ang inaasahang ani at presyo sa ibang pagkakataon.')}</p>
    <div className="form-grid">
      {!editing && <Field label={tr(lang, 'Farm', 'Sakahan')}><select value={farmId} onChange={e => setFarmId(e.target.value)}>{realFarms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}<option value="new">{tr(lang, '+ Add a farm', '+ Magdagdag ng sakahan')}</option></select></Field>}
      {farmId === 'new' && <Field label={tr(lang, 'Farm nickname', 'Pangalan ng sakahan')}><input required maxLength={80} placeholder={tr(lang, 'e.g. Riverside farm', 'hal. Sakahan sa tabing-ilog')} value={farmName} onChange={e => setFarmName(e.target.value)} /></Field>}
      <Field label={tr(lang, 'Season name', 'Pangalan ng taniman')}><input required maxLength={80} placeholder={tr(lang, 'e.g. Wet season 2026', 'hal. Tag-ulan 2026')} value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label={tr(lang, 'Farm area (hectares)', 'Lawak (ektarya)')}><input type="number" min="0.001" step="any" value={area} onChange={e => setArea(e.target.value)} placeholder="—" /></Field>
      <Field label={tr(lang, 'Planting date', 'Petsa ng pagtatanim')}><input type="date" value={planting} onChange={e => setPlanting(e.target.value)} /></Field>
      <Field label={tr(lang, 'Expected harvest date', 'Inaasahang petsa ng ani')}><input type="date" value={harvest} onChange={e => setHarvest(e.target.value)} /></Field>
      <Field label={tr(lang, 'Expected harvest', 'Inaasahang ani')}><input type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder={tr(lang, 'Unknown for now', 'Hindi pa alam')} /></Field>
      <Field label={tr(lang, 'Harvest unit', 'Yunit ng ani')}><select value={unit} onChange={e => setUnit(e.target.value)}><option value="kg">{tr(lang, 'Kilograms (kg)', 'Kilogramo (kg)')}</option><option value="sacks">{tr(lang, 'Sacks', 'Sako')}</option></select></Field>
      {unit === 'sacks' && <Field label={tr(lang, 'Kilograms per sack', 'Kilogramo bawat sako')} hint={tr(lang, 'Enter your actual conversion; sack weights vary.', 'Ilagay ang aktuwal na timbang ng iyong sako.')}><input required type="number" min="0.001" step="any" value={sackWeight} onChange={e => setSackWeight(e.target.value)} /></Field>}
      <Field label={tr(lang, 'Harvest condition', 'Kondisyon ng ani')}><select value={condition} onChange={e => setCondition(e.target.value as GrainCondition)}><option value="fresh">{tr(lang, 'Fresh palay', 'Basang palay')}</option><option value="dried">{tr(lang, 'Dried palay', 'Tuyong palay')}</option></select></Field>
      <Field label={tr(lang, 'Assumed selling price (₱/kg)', 'Ipinapalagay na presyo (₱/kg)')}><input type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} placeholder={tr(lang, 'Your assumption', 'Iyong palagay')} /></Field>
      <Field label={tr(lang, 'Price applies to', 'Ang presyo ay para sa')}><select value={priceCondition} onChange={e => setPriceCondition(e.target.value as GrainCondition)}><option value="fresh">{tr(lang, 'Fresh palay', 'Basang palay')}</option><option value="dried">{tr(lang, 'Dried palay', 'Tuyong palay')}</option></select></Field>
      {!editing && <Field label={tr(lang, 'Copy a previous budget', 'Kopyahin ang dating badyet')}><select value={copyId} onChange={e => setCopyId(e.target.value)}><option value="">{tr(lang, 'Start with blank categories', 'Magsimula sa blangkong mga kategorya')}</option>{data.seasons.filter(s => realFarms.some(f => f.id === s.farmId)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
    </div>
    {condition !== priceCondition && <div className="notice">{tr(lang, 'Harvest and price conditions do not match. Results will stay unavailable until corrected.', 'Hindi tugma ang kondisyon ng ani at presyo. Itatago muna ang mga resulta hanggang maitama.')}</div>}
    {error && <p role="alert" className="negative">{error}</p>}
    <div className="form-actions"><button className="button secondary" type="button" onClick={close}>{tr(lang, 'Cancel', 'Kanselahin')}</button><button className="button primary" disabled={busy}>{busy ? tr(lang, 'Saving…', 'Sine-save…') : tr(lang, 'Save season', 'I-save ang taniman')}</button></div>
  </form></Modal>
}

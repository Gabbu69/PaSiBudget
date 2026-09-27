import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { LayoutDashboard, Wallet, ReceiptText, SlidersHorizontal, FileText, ArrowRight, Plus, ChevronDown, Check, HardDrive, Settings, Download, Sprout, X, Archive, RotateCcw, CloudOff, ExternalLink, Info } from 'lucide-react'
import { db, loadWorkspace } from './lib/db'
import { createSampleWorkspace } from './lib/sample'
import { requestBackupDownload, backupReminderDue } from './lib/backupDownload'
import { BackupStatus } from './components/BackupStatus'
import { EditGuardProvider, useEditGuard } from './components/EditGuard'
import { tr } from './lib/format'
import type { Lang, WorkspaceData, PageProps } from './types'
import { RiceGrain, RiceMark } from './components/Rice'
import { Modal, SavingContext } from './components/UI'
import SeasonDialog from './components/SeasonDialog'
import RestoreDialog from './components/RestoreDialog'
import OverviewPage from './pages/OverviewPage'
import Welcome from './pages/Welcome'
import BudgetPage from './pages/BudgetPage'
import ExpensesPage from './pages/ExpensesPage'
import ScenariosPage from './pages/ScenariosPage'
import ReportsPage from './pages/ReportsPage'

const tabs = [
  { id:'overview',en:'Overview',fil:'Buod',icon:LayoutDashboard },
  { id:'budget',en:'My budget',fil:'Badyet',icon:Wallet },
  { id:'expenses',en:'Expenses',fil:'Mga gastos',icon:ReceiptText },
  { id:'scenarios',en:'Scenarios',fil:'Mga sitwasyon',icon:SlidersHorizontal },
  { id:'reports',en:'Reports',fil:'Mga ulat',icon:FileText }
]
const local = (key:string,fallback:string) => { try{return localStorage.getItem(key)||fallback}catch{return fallback} }
const setLocal = (key:string,value:string) => { try{localStorage.setItem(key,value)}catch{/* IndexedDB remains the records store. */} }
export default function App() {
  const [lang,setLang] = useState<Lang>(local('pasibudget-lang','en')==='fil'?'fil':'en')
  return <EditGuardProvider lang={lang}><WorkspaceApp lang={lang} setLang={setLang}/></EditGuardProvider>
}
function WorkspaceApp({lang,setLang}:{lang:Lang;setLang:(value:Lang)=>void}) {
  const guard = useEditGuard()
  const [openExpense,setOpenExpense] = useState(false)
  const [draftRevision,setDraftRevision] = useState(0)
  const [theme,setTheme] = useState(document.documentElement.dataset.theme||'light')
  const [page,setPage] = useState(tabs.some(t=>t.id===location.hash.slice(1))?location.hash.slice(1):'overview')
  const [selectedId,setSelectedId] = useState(local('pasibudget-season',''))
  const [seasonDialog,setSeasonDialog] = useState<'new'|'edit'|null>(null)
  const [settings,setSettings] = useState(false)
  const [restoreOpen,setRestoreOpen] = useState(false)
  const [toast,setToast] = useState<{message:string;error:boolean}|null>(null)
  const [saving,setSaving] = useState(false)
  const savingRef = useRef(false)
  const [online,setOnline] = useState(navigator.onLine)
  const [bootError,setBootError] = useState(false)
  const [storage,setStorage] = useState<{usage:number;persistent:boolean}|null>(null)
  const data = useLiveQuery(async()=>{try{return await loadWorkspace()}catch{setBootError(true);return undefined}},[])
  const { offlineReady:[offlineReady],needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker } = useRegisterSW()
  const activeSeasons = data?.seasons.filter(s=>!s.archived)||[]
  const season = activeSeasons.find(s=>s.id===selectedId)||activeSeasons[0]
  const farm = data?.farms.find(f=>f.id===season?.farmId)
  const sample = farm?.isSample||false
  const notify = useCallback((message:string,error=false)=>setToast({message,error}),[])
  const onSave:PageProps['onSave'] = useCallback(async(operation,success)=>{
    if(savingRef.current) return false
    savingRef.current=true
    guard.setSaving(true)
    setSaving(true)
    try { await operation(); notify(success||tr(lang,'Saved on this device.','Na-save sa device na ito.'));return true }
    catch(error) { console.error('Local save failed',error);notify(tr(lang,'Could not save. Your form is still here. Check device storage and try again.','Hindi na-save. Nananatili ang iyong form. Suriin ang storage at subukang muli.'),true);return false }
    finally {savingRef.current=false;guard.setSaving(false);setSaving(false)}
  },[lang,notify,guard.setSaving])
  useEffect(()=>{if(toast){const id=setTimeout(()=>setToast(null),toast.error?10000:4500);return()=>clearTimeout(id)}},[toast])
  useEffect(()=>{document.documentElement.lang=lang;setLocal('pasibudget-lang',lang)},[lang])
  useEffect(()=>{document.documentElement.dataset.theme=theme;setLocal('pasibudget-theme',theme);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#14261f':'#174f3c')},[theme])
  useEffect(()=>{if(season)setLocal('pasibudget-season',season.id)},[season])
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
  useEffect(()=>{const update=()=>{const next=tabs.some(t=>t.id===location.hash.slice(1))?location.hash.slice(1):'overview';if(next===page)return;history.replaceState(null,'',`#${page}`);guard.attempt(()=>{setOpenExpense(false);setPage(next);history.pushState(null,'',`#${next}`)})};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[page,guard.attempt])
  useEffect(()=>{if(settings&&navigator.storage){void Promise.all([navigator.storage.estimate(),navigator.storage.persisted()]).then(([estimate,persistent])=>setStorage({usage:estimate.usage||0,persistent})).catch(()=>setStorage(null))}},[settings])
  const go=(id:string)=>{setPage(id);history.pushState(null,'',`#${id}`);window.scrollTo({top:0,behavior:'instant'})}
  const navigate=(id:string)=>{if(id===page)return;guard.attempt(()=>{setOpenExpense(false);go(id)})}
  const addExpense=()=>guard.attempt(()=>{setOpenExpense(true);go('expenses')})
  const chooseSeason=(id:string)=>{if(id!==season?.id)guard.attempt(()=>{setOpenExpense(false);setSelectedId(id)})}
  const openWorkspaceDialog=(action:()=>void)=>guard.attempt(()=>{if(guard.dirty){setOpenExpense(false);setDraftRevision(value=>value+1)}action()})
  const openSeason=(mode:'new'|'edit')=>openWorkspaceDialog(()=>setSeasonDialog(mode))
  const openSettings=()=>openWorkspaceDialog(()=>setSettings(true))
  const lastBackup=data?.settings.find(s=>s.key==='lastBackupRequest')?.value
  const backupDismissed=data?.settings.find(s=>s.key==='backupReminderDismissedUntil')?.value
  const backupDue=!!season&&backupReminderDue(lastBackup,backupDismissed)
  const backupNow=()=>onSave(requestBackupDownload,tr(lang,'Backup download requested. Check your Downloads folder.','Hiniling ang download ng backup. Suriin ang Downloads folder.'))
  const applyUpdate=async()=>{if(savingRef.current||guard.dirty||document.querySelector('[role="dialog"]')){notify(tr(lang,'Save and close your form before updating.','I-save at isara muna ang form bago mag-update.'),true);return}if(await guard.confirm({title:tr(lang,'Update PaSiBudget?','I-update ang PaSiBudget?'),message:tr(lang,'The app will reload. Saved records stay on this device.','Magre-reload ang app. Mananatili sa device ang mga na-save na tala.'),confirmLabel:tr(lang,'Update now','I-update ngayon')}))void updateServiceWorker(true)}
  const startSample=async()=>{let id='';const ok=await onSave(async()=>{id=await createSampleWorkspace()},tr(lang,'Sample workspace opened. These are illustrative figures.','Binuksan ang halimbawang tala. Panghalimbawa lamang ang mga halaga.'));if(ok){setSelectedId(id);navigate('overview')}}
  const handleCreated=(id:string)=>{setSelectedId(id);setOpenExpense(false);go('overview')}
  const closeSeason=useCallback(()=>setSeasonDialog(null),[])
  const closeSettings=useCallback(()=>setSettings(false),[])
  const changeLanguage=()=>setLang(lang==='en'?'fil':'en')
  const themeToggle=<button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label={tr(lang,theme==='light'?'Close rice grain · switch to dark mode':'Open rice grain · switch to light mode',theme==='light'?'Isara ang palay · madilim na mode':'Buksan ang palay · maliwanag na mode')} aria-pressed={theme==='dark'} title={tr(lang,'Open for light. Close for dark.','Bukas para maliwanag. Sarado para madilim.')}><RiceGrain light={theme==='light'}/></button>
  if(bootError) return <main className="boot-state"><RiceMark/><h1>{tr(lang,'Your device storage is unavailable.','Hindi magamit ang storage ng device.')}</h1><p>{tr(lang,'Allow local website storage in your browser, then reload. PaSiBudget needs it to keep your records.','Payagan ang lokal na storage sa browser at i-reload. Kailangan ito upang ma-save ang mga tala.')}</p><button className="button primary" onClick={()=>location.reload()}>{tr(lang,'Try again','Subukang muli')}</button></main>
  if(!data) return <main className="boot-state"><RiceMark/><p>{tr(lang,'Getting your season ready…','Inihahanda ang iyong taniman…')}</p></main>
  return <SavingContext.Provider value={saving}><div className={season?'app-shell':'welcome-shell'}>
    {season&&<aside className="sidebar"><a href="#overview" className="brand" onClick={e=>{e.preventDefault();navigate('overview')}}><span className="brand-mark"><RiceMark/></span><span>PaSi<span className="brand-light">Budget</span><small>{tr(lang,'ROOM TO GROW','PUWANG PARA LUMAGO')}</small></span></a><div className="sidebar-label">{tr(lang,'YOUR WORKSPACE','IYONG TALAAN')}</div><nav className="desktop-nav" aria-label={tr(lang,'Main navigation','Pangunahing nabigasyon')}>{tabs.map(t=><a href={`#${t.id}`} key={t.id} className={page===t.id?'nav-link active':'nav-link'} aria-current={page===t.id?'page':undefined} onClick={e=>{e.preventDefault();navigate(t.id)}}><t.icon size={19}/><span>{tr(lang,t.en,t.fil)}</span>{page===t.id&&<span className="nav-active-dot"/>}</a>)}</nav><div className="sidebar-tip"><Sprout size={24}/><h3>{tr(lang,'Good things take a little planning.','Nagsisimula sa mabuting plano.')}</h3><p>{tr(lang,'Your next harvest starts with the choices you make today.','Ang susunod na ani ay nagsisimula sa mga pasya ngayon.')}</p><button onClick={()=>navigate('scenarios')}>{tr(lang,'Try a scenario','Subukan ang sitwasyon')}<ArrowUpRightIcon/></button></div><div className="sidebar-bottom"><button className="settings-link" onClick={openSettings}><Settings size={18}/>{tr(lang,'Settings & storage','Setting at storage')}</button><div className="device-footer"><span className="device-icon"><HardDrive size={16}/></span><div><strong>{tr(lang,'Your data, your device','Iyong tala, iyong device')}</strong><span>{tr(lang,'Private. Offline. Yours.','Pribado. Offline. Sa iyo.')}</span></div><span className="small-dot"/></div></div></aside>}
    <div className="main-wrap"><header className="topbar">{season?<div className="breadcrumb"><span>{tr(lang,'My workspace','Aking talaan')}</span><span>/</span><strong>{tr(lang,tabs.find(t=>t.id===page)!.en,tabs.find(t=>t.id===page)!.fil)}</strong></div>:<a href="#overview" className="brand"><span className="brand-mark"><RiceMark/></span><span>PaSi<span className="brand-light">Budget</span></span></a>}<div className="topbar-actions"><span className="save-indicator">{saving?<span className="saving-dot"/>:online?<span className="small-dot"/>:<CloudOff size={13}/>}<span>{saving?tr(lang,'Saving…','Sine-save…'):!online?tr(lang,'Working offline','Gumagana offline'):guard.dirty?tr(lang,'Unsaved changes','Hindi pa na-save'):tr(lang,'Saved on device','Naka-save sa device')}</span></span><span className="toolbar-divider"/><button className="language-toggle" onClick={changeLanguage} aria-label={tr(lang,'Switch to Filipino','Lumipat sa English')}><span className={lang==='en'?'selected':''}>EN</span><span className={lang==='fil'?'selected':''}>FIL</span></button>{themeToggle}<button className="mobile-settings icon-button" aria-label={tr(lang,'Settings','Mga setting')} onClick={openSettings}><Settings size={19}/></button></div></header>
    {needRefresh&&<div className="update-bar"><span>{tr(lang,'An app update is ready. Your saved records will be kept.','May bagong bersyon. Mananatili ang mga na-save na tala.')}</span><button className="text-button" onClick={()=>void applyUpdate()}>{tr(lang,'Update','I-update')}</button><button className="icon-button" aria-label={tr(lang,'Later','Mamaya')} onClick={()=>setNeedRefresh(false)}><X size={15}/></button></div>}
    {season?<main className="main-content" id="main-content"><div className="workspace-bar"><div className="season-select"><Sprout size={16}/><select aria-label={tr(lang,'Active season','Kasalukuyang taniman')} value={season.id} onChange={e=>chooseSeason(e.target.value)}>{activeSeasons.map(s=><option key={s.id} value={s.id}>{data.farms.find(f=>f.id===s.farmId)?.name} · {s.name}{data.farms.find(f=>f.id===s.farmId)?.isSample?tr(lang,' (sample)',' (halimbawa)'):''}</option>)}</select><ChevronDown size={14}/></div><div className="workspace-actions">{sample?<span className="sample-badge"><span className="small-dot"/>{tr(lang,'Sample workspace','Halimbawang talaan')}</span>:<span className="badge green">{tr(lang,'My records','Aking mga tala')}</span>}<button className="text-button" onClick={()=>openSeason('new')}><Plus size={15}/>{tr(lang,'New season','Bagong taniman')}</button></div></div>{sample&&<div className="sample-note"><Info size={14}/><span>{tr(lang,'You’re exploring sample figures. Start your own season whenever you’re ready.','Mga halimbawang halaga ang nakikita mo. Magsimula ng sariling taniman kapag handa ka na.')}</span><button onClick={()=>openSeason('new')}>{tr(lang,'Start my season','Simulan ang aking taniman')}<ArrowRight size={13}/></button></div>}
    {backupDue&&<div className="backup-reminder no-print"><div><strong>{tr(lang,'Keep a copy of your farm records','Magtabi ng kopya ng tala ng sakahan')}</strong><BackupStatus settings={data.settings} lang={lang}/></div><div className="button-row"><button className="button secondary" disabled={saving} onClick={()=>void backupNow()}>{tr(lang,'Back up now','Mag-backup ngayon')}</button><button className="text-button" onClick={()=>void onSave(()=>db.settings.put({key:'backupReminderDismissedUntil',value:new Date(Date.now()+86400000).toISOString()}))}>{tr(lang,'Remind me tomorrow','Ipaalala bukas')}</button></div></div>}
    <div className="page-content" key={`${season.id}-${page}-${draftRevision}`}>
      {page==='overview'&&<OverviewPage data={data} season={season} lang={lang} onSave={onSave} navigate={navigate} addExpense={addExpense} editSeason={()=>openSeason('edit')}/>}
      {page==='budget'&&<BudgetPage data={data} season={season} lang={lang} onSave={onSave}/>}
      {page==='expenses'&&<ExpensesPage openNew={openExpense} data={data} season={season} lang={lang} onSave={onSave}/>}
      {page==='scenarios'&&<ScenariosPage reviewBudget={()=>navigate('budget')} editSeason={()=>openSeason('edit')} data={data} season={season} lang={lang} onSave={onSave}/>}
      {page==='reports'&&<ReportsPage data={data} season={season} lang={lang} onSave={onSave}/>}
    </div><footer className="main-footer"><span><RiceMark/>PaSiBudget <span>·</span> {tr(lang,'Made for every growing season.','Para sa bawat taniman.')}</span><span>{tr(lang,'M’lang, North Cotabato','M’lang, North Cotabato')}<span className="small-dot"/>{offlineReady?tr(lang,'Ready offline','Handa offline'):tr(lang,'Local records','Lokal na mga tala')}</span></footer></main>:<Welcome lang={lang} onStart={()=>setSeasonDialog('new')} onSample={()=>void startSample()} busy={saving} hasArchived={data.seasons.length>0} openSettings={openSettings} onRestore={()=>setRestoreOpen(true)}/>}
    </div>
    {season&&<nav className="mobile-nav" aria-label={tr(lang,'Mobile navigation','Nabigasyon sa mobile')}>{tabs.map(t=><a key={t.id} href={`#${t.id}`} onClick={e=>{e.preventDefault();navigate(t.id)}} className={page===t.id?'active':''} aria-current={page===t.id?'page':undefined}><t.icon size={20}/><span>{tr(lang,t.en,t.fil)}</span></a>)}</nav>}
    {restoreOpen&&<RestoreDialog lang={lang} onClose={()=>setRestoreOpen(false)} onSave={onSave}/>}
    {seasonDialog&&<SeasonDialog data={data} lang={lang} onSave={onSave} onClose={closeSeason} onCreated={handleCreated} editing={seasonDialog==='edit'?season:undefined}/>}
    {settings&&<SettingsModal data={data} lang={lang} storage={storage} onClose={closeSettings} onSave={onSave} onSample={()=>{setSettings(false);void startSample()}} onSelect={id=>guard.attempt(()=>{setSelectedId(id);setSettings(false)})} onPersist={async()=>{try{const granted=await navigator.storage.persist();setStorage(s=>({usage:s?.usage||0,persistent:granted}));notify(granted?tr(lang,'Persistent storage enabled. Keep making backups too.','Pinagana ang persistent storage. Gumawa pa rin ng backup.'):tr(lang,'Your browser manages storage automatically. Keep a backup file.','Awtomatikong pinamamahalaan ng browser ang storage. Magtabi ng backup.'))}catch{notify(tr(lang,'Storage permission is unavailable in this browser.','Hindi magamit ang pahintulot sa storage sa browser na ito.'),true)}}}/>}
    {toast&&<div role={toast.error?'alert':'status'} className={`toast ${toast.error?'error':''}`}>{toast.error?<Info size={18}/>:<Check size={18}/>}<span>{toast.message}</span><button aria-label={tr(lang,'Dismiss','Isara')} onClick={()=>setToast(null)}><X size={16}/></button></div>}
  </div></SavingContext.Provider>
}
function ArrowUpRightIcon(){return <ExternalLink size={14}/>}
function SettingsModal({data,lang,storage,onClose,onSave,onSample,onSelect,onPersist}:{data:WorkspaceData;lang:Lang;storage:{usage:number;persistent:boolean}|null;onClose:()=>void;onSave:PageProps['onSave'];onSample:()=>void;onSelect:(id:string)=>void;onPersist:()=>Promise<void>}){
  const [backing,setBacking]=useState(false)
  const guard=useEditGuard()
  return <Modal title={tr(lang,'Settings & storage','Mga setting at storage')} onClose={onClose} wide><div className="section-gap"><section className="settings-storage"><span className="icon-tile green"><HardDrive size={22}/></span><div><h3>{tr(lang,'Your records live on this device','Nasa device na ito ang iyong mga tala')}</h3><p className="muted">{tr(lang,'They are not uploaded or synced. Clearing browser data can remove them. Keep a backup somewhere safe.','Hindi ina-upload o sini-sync ang mga ito. Maaaring mabura sa paglilinis ng browser. Magtabi ng ligtas na backup.')}</p><p>{storage?`${(storage.usage/1024/1024).toFixed(2)} MB · ${storage.persistent?tr(lang,'Persistent storage enabled','Naka-enable ang persistent storage'):tr(lang,'Browser-managed storage','Storage na pinamamahalaan ng browser')}`:tr(lang,'Storage details unavailable','Walang makuhang detalye ng storage')}</p></div></section><div className="button-row"><button className="button primary" disabled={backing} onClick={async()=>{setBacking(true);await onSave(requestBackupDownload,tr(lang,'Backup download requested. Check your Downloads folder.','Hiniling ang download ng backup. Suriin ang Downloads folder.'));setBacking(false)}}><Download size={16}/>{tr(lang,'Back up my records','I-backup ang mga tala')}</button>{!storage?.persistent&&<button className="button secondary" onClick={()=>void onPersist()}>{tr(lang,'Keep storage persistent','Panatilihin ang storage')}</button>}</div><div className="notice">{tr(lang,'Backup reminder: save a copy after important updates and before changing devices. Restore from Reports.','Paalala: mag-backup pagkatapos ng mahahalagang pagbabago at bago magpalit ng device. Ibalik ang backup sa Mga ulat.')}</div><BackupStatus settings={data.settings} lang={lang}/><h3>{tr(lang,'Manage seasons','Pamahalaan ang mga taniman')}</h3>{data.seasons.length?data.seasons.map(s=><div className="settings-season" key={s.id}><div><strong>{s.name}</strong><small>{data.farms.find(f=>f.id===s.farmId)?.name} {data.farms.find(f=>f.id===s.farmId)?.isSample?tr(lang,'· Sample','· Halimbawa'):''}</small></div>{s.archived?<button className="button secondary small" onClick={()=>void onSave(()=>db.seasons.update(s.id,{archived:false}))}><RotateCcw size={14}/>{tr(lang,'Unarchive','Ibalik')}</button>:<><button className="text-button" onClick={()=>onSelect(s.id)}>{tr(lang,'Open','Buksan')}</button><button className="icon-button" aria-label={`${tr(lang,'Archive','I-archive')} ${s.name}`} onClick={async()=>{if(await guard.confirm({title:tr(lang,'Archive this season?','I-archive ang taniman?'),message:tr(lang,'You can restore it here anytime.','Maaari itong ibalik dito anumang oras.'),confirmLabel:tr(lang,'Archive','I-archive')}))void onSave(()=>db.seasons.update(s.id,{archived:true}))}}><Archive size={16}/></button></>}</div>):<p className="muted">{tr(lang,'Your seasons will appear here.','Makikita rito ang iyong mga taniman.')}</p>}<button className="button secondary" onClick={onSample}><Sprout size={16}/>{tr(lang,'Open sample workspace','Buksan ang halimbawang talaan')}</button><p className="field-hint">{tr(lang,'PaSiBudget v1.0 · Scenario-based decision support. Estimates depend on your records and assumptions. No forecasts or guaranteed profits.','PaSiBudget v1.0 · Suporta sa pagpapasya gamit ang sitwasyon. Ang tantiya ay batay sa iyong tala at palagay. Walang hinuhulaang presyo o garantisadong kita.')}</p></div></Modal>
}

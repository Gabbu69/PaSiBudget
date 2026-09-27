import { ArrowRight, Check, Download, HardDrive, MapPin, Plus, ReceiptText, Sprout, Wallet } from 'lucide-react'
import { RiceMark } from '../components/Rice'
import SeasonFieldArt from '../components/SeasonFieldArt'
import { tr } from '../lib/format'
import type { Lang } from '../types'
import './welcome.css'

type WelcomeProps = {
  lang: Lang
  onStart: () => void
  onSample: () => void
  busy: boolean
  hasArchived: boolean
  openSettings: () => void
  onRestore: () => void
}

export default function Welcome({ lang, onStart, onSample, busy, hasArchived, openSettings, onRestore }: WelcomeProps) {
  return <main className="welcome-screen" id="main-content">
    <div className="welcome-story">
      <div className="welcome-eyebrow"><span className="welcome-eyebrow-icon"><Sprout size={17}/></span>{tr(lang, 'A LITTLE CLARITY. ROOM TO GROW.', 'MAS MALINAW NA PLANO. PUWANG PARA LUMAGO.')}</div>
      <h1>{tr(lang, 'Rooted in your farm.', 'Para sa iyong sakahan.')}<span>{tr(lang, 'Built for your future.', 'Para sa iyong kinabukasan.')}</span></h1>
      <p className="welcome-description">{tr(lang, 'Your budget, expenses, and harvest plans. Together in one simple place, for every growing season.', 'Ang iyong badyet, gastos, at plano sa ani. Magkakasama sa isang madaling gamitin na talaan, sa bawat taniman.')}</p>
      <ul className="welcome-trust">
        <li><Check size={15}/>{tr(lang, 'Works offline', 'Gumagana offline')}</li>
        <li><Check size={15}/>{tr(lang, 'No account needed', 'Walang kailangang account')}</li>
        <li><Check size={15}/>{tr(lang, 'Your records stay yours', 'Sa iyo ang iyong mga tala')}</li>
      </ul>
    </div>

    <section className="welcome-setup" aria-labelledby="welcome-setup-title">
      <div className="welcome-setup-heading"><RiceMark/><span>{tr(lang, 'LET’S GROW WITH A PLAN', 'SIMULAN SA ISANG PLANO')}</span></div>
      <h2 id="welcome-setup-title">{tr(lang, 'A fresh start for your season.', 'Bagong simula para sa iyong taniman.')}</h2>
      <p className="welcome-setup-description">{tr(lang, 'Start with what you know. Add the details as you go.', 'Magsimula sa alam mo. Dagdagan ang detalye habang nagpapatuloy.')}</p>
      <ol className="welcome-steps" aria-label={tr(lang, 'How it works', 'Paano ito gamitin')}>
        <li><span><Sprout size={19}/><small>01</small></span><strong>{tr(lang, 'Your farm', 'Sakahan')}</strong></li>
        <li><span><Wallet size={19}/><small>02</small></span><strong>{tr(lang, 'Your budget', 'Badyet')}</strong></li>
        <li><span><ReceiptText size={19}/><small>03</small></span><strong>{tr(lang, 'Your records', 'Mga tala')}</strong></li>
      </ol>
      <button className="welcome-action welcome-start" onClick={onStart}><Plus size={18}/><span>{tr(lang, 'Plan my first season', 'Planuhin ang unang taniman')}</span><ArrowRight size={18}/></button>
      <div className="welcome-divider"><span/>{tr(lang, 'OR EXPLORE FIRST', 'O SUBUKAN MUNA')}<span/></div>
      <button className="welcome-action welcome-sample" disabled={busy} onClick={onSample}><Sprout size={18}/><span>{busy ? tr(lang, 'Opening…', 'Binubuksan…') : tr(lang, 'Explore a sample farm', 'Tingnan ang halimbawang sakahan')}</span><ArrowRight size={18}/></button>
      <p className="welcome-sample-note">{tr(lang, 'Take a look around with clearly labeled example data.', 'Subukan muna gamit ang malinaw na minarkahang halimbawang tala.')}</p>
      <div className="welcome-recovery"><button className="text-button" onClick={onRestore}><Download size={16}/>{tr(lang, 'Restore a backup', 'Ibalik ang backup')}</button>{hasArchived && <button className="text-button" onClick={openSettings}>{tr(lang, 'Find archived seasons', 'Tingnan ang naka-archive na taniman')}<ArrowRight size={14}/></button>}</div>
    </section>

    <aside className="welcome-field" aria-label={tr(lang, 'Made for growing seasons in M’lang', 'Para sa mga taniman sa M’lang')}>
      <div className="welcome-field-art"><SeasonFieldArt/></div>
      <span className="welcome-location"><MapPin size={14}/>M’lang, North Cotabato</span>
      <p>{tr(lang, 'From first seed', 'Mula sa unang binhi')}<br/><span>{tr(lang, 'to final tally.', 'hanggang sa huling tala.')}</span></p>
      <span className="welcome-field-caption">{tr(lang, 'A little planning goes a long way.', 'Malaking tulong ang simpleng pagpaplano.')}</span>
    </aside>

    <div className="welcome-storage"><span><HardDrive size={19}/></span><p><strong>{tr(lang, 'On your device. In your hands.', 'Nasa iyong device. Nasa iyong kamay.')}</strong>{tr(lang, 'Records are saved in this browser. Keep a backup for an extra copy.', 'Naka-save ang mga tala sa browser na ito. Mag-backup para may ekstrang kopya.')}</p></div>
  </main>
}

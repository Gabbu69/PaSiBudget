import { Component } from 'react'
import type { ReactNode } from 'react'
import { createBackup } from '../lib/backup'
import { download } from '../lib/format'
export default class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<main className="boot-state"><h1>Something needs a fresh start.<br/>May kailangang i-reload.</h1><p>Your saved records remain on this device. Download a backup before reloading.<br/>Nananatili ang iyong mga tala. Mag-backup bago i-reload.</p><div className="button-row"><button className="button secondary" onClick={()=>void createBackup().then(text=>download(text,'PaSiBudget-recovery.json')).catch(()=>alert('Backup unavailable. Please keep this browser data. / Hindi makagawa ng backup. Panatilihin ang datos ng browser.'))}>Download backup / Backup</button><button className="button primary" onClick={()=>location.reload()}>Reload / I-reload</button></div></main>:this.props.children}
}

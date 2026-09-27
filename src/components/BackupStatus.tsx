import type { Lang, Setting } from '../types'
import { tr } from '../lib/format'

export function BackupStatus({ settings, lang }: { settings: Setting[]; lang: Lang }) {
  const last = settings.find(setting => setting.key === 'lastBackupRequest')?.value
  const date = last && Number.isFinite(Date.parse(last)) ? new Date(last).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH') : null
  return <p className="muted backup-status">{date ? `${tr(lang, 'Last backup download requested', 'Huling hiniling na download ng backup')}: ${date}` : tr(lang, 'No backup download requested yet.', 'Wala pang hiniling na download ng backup.')}<br />{tr(lang, 'Check your Downloads folder and keep a safe copy.', 'Suriin ang Downloads folder at magtabi ng ligtas na kopya.')}</p>
}

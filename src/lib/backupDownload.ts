import { createBackup } from './backup'
import { db } from './db'
import { download, today } from './format'

export async function requestBackupDownload(): Promise<void> {
  const content = await createBackup()
  download(content, `PaSiBudget-backup-${today()}.json`)
  await db.settings.put({ key: 'lastBackupRequest', value: new Date().toISOString() })
}
export function backupReminderDue(lastRequest?: string, dismissedUntil?: string, now = Date.now()): boolean {
  if (dismissedUntil && Date.parse(dismissedUntil) > now) return false
  return !lastRequest || !Number.isFinite(Date.parse(lastRequest)) || now - Date.parse(lastRequest) >= 7 * 86400000
}

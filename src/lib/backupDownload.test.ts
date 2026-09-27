import { describe, expect, it } from 'vitest'
import { backupReminderDue } from './backupDownload'

describe('backup reminders', () => {
  const now = Date.parse('2026-09-26T00:00:00Z')
  it('reminds before the first backup and seven days after a request', () => {
    expect(backupReminderDue(undefined, undefined, now)).toBe(true)
    expect(backupReminderDue('2026-09-19T00:00:00Z', undefined, now)).toBe(true)
    expect(backupReminderDue('2026-09-19T00:00:01Z', undefined, now)).toBe(false)
    expect(backupReminderDue('not-a-date', undefined, now)).toBe(true)
  })
  it('respects dismissal until its exact expiry without marking a backup complete', () => {
    const dismissal = '2026-09-27T00:00:00Z'
    expect(backupReminderDue(undefined, dismissal, now)).toBe(false)
    expect(backupReminderDue(undefined, dismissal, now + 86400000)).toBe(true)
  })
})

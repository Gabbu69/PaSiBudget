import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Lang } from '../types'
import { tr } from '../lib/format'
import { lockDialogScroll } from '../lib/dialogScroll'

type Confirmation = { title: string; message: string; confirmLabel?: string; cancelLabel?: string }
type Guard = {
  dirty: boolean
  confirm: (options: Confirmation) => Promise<boolean>
  attempt: (action: () => void) => void
  register: (id: string, dirty: boolean) => void
  unregister: (id: string) => void
  setSaving: (saving: boolean) => void
}
const Context = createContext<Guard | null>(null)
export function useEditGuard() {
  const guard = useContext(Context)
  if (!guard) throw new Error('EditGuardProvider is required')
  return guard
}
export function useDirtyDraft(value: unknown, baseline: unknown, active = true) {
  const { register, unregister } = useEditGuard()
  const id = useId()
  const dirty = active && JSON.stringify(value) !== JSON.stringify(baseline)
  useEffect(() => { register(id, dirty) }, [id, dirty, register])
  useEffect(() => () => unregister(id), [id, unregister])
}
export function EditGuardProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const entries = useRef(new Map<string, boolean>())
  const saving = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<Confirmation | null>(null)
  const resolve = useRef<((value: boolean) => void) | null>(null)
  const register = useCallback((id: string, value: boolean) => { entries.current.set(id, value); setDirty([...entries.current.values()].some(Boolean)) }, [])
  const unregister = useCallback((id: string) => { entries.current.delete(id); setDirty([...entries.current.values()].some(Boolean)) }, [])
  const confirm = useCallback((options: Confirmation): Promise<boolean> => {
    if (resolve.current || saving.current) return Promise.resolve(false)
    setPending(options)
    return new Promise<boolean>(done => { resolve.current = done })
  }, [])
  const settle = useCallback((accepted: boolean) => {
    const done = resolve.current; resolve.current = null; setPending(null); done?.(accepted)
  }, [])
  const attempt = useCallback((action: () => void) => {
    if (saving.current) return
    if (![...entries.current.values()].some(Boolean)) { action(); return }
    void confirm({ title: tr(lang, 'Discard unsaved changes?', 'Itapon ang mga hindi na-save?'), message: tr(lang, 'Your changes have not been saved. Keep editing or discard them to continue.', 'Hindi pa na-save ang iyong pagbabago. Ipagpatuloy ang pag-edit o itapon upang magpatuloy.'), confirmLabel: tr(lang, 'Discard changes', 'Itapon ang pagbabago'), cancelLabel: tr(lang, 'Keep editing', 'Ipagpatuloy ang pag-edit') }).then(accepted => {
      if (accepted) action()
    })
  }, [confirm, lang])
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if ([...entries.current.values()].some(Boolean) || saving.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [])
  const setSaving = useCallback((value: boolean) => { saving.current = value }, [])
  const value = useMemo<Guard>(() => ({ dirty, confirm, attempt, register, unregister, setSaving }), [dirty, confirm, attempt, register, unregister, setSaving])
  return <Context.Provider value={value}>{children}{pending && <ConfirmationDialog lang={lang} options={pending} settle={settle} />}</Context.Provider>
}
function ConfirmationDialog({ lang, options, settle }: { lang: Lang; options: Confirmation; settle: (value: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const unlockScroll = lockDialogScroll()
    box.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); settle(false) }
      if (event.key === 'Tab') {
        const buttons = box.current?.querySelectorAll<HTMLButtonElement>('button')
        if (!buttons?.length) return
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus() }
        else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus() }
      }
    }
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('keydown', key, true); unlockScroll(); if (previous?.isConnected) previous.focus() }
  }, [settle])
  return <div className="modal-backdrop confirmation-backdrop"><div className="modal confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={box}><h2 id={titleId}>{options.title}</h2><p>{options.message}</p><div className="form-actions"><button className="button secondary" onClick={() => settle(false)}>{options.cancelLabel || tr(lang, 'Cancel', 'Kanselahin')}</button><button className="button primary" onClick={() => settle(true)}>{options.confirmLabel || tr(lang, 'Confirm', 'Kumpirmahin')}</button></div></div></div>
}

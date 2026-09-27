import { createContext, useContext, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X, Sprout } from 'lucide-react'
import { lockDialogScroll } from '../lib/dialogScroll'

export const SavingContext = createContext(false)

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Sprout size={26} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const titleId = useId(); const closeRef = useRef(onClose)
  const saving = useContext(SavingContext)
  closeRef.current = () => { if (!saving) onClose() }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const unlockScroll = lockDialogScroll()
    const dialog = ref.current
    const first = dialog?.querySelector<HTMLElement>('input,select,textarea,button'); first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.confirmation-dialog')) return
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current() }
      if (e.key === 'Tab' && dialog) {
        const elements = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.offsetParent !== null)
        const firstEl = elements[0], lastEl = elements.at(-1)
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl?.focus() }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { unlockScroll(); document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="modal-backdrop"><div ref={ref} role="dialog" aria-modal="true" aria-busy={saving} aria-labelledby={titleId} className={`modal ${wide ? 'wide' : ''}`}><div className="modal-header"><h2 id={titleId}>{title}</h2><button type="button" disabled={saving} onClick={onClose} className="icon-button" aria-label="Close / Isara"><X size={20} /></button></div><fieldset className="modal-fields" disabled={saving}>{children}</fieldset></div></div>
}

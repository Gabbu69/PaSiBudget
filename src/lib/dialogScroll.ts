let locks = 0
let previousOverflow = ''

// Nested dialogs may unmount in either order. Restore scrolling only after the last closes.
export function lockDialogScroll(): () => void {
  if (locks++ === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) document.body.style.overflow = previousOverflow
  }
}

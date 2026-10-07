import { useEffect, useState } from 'react'
import { Icon } from './Icons'

export const MODAL_LEAVE_MS = 200

export function Modal({ open, onClose, children, className }) {
  const [shown, setShown] = useState(open)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (open) {
      setShown(true)
      setLeaving(false)
      return undefined
    }
    if (!shown) return undefined
    setLeaving(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(
      () => {
        setShown(false)
        setLeaving(false)
      },
      reduced ? 0 : MODAL_LEAVE_MS,
    )
    return () => window.clearTimeout(t)
  }, [open, shown])

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!shown) return null

  return (
    <div
      className={`modal-backdrop${leaving ? ' is-leave' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`modal-panel${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function EmptyState({ text }) {
  return <p className="empty">{text}</p>
}

export function Notice({ type = 'ok', children, onClose }) {
  if (!children) return null
  return (
    <div className={`notice notice-${type}`} role="status">
      <span>{children}</span>
      {onClose && (
        <button type="button" className="notice-close" onClick={onClose} aria-label="Tutup">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function BrandMark({ text }) {
  const merk = String(text ?? '').trim().slice(0, 4)
  return (
    <div className={`brand-mark${merk.length > 3 ? ' is-long' : ''}${merk ? '' : ' is-empty'}`}>
      {merk}
    </div>
  )
}

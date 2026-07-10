import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Responsive modal.
 * - Desktop/tablet: centered, max-width via `size`.
 * - Phone: becomes a fullscreen sheet (handled in index.css) with safe-area support.
 * - Scrollable body + sticky header/footer.
 * - Closes on overlay click & Escape; locks body scroll while open.
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md', // sm | md | lg | xl
  closeOnOverlay = true,
  showClose = true,
  className,
}) => {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('no-scroll');
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[size];

  return createPortal(
    <div
      className="modal-overlay no-print"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={cn('modal-panel', maxWidth, className)}>
        {(title || showClose) && (
          <div className="modal-header">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {showClose && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="touch-target -mr-2 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="modal-body flex-1">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
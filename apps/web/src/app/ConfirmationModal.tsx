'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isConfirming = false,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modalOverlay" role="presentation">
      <section aria-modal="true" className="confirmModal" role="dialog">
        <div className="modalIcon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="modalActions">
          <button className="textButton" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="dangerButton" disabled={isConfirming} onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

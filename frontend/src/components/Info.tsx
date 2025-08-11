// src/components/Info.tsx
import React from 'react';
import ReactDOM from 'react-dom';

export function InfoIcon({ onClick, title = 'More info' }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 18,
        height: 18,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: '1px solid #666',
        background: '#222',
        color: '#bbb',
        cursor: 'pointer',
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      i
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  const node = document.getElementById('modal-root') || (() => {
    const el = document.createElement('div');
    el.id = 'modal-root';
    document.body.appendChild(el);
    return el;
  })();

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(680px, 92%)',
          background: '#141414',
          border: '1px solid #333',
          borderRadius: 10,
          color: '#eaeaea',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: '1px solid #444',
              background: '#222',
              color: '#ddd',
              padding: '4px 9px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: '1rem' }}>{children}</div>
      </div>
    </div>,
    node
  );
}

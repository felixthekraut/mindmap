import React, { useEffect } from 'react';

export interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="mm-modal__overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mm-modal__content"
      >
        <div className="mm-modal__header">
          <h2 className="mm-h2">Keyboard shortcuts</h2>
          <button className="ghost" onClick={onClose} aria-label="Close help" title="Close (Esc)">Close</button>
        </div>
        <p className="mm-paragraph">Speed up editing with these shortcuts.</p>

        <Section title="While editing a node title">
          <Row k="Enter" d="Save + add sibling, then edit it" />
          <Row k="Tab" d="Save + add child, then edit it" />
          <Row k="Shift+Tab" d="Save + focus parent (don’t create)" />
          <Row k="Ctrl/Cmd+Enter" d="Save only (stay on node)" />
          <Row k="Esc" d="Cancel editing" />
        </Section>


        <Section title="Global">
          <Row k="Ctrl/Cmd+Z" d="Undo" />
          <Row k="Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y" d="Redo" />
          <Row k="?" d="Open this help" />
        </Section>

        <Section title="Mouse">
          <Row k="Drag node" d="Reposition (layout is preserved)" />
          <Row k="Chevron" d="Collapse/expand children" />
          <Row k="… menu" d="Delete node" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mm-help__section">
      <h3 className="mm-help__section-title">{title}</h3>
      <div className="mm-help__grid">{children}</div>
    </div>
  );
}

function Row({ k, d }: { k: string; d: string }) {
  return (
    <div className="mm-help__row">
      <kbd className="mm-kbd">{k}</kbd>
      <span className="mm-help__text">{d}</span>
    </div>
  );
}


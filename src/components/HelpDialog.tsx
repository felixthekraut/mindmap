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
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 92vw)', maxHeight: '84vh', overflow: 'auto',
          background: 'white', color: '#0f172a', borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          padding: 20, border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Keyboard shortcuts</h2>
          <button className="ghost" onClick={onClose} aria-label="Close help" title="Close (Esc)">Close</button>
        </div>
        <p style={{ marginTop: 0, color: '#475569' }}>Speed up editing with these shortcuts.</p>

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
    <div style={{ marginTop: 16 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155' }}>{title}</h3>
      <div style={{ display: 'grid', gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ k, d }: { k: string; d: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, alignItems: 'center' }}>
      <kbd style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: 6,
        background: '#f8fafc', color: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12
      }}>{k}</kbd>
      <span style={{ color: '#334155', fontSize: 13 }}>{d}</span>
    </div>
  );
}


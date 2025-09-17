import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { ReactFlowNodeData } from '../types';
import { getDraft, setDraft, clearDraft } from '../utils/drafts';

interface Props extends NodeProps<Node<ReactFlowNodeData>> {
  onAddChild: (id: string) => string;
  onAddSibling: (id: string) => string;
  onFocusEdit: (id: string | null) => void;
  onEdit: (id: string, updates: { title?: string; description?: string; color?: string }) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}



export default memo(function MindNode({ id, data, selected, onAddChild, onAddSibling, onFocusEdit, onEdit, onToggle, onDelete }: Props) {
  const d = data as ReactFlowNodeData; // help TS in strict generic context
  const [editing, setEditing] = useState(Boolean(d.pendingEdit));
  const [title, setTitle] = useState(String(d.title));
  const [desc, setDesc] = useState(String(d.description ?? ''));
  const [color, setColor] = useState<string>(d.color ?? '#ffffff');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [draftRestored, setDraftRestored] = useState(false);
  const draftTimerRef = useRef<any>(null);

  const titleRef = useRef<HTMLInputElement | null>(null);
  function focusTitleById(targetId: string, attempts = 30) {
    const el = document.getElementById(`mn-title-${targetId}`) as HTMLInputElement | null;
    if (el) { el.focus(); try { el.select?.(); } catch {} }
    else if (attempts > 0) setTimeout(() => focusTitleById(targetId, attempts - 1), 16);
  }

  useEffect(() => { if (editing) titleRef.current?.focus(); }, [editing]);
  useEffect(() => { setTitle(String(d.title)); setDesc(String(d.description ?? '')); setColor(d.color ?? '#ffffff'); }, [d.title, d.description, d.color]);
  useEffect(() => {
    if (d.pendingEdit && !editing) {
      setEditing(true);
      const tryFocus = () => {
        const el = titleRef.current;
        if (el) { el.focus(); try { el.select?.(); } catch {} }
        else setTimeout(tryFocus, 16);
      };
      setTimeout(() => requestAnimationFrame(tryFocus), 0);
      // Do NOT clear pending here; it represents the global current editor
    }
    if (!d.pendingEdit && editing) {
      // Ensure only one node stays in edit mode globally
      setEditing(false);
    }
  }, [d.pendingEdit, editing, id]);

  // When entering edit mode, try restoring a draft if present
  useEffect(() => {
    if (!editing) return;
    const dr = getDraft(id);
    if (dr) {
      setTitle(String(dr.title ?? d.title));
      setDesc(String(dr.description ?? d.description ?? ''));
      setColor(dr.color ?? d.color ?? '#ffffff');
      setDraftRestored(true);
    } else {
      setDraftRestored(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, id]);

  // Debounced auto-save of draft while editing
  useEffect(() => {
    if (!editing) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      setDraft(id, { title, description: desc, color });
    }, 300);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [editing, id, title, desc, color]);

  // Auto-hide the draft restored indicator after a short delay
  useEffect(() => {
    if (!draftRestored) return;
    const t = setTimeout(() => setDraftRestored(false), 2000);
    return () => clearTimeout(t);
  }, [draftRestored]);

  // Click-away: exit edit mode when clicking outside the node (keep draft)
  useEffect(() => {
    if (!editing) return;
    function handleDocPointerDown(e: PointerEvent) {
      const t = e.target as Element | null;
      const root = rootRef.current;
      if (!root) return;
      if (t && root.contains(t)) return; // click inside: ignore
      // click outside: clear global edit focus
      onFocusEdit(null);
    }
    document.addEventListener('pointerdown', handleDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocPointerDown, true);
  }, [editing, onFocusEdit]);

  function save() { onEdit(id, { title, description: desc, color }); try { clearDraft(id); } catch {} setEditing(false); }
  function cancel() { try { clearDraft(id); } catch {} setTitle(String(d.title)); setDesc(String(d.description ?? '')); setColor(d.color ?? '#ffffff'); setEditing(false); }

  const collapsed = Boolean(d.collapsed);

  return (
    <div ref={rootRef} onDoubleClick={() => { if (!editing) onFocusEdit(id); }} className="mm-node" data-selected={selected ? 'true' : undefined} style={{ ['--mn-color' as any]: (editing ? color : (d.color ?? 'transparent')) }}>
      <div className="mm-node__header">
        <button aria-label={collapsed ? 'Expand' : 'Collapse'} onClick={() => onToggle(id)} title={collapsed ? 'Expand' : 'Collapse'} className="mm-btn mm-btn--icon-sm">
          <svg width="10" height="10" viewBox="0 0 24 24" className="mm-chevron" data-collapsed={collapsed ? 'true' : undefined}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {editing ? (
          <div className="mm-col">
            <div>
              <input id={`mn-title-${id}`} ref={titleRef} autoFocus={Boolean(d.pendingEdit)} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || (e as any).code === 'NumpadEnter')) { e.preventDefault(); e.stopPropagation(); save(); onFocusEdit(null); return; }
                if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); save(); const cid = onAddChild(id); setTimeout(() => { onFocusEdit(cid); focusTitleById(cid); }, 0); return; }
                if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); save(); if (d.parentId) onFocusEdit(d.parentId); return; }
                if (e.key === 'Enter' || (e as any).code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); save(); const sid = onAddSibling(id); setTimeout(() => { onFocusEdit(sid); focusTitleById(sid); }, 0); return; }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); onFocusEdit(null); return; }
              }} className="mm-input-tight mm-mb-4" />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    save();
                    onFocusEdit(null);
                  }
                  if (e.key === 'Escape') { e.preventDefault(); cancel(); }
                }}
                className="mm-textarea-tight"
              />
            </div>
            <div className="mm-row-actions">
              <div className="mm-caption-muted">Ctrl+Enter to save {draftRestored ? <em>(Draft restored)</em> : null}</div>
              <button aria-label="Cancel" title="Cancel (Esc)" onClick={() => { cancel(); onFocusEdit(null); }} className="mm-btn">Cancel</button>
              <input type="color" aria-label="Node color" title="Node color" value={color ?? '#ffffff'} onChange={(e) => setColor(e.target.value)} className="mm-color-swatch" />
              <button aria-label="Save" title="Save (Enter)" onClick={() => { save(); onFocusEdit(null); }} className="mm-btn mm-btn--primary">Save</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <div className="mm-node__title">{String(d.title)}</div>
              {d.description ? <div className="mm-node__desc">{String(d.description)}</div> : null}
            </div>
            <div className="mm-actions">
              <button aria-label="Edit" title="Edit" onClick={() => onFocusEdit(id)} className="mm-btn mm-btn--icon">
                <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>
              </button>
              <button aria-label="Delete" title="Delete" onClick={() => onDelete(id)} className="mm-btn mm-btn--icon">
                <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zm3.46-9.12l1.41-1.41L12 9.59l1.12-1.12l1.41 1.41L13.41 11l1.12 1.12l-1.41 1.41L12 12.41l-1.12 1.12l-1.41-1.41L10.59 11zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* '+' on outer edge (right side) */}
      <NodeToolbar isVisible position={Position.Right} align="end" className="rf-toolbar-transparent">
        <button aria-label="Add child" title="Add child" onClick={() => { const cid = onAddChild(id); setTimeout(() => { onFocusEdit(cid); focusTitleById(cid); }, 0); }} className="mm-btn mm-btn--icon">
          <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
        </button>
      </NodeToolbar>

      <Handle type="source" position={Position.Right} className="mm-handle--hidden" />
      <Handle type="target" position={Position.Left} className="mm-handle--hidden" />
    </div>
  );
});


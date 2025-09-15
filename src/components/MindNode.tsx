import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { ReactFlowNodeData } from '../types';

interface Props extends NodeProps<Node<ReactFlowNodeData>> {
  onAddChild: (id: string) => string;
  onAddSibling: (id: string) => string;
  onFocusEdit: (id: string | null) => void;
  onEdit: (id: string, updates: { title?: string; description?: string; color?: string }) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 8, fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.8)',
  border: '1px solid #cbd5e1', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', cursor: 'pointer'
};

export default memo(function MindNode({ id, data, selected, onAddChild, onAddSibling, onFocusEdit, onEdit, onToggle, onDelete }: Props) {
  const d = data as ReactFlowNodeData; // help TS in strict generic context
  const [editing, setEditing] = useState(Boolean(d.pendingEdit));
  const [title, setTitle] = useState(String(d.title));
  const [desc, setDesc] = useState(String(d.description ?? ''));
  const [color, setColor] = useState<string>(d.color ?? '#ffffff');
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

  function save() { onEdit(id, { title, description: desc, color }); setEditing(false); }
  function cancel() { setTitle(String(d.title)); setDesc(String(d.description ?? '')); setColor(d.color ?? '#ffffff'); setEditing(false); }

  const collapsed = Boolean(d.collapsed);

  return (
    <div onDoubleClick={() => { if (!editing) onFocusEdit(id); }} style={{ minWidth: 160, maxWidth: 260, borderRadius: 10, border: '1px solid #cbd5e1', background: `linear-gradient(0deg, ${(editing ? color : (d.color ?? 'transparent'))} 0 3px, transparent 3px), rgba(255,255,255,0.95)`, padding: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', outline: selected ? '2px solid #38bdf8' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <button aria-label={collapsed ? 'Expand' : 'Collapse'} onClick={() => onToggle(id)} title={collapsed ? 'Expand' : 'Collapse'} style={{ ...btnBase, width: 20, height: 20, padding: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <input id={`mn-title-${id}`} ref={titleRef} autoFocus={Boolean(d.pendingEdit)} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || (e as any).code === 'NumpadEnter')) { e.preventDefault(); e.stopPropagation(); save(); onFocusEdit(null); return; }
                if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); save(); const cid = onAddChild(id); setTimeout(() => { onFocusEdit(cid); focusTitleById(cid); }, 0); return; }
                if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); save(); if (d.parentId) onFocusEdit(d.parentId); return; }
                if (e.key === 'Enter' || (e as any).code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); save(); const sid = onAddSibling(id); setTimeout(() => { onFocusEdit(sid); focusTitleById(sid); }, 0); return; }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); onFocusEdit(null); return; }
              }} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 6px', fontSize: 13, marginBottom: 4 }} />
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
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 6px', fontSize: 12, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginRight: 'auto' }}>Ctrl+Enter to save</div>
              <button aria-label="Cancel" title="Cancel (Esc)" onClick={() => { cancel(); onFocusEdit(null); }} style={{ ...btnBase }}>Cancel</button>
              <input type="color" aria-label="Node color" title="Node color" value={color ?? '#ffffff'} onChange={(e) => setColor(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: '1px solid #cbd5e1', borderRadius: 6, background: 'transparent', boxSizing: 'border-box' }} />
              <button aria-label="Save" title="Save (Enter)" onClick={() => { save(); onFocusEdit(null); }} style={{ ...btnBase, background: '#0284c7', color: 'white', borderColor: '#0369a1' }}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, lineHeight: 1.2 }}>{String(d.title)}</div>
              {d.description ? <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any }}>{String(d.description)}</div> : null}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button aria-label="Edit" title="Edit" onClick={() => onFocusEdit(id)} style={{ ...btnBase, width: 24, height: 24, padding: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>
              </button>
              <button aria-label="Delete" title="Delete" onClick={() => onDelete(id)} style={{ ...btnBase, width: 24, height: 24, padding: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zm3.46-9.12l1.41-1.41L12 9.59l1.12-1.12l1.41 1.41L13.41 11l1.12 1.12l-1.41 1.41L12 12.41l-1.12 1.12l-1.41-1.41L10.59 11zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* '+' on outer edge (right side) */}
      <NodeToolbar isVisible position={Position.Right} align="end" className="rf-toolbar-transparent">
        <button aria-label="Add child" title="Add child" onClick={() => { const cid = onAddChild(id); setTimeout(() => { onFocusEdit(cid); focusTitleById(cid); }, 0); }} style={{ ...btnBase, width: 24, height: 24, padding: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
        </button>
      </NodeToolbar>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  );
});


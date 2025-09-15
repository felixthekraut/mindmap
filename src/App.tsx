import { useEffect, useRef, useState } from 'react';
import './App.css';
import MindMapCanvas from './components/MindMapCanvas';
import HelpDialog from './components/HelpDialog';
import { createInitialMap, useMindMap } from './hooks/useMindMap';

function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bgColor, setBgColor] = useState('#F6F7FB');
  const [showHelp, setShowHelp] = useState(false);

  const mind = useMindMap(null as any);
  const [rfKey, setRfKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  const hasMap = !!mind.map;

  function createMap() {
    if (!title.trim()) {
      alert('Please enter a title for the mind map.');
      return;
    }
    const map = createInitialMap(title.trim(), description.trim() || undefined, bgColor);
    mind.setMap(map);
  }

  useEffect(() => {
    function isTextInput(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
    }
    const handler = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) mind.redo(); else mind.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        mind.redo();
      } else if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    const onDocPointerDown = (e: PointerEvent) => {
      if (!menuOpen) return;
      const t = e.target as Node | null;
      if (menuRef.current && !menuRef.current.contains(t as Node) && !menuBtnRef.current?.contains(t as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    document.addEventListener('pointerdown', onDocPointerDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handler);
      document.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as any);
    };
  }, [mind, menuOpen]);

  function handleNew() {
    if (mind.map && !confirm('Start a new mind map? This will replace the current one.')) return;
    mind.newBlank();
    setTitle('');
    setDescription('');
    setBgColor('#F6F7FB');
    setRfKey((k) => k + 1);
  }

  function handleExport() {
    if (!mind.map) { alert('No map to export.'); return; }
    try {
      const positions = JSON.parse(localStorage.getItem('mm:lastPositions') || '{}');
      const viewport = JSON.parse(localStorage.getItem('mm:lastViewport') || 'null');
      const payload = {
        version: 1,
        map: mind.map,
        positions,
        viewport,
        ui: { layoutDensity: mind.layoutDensity },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const name = `${(mind.map.title || 'mindmap').replace(/[^a-z0-9\-_]+/gi, '_')}_${new Date().toISOString().slice(0,10)}.json`;
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert('Failed to export JSON.');
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== 'object' || json.version !== 1 || !json.map) {
        alert('Invalid file format.');
        return;
      }
      if (mind.map && !confirm('Importing will replace the current map. Continue?')) return;
      // Restore UI prefs
      if (json.ui?.layoutDensity) mind.setLayoutDensity(json.ui.layoutDensity);
      // Restore viewport
      if (json.viewport) {
        try { localStorage.setItem('mm:lastViewport', JSON.stringify(json.viewport)); } catch {}
      }
      // Restore positions and map
      const positions = json.positions && typeof json.positions === 'object' ? json.positions : undefined;
      mind.replaceAll(json.map, positions);
      // Remount canvas so onInit applies viewport
      setRfKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to import JSON.');
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hasMap ? (
        <div style={{ maxWidth: 720, margin: '48px auto', padding: 16 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Create a Mind Map</h1>
          <p style={{ marginBottom: 16, color: '#475569' }}>A lightweight, local mind mapping tool for study notes.</p>

          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Title (required)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Biology - Cell Structure" className="input" />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Description (optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Background color</span>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 56, height: 32, padding: 0, border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <div>
              <button onClick={createMap} className="primary" title="Create mind map">Create</button>
            </div>
          </div>
          <div style={{ position: 'absolute', zIndex: 10, left: 12, bottom: 12 }}>
            <button className="ghost icon-btn" title="Shortcuts (Shift+/)" aria-label="Shortcuts" onClick={() => setShowHelp(true)}>?</button>
          </div>
          <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <div style={{ position: 'absolute', zIndex: 10, left: 12, top: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button ref={menuBtnRef} className="ghost" title="Menu" onClick={() => setMenuOpen((v) => !v)} style={{ width: 28, height: 28, padding: 0 }}>
              ⋮
            </button>
            <strong>{mind.map?.title}</strong>
            <button className="ghost" title="Undo (Ctrl/Cmd+Z)" onClick={() => mind.undo()}>Undo</button>
            <button className="ghost" title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)" onClick={() => mind.redo()}>Redo</button>

            {menuOpen && (
              <div ref={menuRef} style={{ position: 'absolute', left: 10, top: 40, minWidth: 220, background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: 8 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', padding: '4px 8px' }}>File</div>
                <button className="ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); handleNew(); }}>New</button>
                <button className="ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); handleImportClick(); }}>Import…</button>
                <button className="ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); handleExport(); }}>Export JSON</button>
                <div style={{ height: 1, background: '#e2e8f0', margin: '6px 4px' }} />
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', padding: '4px 8px' }}>View</div>
                <button className="ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMenuOpen(false); if (confirm('Reset manual positions and return to auto layout?')) mind.resetLayout(); }}>Reset layout</button>
                <div style={{ padding: '4px 8px', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>Density</div>
                  {(['comfortable','compact','dense'] as const).map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input type="radio" name="density" checked={mind.layoutDensity === opt} onChange={() => { mind.setLayoutDensity(opt); }} />
                      <span style={{ textTransform: 'capitalize' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          <div style={{ position: 'absolute', zIndex: 10, left: 12, bottom: 12 }}>
            <button className="ghost icon-btn" title="Shortcuts (Shift+/)" aria-label="Shortcuts" onClick={() => setShowHelp(true)}>?</button>
          </div>
          <MindMapCanvas
            key={rfKey}
            nodes={mind.rfNodes}
            edges={mind.rfEdges}
            bgColor={mind.map!.bgColor}
            onAddChild={mind.addChild}
            onAddSibling={mind.addSiblingOf}
            onFocusEdit={mind.focusEdit}
            onEdit={mind.editNode}
            onToggle={mind.toggleCollapse}
            onDelete={(id) => {
              if (confirm('Delete this node and all its children?')) mind.deleteNodeCascade(id);
            }}
            onNodeMoveStart={mind.beginNodeMove}
            onNodeMoveEnd={mind.endNodeMove}
          />
          <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
}

export default App;

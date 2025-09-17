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
    <div className="mm-page">
      {!hasMap ? (
        <div className="mm-create-container">
          <h1 className="mm-h1">Create a Mind Map</h1>
          <p className="mm-paragraph">A lightweight, local mind mapping tool for study notes.</p>

          <div className="mm-form">
            <label className="mm-label">
              <span>Title (required)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Biology - Cell Structure" className="input" />
            </label>
            <label className="mm-label">
              <span>Description (optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" />
            </label>
            <label className="mm-label">
              <span>Background color</span>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="mm-color-input" />
            </label>
            <div>
              <button onClick={createMap} className="primary" title="Create mind map">Create</button>
            </div>
          </div>
          <div className="mm-fab-container">
            <button className="ghost icon-btn" title="Shortcuts (Shift+/)" aria-label="Shortcuts" onClick={() => setShowHelp(true)}>?</button>
          </div>
          <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
        </div>
      ) : (
        <div className="mm-canvas-wrap">
          <div className="mm-toolbar">
            <button ref={menuBtnRef} className="ghost icon-btn" title="Menu" onClick={() => setMenuOpen((v) => !v)}>
              ⋮
            </button>
            <strong>{mind.map?.title}</strong>
            <button className="ghost" title="Undo (Ctrl/Cmd+Z)" onClick={() => mind.undo()}>Undo</button>
            <button className="ghost" title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)" onClick={() => mind.redo()}>Redo</button>

            {menuOpen && (
              <div ref={menuRef} className="mm-menu-panel">
                <div className="mm-menu-section-title">File</div>
                <button className="ghost mm-menu-item" onClick={() => { setMenuOpen(false); handleNew(); }}>New</button>
                <button className="ghost mm-menu-item" onClick={() => { setMenuOpen(false); handleImportClick(); }}>Import…</button>
                <button className="ghost mm-menu-item" onClick={() => { setMenuOpen(false); handleExport(); }}>Export JSON</button>
                <div className="mm-divider" />
                <div className="mm-menu-section-title">View</div>
                <button className="ghost mm-menu-item" onClick={() => { setMenuOpen(false); if (confirm('Reset manual positions and return to auto layout?')) mind.resetLayout(); }}>Reset layout</button>
                <div className="mm-menu-section-body">
                  <div className="mm-text-sm mm-text-muted mm-mb-2">Density</div>
                  {(['comfortable','compact','dense'] as const).map(opt => (
                    <label key={opt} className="mm-radio-label">
                      <input type="radio" name="density" checked={mind.layoutDensity === opt} onChange={() => { mind.setLayoutDensity(opt); }} />
                      <span className="mm-capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="mm-hidden" onChange={handleFileChange} />
          </div>
          <div className="mm-fab-container">
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

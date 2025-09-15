# Mind Map (React + TypeScript + Vite + React Flow)

A lightweight, local mind mapping app focused on note‑taking and study note organization.

- React: 19.x
- React Flow: @xyflow/react 12.x
- Node.js: LTS 22.x
- Build tool: Vite

Access the application on GitHub Pages: https://felixthekraut.github.io/mindmap/

## Using the app

- Create: Enter Title (required), optional Description, choose Background color, click Create
- Toolbar and Menu: Undo, Redo, Reset layout, Density (Comfortable/Compact/Dense), Export JSON, Import JSON, Shortcuts
- Edit a node: Double‑click the node (or use the edit button)
- Add child: Hover a node and click the small + button
- Collapse/Expand: Chevron at the left of a node; collapsed nodes hide all descendants
- Delete: Use the node’s menu; confirm dialog; deletion cascades to children
- Drag to reposition: Node positions are persisted across sessions
- Auto‑centering: When a node enters edit mode, the view pans to it without changing your zoom

## Keyboard shortcuts

While editing a node title
- Enter: Save + add sibling, start editing it
- Tab: Save + add child, start editing it
- Shift+Tab: Save + focus parent
- Ctrl/Cmd+Enter: Save only
- Esc: Cancel editing

Global
- Ctrl/Cmd+Z: Undo
- Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo
- Shift+/: Open Shortcuts dialog

## Dev Quick start

1) Install deps

```
npm install
```

2) Start dev server

```
npm run dev
```
Open http://localhost:5173

3) Build for production

```
npm run build
npm run preview   # optional: preview the build
```
## Persistence (localStorage)

- Autosaves your current map to localStorage
- Manual node positions are saved and restored
- Viewport (zoom/pan) is saved when you stop moving/zooming and restored on next load

Keys used:
- mm:lastMap
- mm:lastPositions
- mm:lastViewport

## Import/Export JSON

- Export JSON: Downloads a full bundle of your session (map, positions, viewport, UI density)
- Import JSON: Replaces the current map; restores positions, viewport, and density

File schema (version: 1)
```json
{
  "version": 1,
  "map": {},
  "positions": { "n_1": { "x": 0, "y": 0 } },
  "viewport": { "x": 0, "y": 0, "zoom": 0.8 },
  "ui": { "layoutDensity": "compact" }
}
```

## Code structure

```
src/
  components/
    MindMapCanvas.tsx   # React Flow host: node/edge types, auto‑center on edit, initial zoom/viewport restore, viewport persistence
    MindNode.tsx        # Custom node UI: double‑click to edit; small, well‑themed controls (+, collapse, delete)
    FloatingEdge.tsx    # Floating edge that chooses optimal anchors
    HelpDialog.tsx      # Keyboard shortcuts modal (Shift+/)
  hooks/
    useMindMap.ts       # Map state, undo/redo, RF nodes/edges projection, autosave, replaceAll for import
  layout.ts             # Two‑sided tidy tree layout that respects collapsed subtrees
  types.ts              # Types for MindMap, MindNode, RF node data, undo actions
  App.tsx               # Create form; toolbar (Undo/Redo/Reset/Density/Export/Import/Shortcuts)
```

Notes on UI choices
- Expand/collapse control is intentionally small and subtle (no large white ovals).
- Smooth transitions for background color; nodes are draggable and manual positions are persisted.

## Future features (not implemented yet)
- Google Drive integration for save/load
- Dark mode toggle

## License
MIT License — see LICENSE for full text.

## Contributing
This repo doesn’t accept direct pushes from external contributors.
1. Fork the repo to your account.
2. Create a feature branch in your fork.
3. Open a Pull Request against `main`.
A review from @felixthekraut is required for merge.
export interface NodeDraft {
  title?: string;
  description?: string;
  color?: string;
  ts: number;
}

const PREFIX = 'mm:draft:';

export function getDraft(nodeId: string): NodeDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + nodeId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
        description: typeof parsed.description === 'string' ? parsed.description : undefined,
        color: typeof parsed.color === 'string' ? parsed.color : undefined,
        ts: typeof parsed.ts === 'number' ? parsed.ts : Date.now(),
      } as NodeDraft;
    }
  } catch {}
  return null;
}

export function setDraft(nodeId: string, draft: Omit<NodeDraft, 'ts'> | NodeDraft): void {
  try {
    const payload: NodeDraft = { ts: Date.now(), ...draft } as NodeDraft;
    localStorage.setItem(PREFIX + nodeId, JSON.stringify(payload));
  } catch {}
}

export function clearDraft(nodeId: string): void {
  try { localStorage.removeItem(PREFIX + nodeId); } catch {}
}


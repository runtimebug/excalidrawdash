import type { FolderDTO } from "./types";

export type FolderNode = FolderDTO & { depth: number; children: FolderNode[] };

type MinFolder = { id: string; parentId: string | null; position: number };

/** Build an ordered, nested tree from a flat folder list. */
export function buildFolderTree(folders: FolderDTO[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const f of folders) byId.set(f.id, { ...f, depth: 0, children: [] });

  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: FolderNode[], depth: number) => {
    nodes.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    for (const n of nodes) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
}

/** All descendant ids of `rootId` (excluding itself). */
export function collectDescendantIds(
  folders: MinFolder[],
  rootId: string
): Set<string> {
  const childrenOf = new Map<string | null, string[]>();
  for (const f of folders) {
    const arr = childrenOf.get(f.parentId) ?? [];
    arr.push(f.id);
    childrenOf.set(f.parentId, arr);
  }
  const result = new Set<string>();
  const stack = [...(childrenOf.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return result;
}

/**
 * Returns true if the proposed parent assignment creates a cycle.
 * `parentOf` maps folderId -> its (proposed) parentId.
 */
export function hasCycle(parentOf: Map<string, string | null>): boolean {
  for (const start of parentOf.keys()) {
    const seen = new Set<string>();
    let cur: string | null | undefined = start;
    while (cur) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
  }
  return false;
}

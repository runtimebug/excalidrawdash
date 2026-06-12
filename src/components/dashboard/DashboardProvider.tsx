"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useT } from "@/i18n/I18nProvider";
import { buildFolderTree, type FolderNode } from "@/lib/folder-tree";
import type { BoardSummary, FolderDTO, SessionUser, SortKey } from "@/lib/types";

export type FolderReorderUpdate = {
  id: string;
  parentId: string | null;
  position: number;
};

export type View =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "unfiled" }
  | { kind: "folder"; folderId: string };

type DashboardContextValue = {
  user: SessionUser;
  folders: FolderDTO[];
  folderTree: FolderNode[];
  collapsed: Set<string>;
  boards: BoardSummary[];
  loadingBoards: boolean;
  error: string | null;

  view: View;
  query: string;
  sort: SortKey;
  activeTag: string | null;
  allTags: string[];

  setView: (v: View) => void;
  setQuery: (q: string) => void;
  setSort: (s: SortKey) => void;
  setActiveTag: (t: string | null) => void;

  refreshFolders: () => Promise<void>;
  createFolder: (
    name: string,
    color?: string,
    parentId?: string | null
  ) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  recolorFolder: (id: string, color: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  reorderFolders: (updates: FolderReorderUpdate[]) => Promise<void>;
  toggleFolderCollapsed: (id: string) => void;

  createBoard: (folderId?: string | null) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  renameBoard: (id: string, title: string) => Promise<void>;
  setBoardTags: (id: string, tags: string[]) => Promise<void>;
  toggleFavorite: (board: BoardSummary) => Promise<void>;
  moveBoard: (id: string, folderId: string | null) => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

function buildBoardsQuery(
  view: View,
  query: string,
  sort: SortKey,
  tag: string | null
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sort) params.set("sort", sort);
  if (tag) params.set("tag", tag);
  if (view.kind === "favorites") params.set("favorite", "1");
  else if (view.kind === "unfiled") params.set("folder", "unfiled");
  else if (view.kind === "folder") params.set("folder", view.folderId);
  return params.toString();
}

export function DashboardProvider({
  user,
  initialFolders,
  children,
}: {
  user: SessionUser;
  initialFolders: FolderDTO[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  // Live translator for use inside fetch callbacks without adding `t` to their
  // dependency lists (which would refetch on every locale change).
  const tRef = useRef(t);
  tRef.current = t;

  const [folders, setFolders] = useState<FolderDTO[]>(initialFolders);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch boards whenever the active filters change. An incrementing token
  // guards against out-of-order responses overwriting fresher results.
  const reqToken = useRef(0);
  const fetchBoards = useCallback(async () => {
    const token = ++reqToken.current;
    setLoadingBoards(true);
    setError(null);
    try {
      const qs = buildBoardsQuery(view, debouncedQuery, sort, activeTag);
      const data = await api<{ boards: BoardSummary[] }>(`/api/boards?${qs}`);
      if (token === reqToken.current) setBoards(data.boards);
    } catch (err) {
      if (token === reqToken.current) {
        setError(
          err instanceof Error ? err.message : tRef.current("grid.loadFailed")
        );
      }
    } finally {
      if (token === reqToken.current) setLoadingBoards(false);
    }
  }, [view, debouncedQuery, sort, activeTag]);

  useEffect(() => {
    void fetchBoards();
  }, [fetchBoards]);

  const refreshFolders = useCallback(async () => {
    const data = await api<{ folders: FolderDTO[] }>("/api/folders");
    setFolders(data.folders);
  }, []);

  const createFolder = useCallback(
    async (name: string, color?: string, parentId?: string | null) => {
      await api("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name, color, parentId: parentId ?? null }),
      });
      await refreshFolders();
    },
    [refreshFolders]
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      await api(`/api/folders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await refreshFolders();
    },
    [refreshFolders]
  );

  const recolorFolder = useCallback(
    async (id: string, color: string) => {
      await api(`/api/folders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ color }),
      });
      await refreshFolders();
    },
    [refreshFolders]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      await api(`/api/folders/${id}`, { method: "DELETE" });
      // If we were viewing the deleted folder, fall back to "all".
      setView((v) =>
        v.kind === "folder" && v.folderId === id ? { kind: "all" } : v
      );
      await Promise.all([refreshFolders(), fetchBoards()]);
    },
    [refreshFolders, fetchBoards]
  );

  const reorderFolders = useCallback(
    async (updates: FolderReorderUpdate[]) => {
      if (updates.length === 0) return;
      // Optimistic: apply parent/position locally for instant feedback.
      setFolders((prev) => {
        const patch = new Map(updates.map((u) => [u.id, u]));
        return prev.map((f) => {
          const u = patch.get(f.id);
          return u ? { ...f, parentId: u.parentId, position: u.position } : f;
        });
      });
      try {
        await api("/api/folders/reorder", {
          method: "POST",
          body: JSON.stringify({ updates }),
        });
      } finally {
        await refreshFolders();
      }
    },
    [refreshFolders]
  );

  const toggleFolderCollapsed = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const createBoard = useCallback(
    async (folderId?: string | null) => {
      const target =
        folderId ?? (view.kind === "folder" ? view.folderId : null);
      const data = await api<{ board: BoardSummary }>("/api/boards", {
        method: "POST",
        body: JSON.stringify({ folderId: target }),
      });
      router.push(`/board/${data.board.id}`);
    },
    [router, view]
  );

  // Optimistic update helper for board list mutations.
  const patchBoard = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      await api(`/api/boards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    []
  );

  // These mutations update the board list optimistically. On failure we restore
  // the pre-mutation snapshot so a failed request can't silently drop a board
  // from the UI. (We don't use `setError` here — that's the list-load error and
  // would replace the whole grid; a rollback is the right, local recovery.)
  const deleteBoard = useCallback(
    async (id: string) => {
      const snapshot = boards;
      setBoards((prev) => prev.filter((b) => b.id !== id));
      try {
        await api(`/api/boards/${id}`, { method: "DELETE" });
        await refreshFolders();
      } catch {
        setBoards(snapshot); // roll back — the board still exists server-side
      }
    },
    [boards, refreshFolders]
  );

  // Rethrows on failure (after rolling back) so the calling modal can surface
  // the error inline and stay open.
  const renameBoard = useCallback(
    async (id: string, title: string) => {
      const snapshot = boards;
      setBoards((prev) =>
        prev.map((b) => (b.id === id ? { ...b, title } : b))
      );
      try {
        await patchBoard(id, { title });
      } catch (err) {
        setBoards(snapshot);
        throw err;
      }
    },
    [boards, patchBoard]
  );

  const setBoardTags = useCallback(
    async (id: string, tags: string[]) => {
      const snapshot = boards;
      setBoards((prev) =>
        prev.map((b) => (b.id === id ? { ...b, tags } : b))
      );
      try {
        await patchBoard(id, { tags: tags.join(",") });
      } catch (err) {
        setBoards(snapshot);
        throw err;
      }
    },
    [boards, patchBoard]
  );

  const toggleFavorite = useCallback(
    async (board: BoardSummary) => {
      const next = !board.favorite;
      const snapshot = boards;
      setBoards((prev) =>
        prev
          .map((b) => (b.id === board.id ? { ...b, favorite: next } : b))
          // If we're in the favorites view, drop unfavorited boards.
          .filter((b) => (view.kind === "favorites" ? b.favorite : true))
      );
      try {
        await patchBoard(board.id, { favorite: next });
      } catch {
        setBoards(snapshot); // roll back so the board reappears
      }
    },
    [boards, patchBoard, view]
  );

  const moveBoard = useCallback(
    async (id: string, folderId: string | null) => {
      await patchBoard(id, { folderId });
      await Promise.all([refreshFolders(), fetchBoards()]);
    },
    [patchBoard, refreshFolders, fetchBoards]
  );

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const b of boards) for (const t of b.tags) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [boards]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      user,
      folders,
      folderTree,
      collapsed,
      boards,
      loadingBoards,
      error,
      view,
      query,
      sort,
      activeTag,
      allTags,
      setView,
      setQuery,
      setSort,
      setActiveTag,
      refreshFolders,
      createFolder,
      renameFolder,
      recolorFolder,
      deleteFolder,
      reorderFolders,
      toggleFolderCollapsed,
      createBoard,
      deleteBoard,
      renameBoard,
      setBoardTags,
      toggleFavorite,
      moveBoard,
    }),
    [
      user,
      folders,
      folderTree,
      collapsed,
      boards,
      loadingBoards,
      error,
      view,
      query,
      sort,
      activeTag,
      allTags,
      refreshFolders,
      createFolder,
      renameFolder,
      recolorFolder,
      deleteFolder,
      reorderFolders,
      toggleFolderCollapsed,
      createBoard,
      deleteBoard,
      renameBoard,
      setBoardTags,
      toggleFavorite,
      moveBoard,
    ]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

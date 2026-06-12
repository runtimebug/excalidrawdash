"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useT, type TFunction } from "@/i18n/I18nProvider";
import { ChevronLeftIcon, FolderIcon, LogoIcon } from "@/components/ui/Icons";
import type { BoardDetail } from "@/lib/types";

type PathFolder = { id: string; name: string; parentId: string | null };

// Serve Excalidraw's fonts/locale chunks from our own /public (copied at build
// time) instead of the CDN, so a self-hosted instance works fully offline.
if (typeof window !== "undefined") {
  (window as unknown as { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH =
    "/";
}

// Excalidraw touches `window`, so it must never render on the server.
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  }
);

function EditorLoading() {
  const t = useT();
  return <EditorSplash label={t("editor.loadingEditor")} />;
}

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";
const SAVE_DEBOUNCE_MS = 1200;

// Loosely-typed scene refs — Excalidraw's exported types are awkward to import,
// and we only forward the values to its own serialization helpers.
type Scene = {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export function ExcalidrawEditor({ boardId }: { boardId: string }) {
  const router = useRouter();
  const t = useT();
  // Live translator reachable from effects without making them depend on `t`
  // (re-running the load effect on a locale change could clobber unsaved edits).
  const tRef = useRef(t);
  tRef.current = t;

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [folders, setFolders] = useState<PathFolder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");

  const sceneRef = useRef<Scene | null>(null);
  const lastSavedRef = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the board once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ board: BoardDetail }>(
          `/api/boards/${boardId}`
        );
        if (cancelled) return;
        setBoard(data.board);
        setTitle(data.board.title);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : tRef.current("editor.loadFailed")
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Load the user's folders so we can render the board's full folder path.
  useEffect(() => {
    let cancelled = false;
    api<{ folders: PathFolder[] }>("/api/folders")
      .then((d) => {
        if (!cancelled) setFolders(d.folders);
      })
      .catch(() => {
        /* path is best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Walk parentId from the board's folder up to the root → ["Diagrams", "Flowcharts"].
  const folderPath = useMemo(() => {
    if (!board?.folderId || folders.length === 0) return [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    const path: string[] = [];
    const seen = new Set<string>();
    let cur = byId.get(board.folderId);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      path.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
  }, [folders, board]);

  const buildThumbnail = useCallback(async (scene: Scene): Promise<string | undefined> => {
    if (scene.elements.length === 0) return undefined;
    try {
      const { exportToCanvas } = await import("@excalidraw/excalidraw");
      const canvas = await exportToCanvas({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elements: scene.elements as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appState: {
          ...(scene.appState as any),
          exportBackground: true,
          exportWithDarkMode: false,
          viewBackgroundColor: "#ffffff",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        files: scene.files as any,
        maxWidthOrHeight: 480,
        exportPadding: 12,
      });
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      return undefined; // thumbnails are best-effort
    }
  }, []);

  const persist = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { serializeAsJSON } = await import("@excalidraw/excalidraw");
    const serialized = serializeAsJSON(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scene.elements as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scene.appState as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scene.files as any,
      "database"
    );
    if (serialized === lastSavedRef.current) {
      setStatus("saved");
      return;
    }

    setStatus("saving");
    try {
      const parsed = JSON.parse(serialized) as Scene;
      const thumbnail = await buildThumbnail(scene);
      await api(`/api/boards/${boardId}`, {
        method: "PATCH",
        body: JSON.stringify({
          elements: parsed.elements,
          appState: parsed.appState,
          files: parsed.files,
          ...(thumbnail ? { thumbnail } : {}),
        }),
      });
      lastSavedRef.current = serialized;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [boardId, buildThumbnail]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Clear the handle as the timer fires so `saveTimer.current` truthfully
      // reflects whether a save is still pending (used by the flush-on-leave
      // and beforeunload guards below).
      saveTimer.current = null;
      void persist();
    }, SAVE_DEBOUNCE_MS);
  }, [persist]);

  const onChange = useCallback(
    (
      elements: readonly unknown[],
      appState: Record<string, unknown>,
      files: Record<string, unknown>
    ) => {
      sceneRef.current = { elements, appState, files };
      // Seed the baseline on the first change after load so we don't write back
      // an identical scene immediately.
      if (lastSavedRef.current === "") {
        return;
      }
      setStatus("unsaved");
      scheduleSave();
    },
    [scheduleSave]
  );

  // Establish the saved baseline from the initially loaded scene.
  useEffect(() => {
    if (!board) return;
    let cancelled = false;
    (async () => {
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");
      if (cancelled) return;
      lastSavedRef.current = serializeAsJSON(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        board.elements as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        board.appState as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        board.files as any,
        "database"
      );
      setStatus("saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [board]);

  // Flush any pending save when leaving the editor (client-side navigation keeps
  // the JS runtime alive, so the in-flight PATCH still completes).
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void persist();
      }
    };
  }, [persist]);

  // A full page unload (closing the tab) can't await the in-flight PATCH, so warn
  // the user instead of silently dropping edits made within the debounce window.
  useEffect(() => {
    if (status !== "unsaved" && status !== "saving") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  const saveTitle = useCallback(async () => {
    const trimmed = title.trim();
    if (!board || !trimmed || trimmed === board.title) return;
    try {
      await api(`/api/boards/${boardId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });
      setBoard((b) => (b ? { ...b, title: trimmed } : b));
    } catch {
      /* keep editing; non-fatal */
    }
  }, [board, boardId, title]);

  const initialData = useMemo(() => {
    if (!board) return null;
    return {
      elements: board.elements,
      appState: board.appState,
      files: board.files,
      scrollToContent: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }, [board]);

  if (loadError) {
    return (
      <EditorSplash
        label={loadError}
        action={
          <button
            className="btn-primary mt-4"
            onClick={() => router.push("/dashboard")}
          >
            {t("editor.backToDashboard")}
          </button>
        }
      />
    );
  }

  if (!board || !initialData) {
    return <EditorSplash label={t("editor.loadingBoard")} />;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-surface-sunken bg-surface px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          onClick={() => {
            if (saveTimer.current) {
              clearTimeout(saveTimer.current);
              saveTimer.current = null;
              void persist();
            }
          }}
        >
          <ChevronLeftIcon width={18} height={18} />
          <span className="flex h-6 w-6 items-center justify-center rounded bg-brand text-white">
            <LogoIcon width={14} height={14} />
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center">
          {folderPath.length > 0 && (
            <nav
              aria-label={t("editor.folderPath")}
              className="flex shrink items-center gap-1 ps-1 text-sm text-ink-faint"
            >
              <FolderIcon width={15} height={15} className="shrink-0" />
              {folderPath.map((name, i) => (
                <span key={i} className="flex shrink items-center gap-1">
                  <span className="max-w-[140px] truncate">{name}</span>
                  <span className="text-ink-faint/50">/</span>
                </span>
              ))}
            </nav>
          )}
          <input
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink hover:border-surface-sunken focus:border-brand focus:bg-surface focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            maxLength={160}
            aria-label={t("editor.titleAria")}
          />
        </div>

        <SaveIndicator status={status} t={t} />
      </header>

      <div className="excalidraw-host relative flex-1">
        <Excalidraw initialData={initialData} onChange={onChange} />
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  t,
}: {
  status: SaveStatus;
  t: TFunction;
}) {
  const map: Record<SaveStatus, { label: string; className: string }> = {
    idle: { label: "", className: "text-ink-faint" },
    unsaved: { label: t("editor.unsaved"), className: "text-ink-faint" },
    saving: { label: t("editor.saving"), className: "text-ink-faint" },
    saved: { label: t("editor.saved"), className: "text-green-600" },
    error: { label: t("editor.saveFailed"), className: "text-red-600" },
  };
  const { label, className } = map[status];
  return (
    <span className={`shrink-0 text-xs font-medium ${className}`}>{label}</span>
  );
}

function EditorSplash({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="dotted-bg flex h-screen flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-brand text-white">
        <LogoIcon width={26} height={26} />
      </div>
      <p className="text-sm text-ink-faint">{label}</p>
      {action}
    </div>
  );
}

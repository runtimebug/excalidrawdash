"use client";

import { useCallback, useState } from "react";
import {
  useDashboard,
  type FolderReorderUpdate,
  type View,
} from "./DashboardProvider";
import { useT } from "@/i18n/I18nProvider";
import { collectDescendantIds, type FolderNode } from "@/lib/folder-tree";
import type { FolderDTO } from "@/lib/types";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import {
  ChevronRightIcon,
  DotsIcon,
  FolderPlusIcon,
  GridIcon,
  InboxIcon,
  LogoIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "@/components/ui/Icons";

const FOLDER_COLORS = [
  "#6965db",
  "#0c8599",
  "#2f9e44",
  "#e8590c",
  "#e64980",
  "#1971c2",
  "#f08c00",
  "#868e96",
];

type DropMode = "before" | "after" | "inside";
type DropTarget = { id: string | null; mode: DropMode };

type FolderModalState =
  | { mode: "create"; parentId: string | null }
  | { mode: "rename"; id: string; name: string };

function sameView(a: View, b: View): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "folder" && b.kind === "folder")
    return a.folderId === b.folderId;
  return true;
}

/** Compute the position/parent updates for dropping `dragId` relative to `targetId`. */
function computeReorder(
  folders: FolderDTO[],
  dragId: string,
  targetId: string | null,
  mode: DropMode
): FolderReorderUpdate[] | null {
  if (dragId === targetId) return null;
  const descendants = collectDescendantIds(folders, dragId);

  let newParent: string | null;
  if (targetId === null) {
    newParent = null; // root drop zone
  } else if (mode === "inside") {
    newParent = targetId;
  } else {
    newParent = folders.find((f) => f.id === targetId)?.parentId ?? null;
  }

  // Never nest a folder into itself or its own subtree.
  if (newParent === dragId || (newParent && descendants.has(newParent))) {
    return null;
  }

  const siblings = folders
    .filter((f) => f.parentId === newParent && f.id !== dragId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  let index: number;
  if (targetId === null || mode === "inside") {
    index = siblings.length; // append
  } else {
    const ti = siblings.findIndex((s) => s.id === targetId);
    index = ti === -1 ? siblings.length : mode === "before" ? ti : ti + 1;
  }

  const ordered = [...siblings];
  ordered.splice(index, 0, { id: dragId } as FolderDTO);
  return ordered.map((s, i) => ({
    id: s.id,
    parentId: newParent,
    position: i,
  }));
}

export function Sidebar() {
  const t = useT();
  const {
    folders,
    folderTree,
    collapsed,
    view,
    setView,
    createFolder,
    renameFolder,
    recolorFolder,
    deleteFolder,
    reorderFolders,
    toggleFolderCollapsed,
    createBoard,
  } = useDashboard();

  const [folderModal, setFolderModal] = useState<FolderModalState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const commitDrop = useCallback(
    (targetId: string | null, mode: DropMode) => {
      if (!draggingId) return;
      const updates = computeReorder(folders, draggingId, targetId, mode);
      if (updates) void reorderFolders(updates);
    },
    [draggingId, folders, reorderFolders]
  );

  const resetDrag = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-surface-sunken bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
          <LogoIcon width={18} height={18} />
        </div>
        <span className="text-base font-bold tracking-tight">
          {t("common.appName")}
        </span>
      </div>

      <div className="px-3">
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => void createBoard()}
        >
          <PlusIcon width={16} height={16} />
          {t("nav.newBoard")}
        </button>
      </div>

      <nav className="mt-4 space-y-0.5 px-3">
        <NavItem
          label={t("nav.allBoards")}
          icon={<GridIcon width={16} height={16} />}
          active={sameView(view, { kind: "all" })}
          onClick={() => setView({ kind: "all" })}
        />
        <NavItem
          label={t("nav.favorites")}
          icon={<StarIcon width={16} height={16} />}
          active={sameView(view, { kind: "favorites" })}
          onClick={() => setView({ kind: "favorites" })}
        />
        <NavItem
          label={t("nav.unfiled")}
          icon={<InboxIcon width={16} height={16} />}
          active={sameView(view, { kind: "unfiled" })}
          onClick={() => setView({ kind: "unfiled" })}
        />
      </nav>

      <div className="mt-5 flex items-center justify-between px-5 py-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {t("nav.folders")}
        </span>
        <button
          type="button"
          className="rounded-md p-1 text-ink-faint hover:bg-surface-muted hover:text-ink"
          onClick={() => setFolderModal({ mode: "create", parentId: null })}
          aria-label={t("nav.newFolder")}
        >
          <PlusIcon width={16} height={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {folderTree.length === 0 && (
          <p className="px-3 py-2 text-xs text-ink-faint">{t("nav.noFolders")}</p>
        )}

        <div className="space-y-0.5">
          {folderTree.map((node) => (
            <FolderRow
              key={node.id}
              node={node}
              view={view}
              collapsed={collapsed}
              draggingId={draggingId}
              dropTarget={dropTarget}
              onSelect={(id) => setView({ kind: "folder", folderId: id })}
              onToggle={toggleFolderCollapsed}
              onDragStartFolder={setDraggingId}
              onSetDropTarget={setDropTarget}
              onCommitDrop={commitDrop}
              onDragEndFolder={resetDrag}
              onRename={(id, name) =>
                setFolderModal({ mode: "rename", id, name })
              }
              onRecolor={recolorFolder}
              onNewSubfolder={(parentId) =>
                setFolderModal({ mode: "create", parentId })
              }
              onDelete={(folder) => {
                if (
                  window.confirm(
                    t("folder.deleteConfirm", { name: folder.name })
                  )
                ) {
                  void deleteFolder(folder.id);
                }
              }}
            />
          ))}
        </div>

        {/* Root drop zone — drop here to move a folder to the top level. */}
        {draggingId && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget({ id: null, mode: "inside" });
            }}
            onDrop={(e) => {
              e.preventDefault();
              commitDrop(null, "inside");
              resetDrag();
            }}
            className={`mt-1 rounded-lg border border-dashed px-3 py-2 text-center text-xs ${
              dropTarget?.id === null
                ? "border-brand bg-brand-subtle text-brand-fg"
                : "border-surface-sunken text-ink-faint"
            }`}
          >
            {t("nav.moveToRoot")}
          </div>
        )}
      </div>

      {folderModal && (
        <FolderModal
          title={
            folderModal.mode === "rename"
              ? t("folder.renameTitle")
              : t("folder.newTitle")
          }
          initialName={folderModal.mode === "rename" ? folderModal.name : ""}
          showColor={folderModal.mode === "create"}
          onClose={() => setFolderModal(null)}
          onSubmit={async (name, color) => {
            if (folderModal.mode === "rename") {
              await renameFolder(folderModal.id, name);
            } else {
              await createFolder(name, color, folderModal.parentId);
            }
            setFolderModal(null);
          }}
        />
      )}
    </aside>
  );
}

type FolderRowProps = {
  node: FolderNode;
  view: View;
  collapsed: Set<string>;
  draggingId: string | null;
  dropTarget: DropTarget | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDragStartFolder: (id: string) => void;
  onSetDropTarget: (t: DropTarget | null) => void;
  onCommitDrop: (targetId: string, mode: DropMode) => void;
  onDragEndFolder: () => void;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onNewSubfolder: (parentId: string) => void;
  onDelete: (folder: FolderNode) => void;
};

function FolderRow(props: FolderRowProps) {
  const {
    node,
    view,
    collapsed,
    draggingId,
    dropTarget,
    onSelect,
    onToggle,
    onDragStartFolder,
    onSetDropTarget,
    onCommitDrop,
    onDragEndFolder,
    onRename,
    onRecolor,
    onNewSubfolder,
    onDelete,
  } = props;
  const t = useT();

  const isActive =
    view.kind === "folder" && view.folderId === node.id;
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const isDragging = draggingId === node.id;
  const target = dropTarget?.id === node.id ? dropTarget.mode : null;

  function handleDragOver(e: React.DragEvent) {
    if (!draggingId || draggingId === node.id) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mode: DropMode =
      y < rect.height * 0.27
        ? "before"
        : y > rect.height * 0.73
          ? "after"
          : "inside";
    onSetDropTarget({ id: node.id, mode });
  }

  return (
    <div>
      <div
        className="relative"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStartFolder(node.id);
        }}
        onDragOver={handleDragOver}
        onDrop={(e) => {
          e.preventDefault();
          if (target) onCommitDrop(node.id, target);
          onDragEndFolder();
        }}
        onDragEnd={onDragEndFolder}
      >
        {/* reorder indicators */}
        {target === "before" && (
          <span className="absolute inset-x-1 top-0 z-10 h-0.5 rounded bg-brand" />
        )}
        {target === "after" && (
          <span className="absolute inset-x-1 bottom-0 z-10 h-0.5 rounded bg-brand" />
        )}

        <div
          className={`group flex items-center gap-1 rounded-lg py-2 pe-1.5 text-sm transition-colors ${
            isActive
              ? "bg-brand-subtle text-brand-fg"
              : "text-ink-soft hover:bg-surface-muted"
          } ${target === "inside" ? "ring-2 ring-inset ring-brand" : ""} ${
            isDragging ? "opacity-40" : ""
          }`}
          style={{ paddingInlineStart: 6 + node.depth * 14 }}
        >
          <button
            type="button"
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-ink-faint hover:text-ink ${
              hasChildren ? "" : "invisible"
            }`}
            onClick={() => onToggle(node.id)}
            aria-label={isCollapsed ? t("common.expand") : t("common.collapse")}
          >
            <ChevronRightIcon
              width={14}
              height={14}
              className={`transition-transform ${
                isCollapsed ? "" : "rotate-90"
              }`}
            />
          </button>

          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={() => onSelect(node.id)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: node.color }}
            />
            <span className="truncate font-medium">{node.name}</span>
          </button>

          <span className="shrink-0 text-xs text-ink-faint">
            {node.boardCount}
          </span>

          <Menu
            trigger={
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-ink-faint opacity-0 hover:bg-surface-sunken group-hover:opacity-100"
                aria-label={t("folder.options")}
              >
                <DotsIcon width={16} height={16} />
              </button>
            }
          >
            {(close) => (
              <>
                <MenuItem
                  onClick={() => {
                    close();
                    onRename(node.id, node.name);
                  }}
                >
                  <PencilIcon width={15} height={15} /> {t("common.rename")}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    close();
                    onNewSubfolder(node.id);
                  }}
                >
                  <FolderPlusIcon width={15} height={15} /> {t("nav.newFolder")}
                </MenuItem>
                <div className="flex flex-wrap gap-1 px-3 py-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-5 w-5 rounded-full transition hover:scale-110"
                      style={{
                        backgroundColor: c,
                        boxShadow:
                          node.color === c
                            ? "0 0 0 2px white, 0 0 0 4px #6965db"
                            : undefined,
                      }}
                      onClick={() => {
                        void onRecolor(node.id, c);
                        close();
                      }}
                      aria-label={`${t("common.color")} ${c}`}
                    />
                  ))}
                </div>
                <MenuItem
                  danger
                  onClick={() => {
                    close();
                    onDelete(node);
                  }}
                >
                  <TrashIcon width={15} height={15} /> {t("common.delete")}
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <FolderRow key={child.id} {...props} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-subtle text-brand-fg"
          : "text-ink-soft hover:bg-surface-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FolderModal({
  title,
  initialName,
  showColor,
  onClose,
  onSubmit,
}: {
  title: string;
  initialName: string;
  showColor: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name.trim(), color);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <input
          autoFocus
          className="input"
          placeholder={t("folder.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        {showColor && (
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-7 w-7 rounded-full transition hover:scale-110"
                style={{
                  backgroundColor: c,
                  boxShadow:
                    color === c
                      ? "0 0 0 2px white, 0 0 0 4px #6965db"
                      : undefined,
                }}
                onClick={() => setColor(c)}
                aria-label={`${t("common.color")} ${c}`}
              />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

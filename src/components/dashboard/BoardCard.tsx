"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useDashboard } from "./DashboardProvider";
import { useT } from "@/i18n/I18nProvider";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { formatRelative } from "@/lib/format";
import {
  CheckIcon,
  DotsIcon,
  FolderIcon,
  PencilIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import type { BoardSummary } from "@/lib/types";

function BoardCardComponent({ board }: { board: BoardSummary }) {
  const {
    folders,
    toggleFavorite,
    deleteBoard,
    renameBoard,
    setBoardTags,
    moveBoard,
  } = useDashboard();

  const [modal, setModal] = useState<"rename" | "tags" | null>(null);
  const t = useT();

  return (
    <>
      <div className="group relative">
        <Link
          href={`/board/${board.id}`}
          className="block overflow-hidden rounded-xl border border-surface-sunken bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <div className="relative aspect-[4/3] w-full border-b border-surface-sunken bg-white">
            {board.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={board.thumbnail}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-faint/60">
                <PencilIcon width={28} height={28} />
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-ink">
              {board.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {formatRelative(board.updatedAt)}
            </p>
            {board.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {board.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-faint"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Favorite toggle */}
        <button
          type="button"
          onClick={() => void toggleFavorite(board)}
          className={`absolute left-2 top-2 rounded-md p-1.5 backdrop-blur transition-colors ${
            board.favorite
              ? "bg-amber-400/90 text-white"
              : "bg-surface/80 text-ink-faint opacity-0 hover:text-amber-500 group-hover:opacity-100"
          }`}
          aria-label={
            board.favorite ? t("board.unfavorite") : t("board.favorite")
          }
        >
          <StarIcon width={16} height={16} />
        </button>

        {/* Actions menu */}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Menu
            trigger={
              <button
                type="button"
                className="rounded-md bg-surface/80 p-1.5 text-ink-soft backdrop-blur hover:bg-surface"
                aria-label={t("board.options")}
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
                    setModal("rename");
                  }}
                >
                  <PencilIcon width={15} height={15} /> {t("board.rename")}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    close();
                    setModal("tags");
                  }}
                >
                  <TagIcon width={15} height={15} /> {t("board.editTags")}
                </MenuItem>

                <div className="my-1 border-t border-surface-sunken" />
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {t("board.moveTo")}
                </p>
                <div className="max-h-44 overflow-y-auto">
                  <MenuItem
                    onClick={() => {
                      void moveBoard(board.id, null);
                      close();
                    }}
                  >
                    <span className="w-4">
                      {board.folderId === null && (
                        <CheckIcon width={14} height={14} />
                      )}
                    </span>
                    {t("board.noFolder")}
                  </MenuItem>
                  {folders.map((f) => (
                    <MenuItem
                      key={f.id}
                      onClick={() => {
                        void moveBoard(board.id, f.id);
                        close();
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="truncate">{f.name}</span>
                      {board.folderId === f.id && (
                        <CheckIcon
                          width={14}
                          height={14}
                          className="ml-auto"
                        />
                      )}
                    </MenuItem>
                  ))}
                </div>

                <div className="my-1 border-t border-surface-sunken" />
                <MenuItem
                  danger
                  onClick={() => {
                    close();
                    if (
                      window.confirm(
                        t("board.deleteConfirm", { title: board.title })
                      )
                    ) {
                      void deleteBoard(board.id);
                    }
                  }}
                >
                  <TrashIcon width={15} height={15} /> {t("board.delete")}
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>

      {modal === "rename" && (
        <RenameModal
          initial={board.title}
          onClose={() => setModal(null)}
          onSave={async (title) => {
            await renameBoard(board.id, title);
            setModal(null);
          }}
        />
      )}
      {modal === "tags" && (
        <TagsModal
          initial={board.tags}
          onClose={() => setModal(null)}
          onSave={async (tags) => {
            await setBoardTags(board.id, tags);
            setModal(null);
          }}
        />
      )}
    </>
  );
}

function RenameModal({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={t("board.renameTitle")} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          setBusy(true);
          setError(null);
          try {
            await onSave(title.trim());
          } catch (err) {
            setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        <input
          autoFocus
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TagsModal({
  initial,
  onClose,
  onSave,
}: {
  initial: string[];
  onClose: () => void;
  onSave: (tags: string[]) => Promise<void>;
}) {
  const t = useT();
  const [value, setValue] = useState(initial.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={t("board.tagsTitle")} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const tags = Array.from(
            new Set(
              value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          );
          try {
            await onSave(tags);
          } catch (err) {
            setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
            setBusy(false);
          }
        }}
        className="space-y-3"
      >
        <p className="text-xs text-ink-faint">{t("board.tagsHint")}</p>
        <input
          autoFocus
          className="input"
          placeholder={t("board.tagsPlaceholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export const BoardCard = memo(BoardCardComponent);

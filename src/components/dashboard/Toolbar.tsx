"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "./DashboardProvider";
import { useT } from "@/i18n/I18nProvider";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, PlusIcon, TagIcon, UploadIcon } from "@/components/ui/Icons";
import type { SortKey } from "@/lib/types";

const SORT_KEYS: Record<SortKey, string> = {
  updated: "toolbar.sortUpdated",
  created: "toolbar.sortCreated",
  title: "toolbar.sortTitle",
};

export function Toolbar() {
  const t = useT();
  const {
    view,
    folders,
    boards,
    sort,
    setSort,
    allTags,
    activeTag,
    setActiveTag,
    createBoard,
    importBoards,
  } = useDashboard();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [failures, setFailures] = useState<
    { name: string; reason: string }[] | null
  >(null);

  // Auto-dismiss the success banner.
  useEffect(() => {
    if (!importMsg) return;
    const id = setTimeout(() => setImportMsg(null), 4000);
    return () => clearTimeout(id);
  }, [importMsg]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setImporting(true);
    setImportMsg(null);
    // Clear a prior batch's failures so its modal can't linger over the new import.
    setFailures(null);
    try {
      const result = await importBoards(fileList);
      if (result.imported > 0) {
        setImportMsg(t("import.success", { count: result.imported }));
      }
      setFailures(result.failed.length > 0 ? result.failed : null);
    } finally {
      setImporting(false);
      // Reset so selecting the same file again still fires `onChange`.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const title = useMemo(() => {
    switch (view.kind) {
      case "favorites":
        return t("nav.favorites");
      case "unfiled":
        return t("nav.unfiled");
      case "folder":
        return folders.find((f) => f.id === view.folderId)?.name ?? "";
      default:
        return t("nav.allBoards");
    }
  }, [view, folders, t]);

  return (
    <div className="flex flex-col gap-3 border-b border-surface-sunken bg-surface-muted px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-ink-faint">
          {boards.length}
        </span>

        {importMsg && (
          <span className="text-xs font-medium text-green-600">{importMsg}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Menu
            trigger={
              <button type="button" className="btn-outline">
                {t(SORT_KEYS[sort])}
              </button>
            }
          >
            {(close) =>
              (Object.keys(SORT_KEYS) as SortKey[]).map((key) => (
                <MenuItem
                  key={key}
                  onClick={() => {
                    setSort(key);
                    close();
                  }}
                >
                  <span className="w-4">
                    {sort === key && <CheckIcon width={15} height={15} />}
                  </span>
                  {t(SORT_KEYS[key])}
                </MenuItem>
              ))
            }
          </Menu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".excalidraw,application/json"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="btn-outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            title={t("toolbar.importHint")}
          >
            <UploadIcon width={16} height={16} />
            {importing ? t("toolbar.importing") : t("toolbar.import")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={importing}
            onClick={() => void createBoard()}
          >
            <PlusIcon width={16} height={16} />
            {t("toolbar.newBoard")}
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <TagIcon width={15} height={15} className="text-ink-faint" />
          {allTags.map((tag) => {
            const active = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(active ? null : tag)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : "bg-surface text-ink-soft hover:bg-surface-sunken"
                }`}
              >
                {tag}
              </button>
            );
          })}
          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="text-xs font-medium text-brand-fg hover:underline"
            >
              {t("common.clear")}
            </button>
          )}
        </div>
      )}

      {failures && (
        <Modal title={t("import.failedTitle")} onClose={() => setFailures(null)}>
          <ul className="space-y-2">
            {failures.map((f, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-ink">{f.name}</span>
                <span className="text-ink-faint"> — {f.reason}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setFailures(null)}
            >
              {t("common.close")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

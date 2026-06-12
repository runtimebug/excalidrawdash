"use client";

import { useMemo } from "react";
import { useDashboard } from "./DashboardProvider";
import { useT } from "@/i18n/I18nProvider";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { CheckIcon, PlusIcon, TagIcon } from "@/components/ui/Icons";
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
  } = useDashboard();

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
          <button
            type="button"
            className="btn-primary"
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
    </div>
  );
}

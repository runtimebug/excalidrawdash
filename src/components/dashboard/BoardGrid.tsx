"use client";

import { useDashboard } from "./DashboardProvider";
import { BoardCard } from "./BoardCard";
import { useT } from "@/i18n/I18nProvider";
import { GridIcon, PlusIcon } from "@/components/ui/Icons";

export function BoardGrid() {
  const { boards, loadingBoards, error, query, activeTag, view, createBoard } =
    useDashboard();
  const t = useT();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-semibold text-red-600">{error}</p>
        <p className="mt-1 text-sm text-ink-faint">{t("grid.loadErrorBody")}</p>
      </div>
    );
  }

  if (loadingBoards && boards.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-surface-sunken bg-surface"
          >
            <div className="aspect-[4/3] w-full animate-pulse bg-surface-sunken" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-sunken" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (boards.length === 0) {
    // Pick a message that matches *why* the list is empty.
    let titleKey = "grid.noBoardsTitle";
    let bodyKey = "grid.noBoardsBody";
    let showCreate = true;

    if (query) {
      titleKey = "grid.noMatchTitle";
      bodyKey = "grid.noMatchBody";
      showCreate = false;
    } else if (activeTag) {
      titleKey = "grid.noTagTitle";
      bodyKey = "grid.noTagBody";
      showCreate = false;
    } else if (view.kind === "favorites") {
      titleKey = "grid.noFavoritesTitle";
      bodyKey = "grid.noFavoritesBody";
      showCreate = false;
    } else if (view.kind === "unfiled") {
      titleKey = "grid.noUnfiledTitle";
      bodyKey = "grid.noUnfiledBody";
      showCreate = false;
    } else if (view.kind === "folder") {
      titleKey = "grid.emptyFolderTitle";
      bodyKey = "grid.emptyFolderBody";
      showCreate = true;
    }

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-ink-faint">
          <GridIcon width={26} height={26} />
        </div>
        <h2 className="text-lg font-bold">{t(titleKey)}</h2>
        <p className="mt-1 max-w-sm text-sm text-ink-faint">{t(bodyKey)}</p>
        {showCreate && (
          <button
            type="button"
            className="btn-primary mt-5"
            onClick={() => void createBoard()}
          >
            <PlusIcon width={16} height={16} />
            {t("grid.newBoard")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {boards.map((board) => (
        <BoardCard key={board.id} board={board} />
      ))}
    </div>
  );
}

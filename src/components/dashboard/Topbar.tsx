"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "./DashboardProvider";
import { api } from "@/lib/fetcher";
import { useT } from "@/i18n/I18nProvider";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LogoutIcon, SearchIcon, XIcon } from "@/components/ui/Icons";

export function Topbar() {
  const router = useRouter();
  const { user, query, setQuery } = useDashboard();
  const t = useT();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-surface-sunken bg-surface px-6">
      <div className="relative w-full max-w-md">
        <SearchIcon
          width={18}
          height={18}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          className="input ps-9 pe-9"
          placeholder={t("topbar.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("topbar.searchPlaceholder")}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:bg-surface-muted hover:text-ink"
            aria-label={t("topbar.clearSearch")}
          >
            <XIcon width={16} height={16} />
          </button>
        )}
      </div>

      <div className="ms-auto flex items-center gap-1">
        <LanguageSwitcher />

        <Menu
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg py-1 ps-1 pe-2 hover:bg-surface-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {initial}
              </span>
              <span className="hidden text-sm font-medium text-ink-soft sm:block">
                {user.name || user.email}
              </span>
            </button>
          }
        >
          {(close) => (
            <>
              <div className="border-b border-surface-sunken px-3 py-2">
                <p className="text-sm font-semibold">
                  {user.name || t("topbar.account")}
                </p>
                <p className="truncate text-xs text-ink-faint">{user.email}</p>
              </div>
              <MenuItem
                onClick={() => {
                  close();
                  void logout();
                }}
              >
                <LogoutIcon width={15} height={15} /> {t("topbar.signOut")}
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}

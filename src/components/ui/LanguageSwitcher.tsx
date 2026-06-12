"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, LOCALE_LABELS } from "@/i18n/dictionaries";
import { Menu, MenuItem } from "./Menu";
import { CheckIcon, GlobeIcon } from "@/components/ui/Icons";

export function LanguageSwitcher({
  align = "right",
}: {
  align?: "left" | "right";
}) {
  const { t, locale, setLocale } = useI18n();
  return (
    <Menu
      align={align}
      trigger={
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-ink-soft hover:bg-surface-muted"
          aria-label={t("common.language")}
          title={t("common.language")}
        >
          <GlobeIcon width={18} height={18} />
        </button>
      }
    >
      {(close) =>
        LOCALES.map((l) => (
          <MenuItem
            key={l}
            onClick={() => {
              setLocale(l);
              close();
            }}
          >
            <span className="w-4">
              {locale === l && <CheckIcon width={15} height={15} />}
            </span>
            {LOCALE_LABELS[l]}
          </MenuItem>
        ))
      }
    </Menu>
  );
}

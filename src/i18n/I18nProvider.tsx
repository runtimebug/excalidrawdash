"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SOURCE,
  dictionaries,
  dirFor,
  type Dictionary,
  type Locale,
} from "./dictionaries";

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let cur: string | Dictionary | undefined = dict;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(text: string, params?: Record<string, string | number>) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

export type TFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;

type I18nContextValue = {
  locale: Locale;
  t: TFunction;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT(): TFunction {
  return useI18n().t;
}

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const t = useCallback<TFunction>(
    (key, params) => {
      const msg = lookup(dictionaries[locale], key) ?? lookup(SOURCE, key);
      return msg !== undefined ? interpolate(msg, params) : key;
    },
    [locale]
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Persist for SSR on the next load (1 year).
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = dirFor(next);
  }, []);

  // Keep <html> attributes in sync (covers client-only navigations).
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

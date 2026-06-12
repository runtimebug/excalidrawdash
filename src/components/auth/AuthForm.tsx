"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { useT } from "@/i18n/I18nProvider";
import { LogoIcon } from "@/components/ui/Icons";

type Mode = "login" | "register";

// Only allow same-origin, in-app paths as a post-login redirect target. Anything
// else (absolute URLs, protocol-relative "//evil.com", backslash tricks) falls
// back to the dashboard so `?next=` can't be used as an open redirect.
function safeNext(raw: string | null): string {
  if (raw && raw[0] === "/" && raw[1] !== "/" && raw[1] !== "\\") {
    return raw;
  }
  return "/dashboard";
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const t = useT();
  const next = safeNext(search.get("next"));

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister
        ? { email, name, password }
        : { email, password };
      await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.somethingWrong"));
      setLoading(false);
    }
  }

  return (
    <div className="dotted-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shadow-card">
            <LogoIcon width={26} height={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("common.appName")}
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            {isRegister ? t("auth.registerTitle") : t("auth.signInTitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {isRegister && (
            <Field label={t("auth.name")}>
              <input
                className="input"
                type="text"
                value={name}
                autoComplete="name"
                placeholder={t("auth.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}
          <Field label={t("auth.email")}>
            <input
              className="input"
              type="email"
              required
              value={email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t("auth.password")}>
            <input
              className="input"
              type="password"
              required
              value={password}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? t("auth.passwordNewPlaceholder") : "••••••••"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading
              ? t("common.pleaseWait")
              : isRegister
                ? t("auth.createAccount")
                : t("auth.signIn")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-faint">
          {isRegister ? (
            <>
              {t("auth.haveAccount")}{" "}
              <Link href="/login" className="font-semibold text-brand-fg">
                {t("auth.signIn")}
              </Link>
            </>
          ) : (
            <>
              {t("auth.noAccount")}{" "}
              <Link href="/register" className="font-semibold text-brand-fg">
                {t("auth.createAccount")}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

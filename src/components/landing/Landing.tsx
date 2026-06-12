"use client";

import Link from "next/link";
import { useT } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  FolderIcon,
  GridIcon,
  LogoIcon,
  SearchIcon,
  StarIcon,
} from "@/components/ui/Icons";

export function Landing({ loggedIn }: { loggedIn: boolean }) {
  const t = useT();

  const features = [
    { icon: <FolderIcon width={22} height={22} />, title: t("landing.f1Title"), body: t("landing.f1Body") },
    { icon: <SearchIcon width={22} height={22} />, title: t("landing.f2Title"), body: t("landing.f2Body") },
    { icon: <StarIcon width={22} height={22} />, title: t("landing.f3Title"), body: t("landing.f3Body") },
    { icon: <GridIcon width={22} height={22} />, title: t("landing.f4Title"), body: t("landing.f4Body") },
  ];

  return (
    <div className="dotted-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <LogoIcon width={20} height={20} />
        </div>
        <span className="text-lg font-bold tracking-tight">
          {t("common.appName")}
        </span>
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          {loggedIn ? (
            <Link href="/dashboard" className="btn-primary">
              {t("landing.openDashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                {t("landing.nav_signIn")}
              </Link>
              <Link href="/register" className="btn-primary">
                {t("landing.nav_getStarted")}
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-faint">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {loggedIn ? (
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                {t("landing.openDashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="btn-primary px-6 py-3 text-base"
                >
                  {t("landing.ctaGetStarted")}
                </Link>
                <Link href="/login" className="btn-outline px-6 py-3 text-base">
                  {t("landing.nav_signIn")}
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            {t("landing.featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-fg">
                  {f.icon}
                </div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-faint">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-sunken">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-ink-faint">
          {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}

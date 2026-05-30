"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { Locale } from "@/lib/i18n";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: t("common.english") },
    { code: "fr", label: t("common.french") },
    { code: "pa", label: t("common.punjabi") },
    { code: "he", label: t("common.hebrew") },
  ];

  return (
    <div className="fixed z-50 top-4 right-4">
      <button
        type="button"
        aria-label={t("common.languageLabel")}
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/70 bg-black/90 text-amber-300 shadow"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 text-amber-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
      </button>
      {menuOpen ? (
        <div className="absolute right-0 mt-2 min-w-40 overflow-hidden rounded-xl bg-white text-black shadow-lg">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setLocale(item.code);
                setMenuOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                locale === item.code ? "bg-black/10 font-semibold" : "hover:bg-black/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

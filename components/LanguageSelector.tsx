"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { Locale } from "@/lib/i18n";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuOpen]);

  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: t("common.english") },
    { code: "fr", label: t("common.french") },
    { code: "pa", label: t("common.punjabi") },
    { code: "he", label: t("common.hebrew") },
  ];

  return (
    <div ref={containerRef} className="fixed right-4 top-4 z-[70]">
      <button
        type="button"
        aria-label={t("common.languageLabel")}
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2d0b8] bg-[#faf7f2] text-[#9a7a58] shadow-none transition hover:bg-[#f4ede4] hover:text-[#b87333] focus:outline-none focus:ring-2 focus:ring-[#e2d0b8]/70"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 text-current"
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
        <div className="absolute right-0 mt-2 min-w-40 overflow-hidden rounded-xl border border-[#e2d0b8] bg-[#fffaf2] text-[#332613] shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setLocale(item.code);
                setMenuOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                locale === item.code
                  ? "bg-[#f0e5d9] font-semibold text-[#b87333]"
                  : "hover:bg-[#f6efe7]"
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

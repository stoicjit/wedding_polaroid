"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export default function InfoDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t("common.infoLabel")}
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full bg-[#faf7f2] text-[#9a7a58] shadow-none transition hover:bg-[#f4ede4] hover:text-[#b87333] focus:outline-none focus:ring-2 focus:ring-[#e2d0b8]/70"
      >
        <i className="bi bi-info-circle text-[18px] leading-none" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] bg-black/50 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-dialog-title"
            className="mx-auto mt-12 w-full max-w-md rounded-[28px] border border-white/40 bg-[#fffaf2] p-5 text-[#332613] shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8b6e52]">
                  {t("info.eyebrow")}
                </p>
                <h2 id="info-dialog-title" className="mt-1 text-2xl font-semibold">
                  {t("info.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d8c8b0] bg-white text-lg leading-none text-[#4a3929]"
                aria-label={t("common.closeLabel")}
              >
                ×
              </button>
            </div>

            <div className="grid gap-4">
              <section className="rounded-2xl bg-white/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8b6e52]">
                  {t("info.instructionsTitle")}
                </p>
                <p className="mt-2 text-base leading-6 text-[#4a3929]">
                  {t("info.instructionsBodyOne")}
                </p>
                <p className="mt-2 text-base leading-6 text-[#4a3929]">
                  {t("info.instructionsBodyTwo")}
                </p>
              </section>

              <section className="rounded-2xl bg-white/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8b6e52]">
                  {t("info.uploadTitle")}
                </p>
                <p className="mt-2 text-base leading-6 text-[#4a3929]">
                  {t("info.uploadBody")}
                </p>
              </section>

            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

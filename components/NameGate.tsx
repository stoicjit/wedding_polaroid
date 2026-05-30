"use client";

import { useI18n } from "@/components/I18nProvider";
import type { ChangeEvent } from "react";

type NameGateProps = {
  value: string;
  onChange: (nextValue: string) => void;
};

export default function NameGate({ value, onChange }: NameGateProps) {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-2xl px-1 text-left">
      <label className="mb-2 block text-xs uppercase tracking-[0.35em] text-[#6a573f]">
        {t("instructions.nameLabel")}
      </label>
      <input
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        className="w-full rounded-full border border-[#cabaa6] bg-[#fbf7f1] px-4 py-3 text-base text-[#332613] outline-none transition placeholder:text-[#9d8b73] focus:border-[#8b6e52]"
        placeholder={t("nameGate.placeholder")}
      />
    </div>
  );
}

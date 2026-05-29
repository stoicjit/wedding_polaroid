"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NameGate from "@/components/NameGate";
import { useI18n } from "@/components/I18nProvider";
import { saveGuestName } from "@/lib/guest";
import styles from "./page.module.css";

export default function Instructions() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");

  const activeName = name.trim();

  const enterCelebration = () => {
    saveGuestName(activeName);
    router.push("/app");
  };

  return (
    <main className={styles.root}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>{t("instructions.eyebrow")}</p>
            <h1 className={styles.title}>
              {t("instructions.titleLead")} <span>{t("instructions.titleAccent")}</span>
            </h1>

            <div className={styles.copy}>
              <p className={styles.body}>{t("instructions.body")}</p>
              <p className={styles.notes}>{t("instructions.notes")}</p>
            </div>
          </div>
        </section>

        <section className={styles.bottom}>
          <div className={styles.bottomInner}>
            <div className={styles.divider} />
            <h2 className={styles.nameTitle}>{t("instructions.nameTitle")}</h2>
            <NameGate value={name} onChange={setName} />
            <div className={styles.ctaRow}>
              <button
                type="button"
                disabled={!activeName}
                onClick={enterCelebration}
                className={styles.continue}
              >
                {t("instructions.enterEvent")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import InstallGate from "@/components/InstallGate";
import NameGate from "@/components/NameGate";
import { useI18n } from "@/components/I18nProvider";
import {
  loadGuestName,
  saveGuestName,
  saveGuestOnboardingComplete,
  useGuestOnboardingComplete,
} from "@/lib/guest";
import styles from "./page.module.css";

const polaroids: Array<{
  src: string;
  rotate: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}> = [
    { src: "/photos/photo1.jpg", rotate: "-8deg", top: "2%", left: "-8%" },
    { src: "/photos/photo2.png", rotate: "9deg", top: "1%", right: "-9%" },
    { src: "/photos/photo3.jpg", rotate: "-5deg", top: "35%", left: "-8%" },
    { src: "/photos/photo4.png", rotate: "5deg", top: "33%", right: "-8%" },
    { src: "/photos/photo1.jpg", rotate: "8deg", bottom: "5%", left: "-7%" },
    { src: "/photos/photo2.png", rotate: "-8deg", bottom: "6%", right: "-6%" },
  ];

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari specific property
    window.navigator.standalone === true
  );
}

function useHasHydrated() {
  return useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );
}

export default function Welcome() {
  const router = useRouter();
  const { t } = useI18n();
  const onboardingComplete = useGuestOnboardingComplete();
  const [showLaunchSheet, setShowLaunchSheet] = useState(false);
  const [manualGreetingOpen, setManualGreetingOpen] = useState(false);
  const [name, setName] = useState(() => loadGuestName());
  const hydrated = useHasHydrated();
  const standalone = hydrated && isStandaloneMode();

  useEffect(() => {
    if (onboardingComplete) {
      router.replace("/app");
    }
  }, [onboardingComplete, router]);

  const activeName = name.trim();
  const showGreetingModal = manualGreetingOpen || (standalone && !onboardingComplete);

  const openLaunchSheet = () => {
    if (onboardingComplete) {
      router.replace("/app");
      return;
    }

    setShowLaunchSheet(true);
  };

  const openGreetingModal = () => {
    setShowLaunchSheet(false);
    setManualGreetingOpen(true);
  };

  const closeLaunchSheet = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setShowLaunchSheet(false);
    }
  };

  const enterExperience = () => {
    if (!activeName) {
      return;
    }

    saveGuestName(activeName);
    saveGuestOnboardingComplete(true);
    router.replace("/app");
  };

  return (
    <main className={styles.root}>
      {polaroids.map((p, i) => (
        <div
          key={i}
          className={styles.polaroidWrap}
          style={{
            top: p.top,
            bottom: p.bottom,
            left: p.left,
            right: p.right,
            ["--base-rotate" as string]: p.rotate,
            ["--float-delay" as string]: `${i * -2.8}s`,
          }}
        >
          <div className={styles.polaroid}>
            <div className={styles.polaroidImg}>
              <Image
                src={p.src}
                alt={t("welcome.photoAlt")}
                fill
                className={styles.img}
                sizes="110px"
              />
            </div>
          </div>
        </div>
      ))}

      <div className={styles.content}>
        <p className={styles.eyebrow}>{t("welcome.eyebrow")}</p>

        <h1 className={styles.names}>
          <span className={styles.nameLine1}>Gurdeep</span>
          <span className={styles.amp}>&amp;</span>
          <span className={styles.nameLine}>Idan</span>
        </h1>

        <div className={styles.divider}>
          <div className={styles.divLine} />
          <div className={styles.divDiamond} />
          <div className={styles.divLine} />
        </div>

        <p className={styles.landingText}>{t("welcome.landingText")}</p>

        <p className={styles.dateText}>{t("welcome.dateText")}</p>

        <button
          type="button"
          onClick={openLaunchSheet}
          className={styles.enterBtn}
        >
          <span className={styles.shine} aria-hidden="true" />
          <span>{t("welcome.enterApp")}</span>
        </button>
      </div>

      {showLaunchSheet ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={closeLaunchSheet}
        >
          <div className={styles.sheet} role="dialog" aria-modal="true">
            <InstallGate onContinue={openGreetingModal} />
          </div>
        </div>
      ) : null}

      {showGreetingModal ? (
        <div className={styles.overlay} role="presentation">
          <div className={styles.greetingSheet} role="dialog" aria-modal="true">
            <div className={styles.greetingPolaroids}>
              {polaroids.slice(0, 2).map((p, index) => (
                <div
                  key={`${p.src}-${index}`}
                  className={styles.greetingPolaroidWrap}
                  style={{ transform: `rotate(${p.rotate})` }}
                >
                  {/* <div className={styles.greetingPolaroid}>
                    <div className={styles.greetingPolaroidImg}>
                      <Image
                        src={p.src}
                        alt={t("welcome.photoAlt")}
                        fill
                        className={styles.img}
                        sizes="110px"
                      />
                    </div>
                  </div> */}
                </div>
              ))}
            </div>

            <div className={styles.greetingCopy}>
              <p className={styles.greetingEyebrow}>{t("welcome.greetingEyebrow")}</p>
              <p className={styles.greetingText}>{t("welcome.greetingText")}</p>
              <p className={styles.greetingSubText}>{t("welcome.greetingSubText")}</p>

              <div className={styles.divider}>
                <div className={styles.divLine} />
                <div className={styles.divDiamond} />
                <div className={styles.divLine} />
              </div>

              <div className={styles.greetingNotes}>
                <p className={styles.greetingNote}>{t("welcome.noteOne")}</p>
                <p className={styles.greetingNote}>{t("welcome.noteTwo")}</p>
              </div>

              <div className={styles.nameWrap}>
                <NameGate value={name} onChange={setName} />
              </div>

              <button
                type="button"
                onClick={enterExperience}
                disabled={!activeName}
                className={styles.greetingEnter}
              >
                {t("welcome.enterEvent")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

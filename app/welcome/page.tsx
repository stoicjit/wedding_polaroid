"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";
import { useI18n } from "@/components/I18nProvider";

const polaroids = [
  { src: "/photos/photo1.jpg", rotate: "-8deg", top: "2%", left: "-6%" },
  { src: "/photos/photo2.png", rotate: "9deg", top: "1%", right: "-4%" },
  { src: "/photos/photo3.jpg", rotate: "-5deg", top: "35%", left: "-8%" },
  { src: "/photos/photo4.png", rotate: "7deg", top: "37%", right: "-6%" },
  { src: "/photos/photo3.jpg", rotate: "-4deg", bottom: "7%", left: "-3%" },
  { src: "/photos/photo1.jpg", rotate: "4deg", bottom: "7%", right: "-6%" },
];

export default function Welcome() {
  const router = useRouter();
  const { t } = useI18n();

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
            transform: `rotate(${p.rotate})`,
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
          <span className={styles.nameLine}>Gurdeep</span>
          <span className={styles.amp}>&amp;</span>
          <span className={styles.nameLine}>Idan</span>
        </h1>

        <div className={styles.divider}>
          <div className={styles.divLine} />
          <div className={styles.divDiamond} />
          <div className={styles.divLine} />
        </div>

        <p className={styles.welcomeText}>{t("welcome.welcomeText")}</p>

        <p className={styles.subText}>{t("welcome.subText")}</p>

        <p className={styles.dateText}>{t("welcome.dateText")}</p>

        <button
          onClick={() => router.push("/instructions")}
          className={styles.enterBtn}
        >
          {t("welcome.enter")}
        </button>
      </div>
    </main>
  );
}

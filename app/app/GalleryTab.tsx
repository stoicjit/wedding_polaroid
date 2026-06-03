"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  collection,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./gallery.module.css";

export type Photo = {
  id: string;
  src: string;
  name: string;
  note: string;
  time: string;
  createdAt: number | undefined;
  ownerUid: string;
};

const ROTATIONS = ["-1.5deg", "1.2deg", "-2deg", "1.8deg", "-1deg", "2.2deg"];

function resolvePhotoUrl(data: Record<string, unknown>) {
  const candidates = [
    data.src,
    data.imageUrl,
    data.downloadURL,
    data.photoUrl,
    data.url,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) as
    | string
    | undefined;
}

function resolvePhotoTime(data: Record<string, unknown>) {
  const value = data.createdAt;

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as Timestamp;
    return timestamp.toDate().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return "";
}

export default function GalleryTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const photosQuery = firestoreQuery(
      collection(db, "photos"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      photosQuery,
      (snapshot) => {
        const nextPhotos = snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data() as Record<string, unknown>;
            const src = resolvePhotoUrl(data);

            if (!src) {
              return null;
            }

            return {
              id: docSnapshot.id,
              src,
              name:
                typeof data.name === "string" && data.name.trim()
                  ? data.name
                  : "Guest",
              note:
                typeof data.note === "string" && data.note.trim()
                  ? data.note
                  : "",
              time: resolvePhotoTime(data),
              createdAt:
                typeof data.createdAt === "number" ? data.createdAt : undefined,
              ownerUid:
                typeof data.ownerUid === "string" && data.ownerUid.trim()
                  ? data.ownerUid
                  : "",
            } satisfies Photo;
          })
          .filter((photo): photo is Photo => photo !== null);

        setPhotos(nextPhotos);
        setLoading(false);
      },
      () => {
        setPhotos([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return photos;
    return photos.filter((photo) =>
      photo.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [photos, query]);

  function openPhoto(photo: Photo) {
    setSelected(photo);
  }

  async function handleCopySelectedPhoto() {
    if (!selected?.src) return;

    try {
      await navigator.clipboard.writeText(selected.src);
    } catch {
      window.open(selected.src, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <div className={styles.searchWrap}>
        <div className={styles.searchInner}>
          <i
            className="ti ti-search"
            aria-hidden="true"
            style={{ fontSize: 16, color: "#b87333", flexShrink: 0 }}
          />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.galleryScroll}>
        {loading ? (
          <div className={styles.emptyState}>
            <p>Loading photos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <i
              className="ti ti-mood-sad"
              aria-hidden="true"
              style={{ fontSize: 32, color: "#e2d0b8" }}
            />
            <p>No uploaded photos yet</p>
          </div>
        ) : (
          <div className={styles.galleryGrid}>
            {filtered.map((photo, index) => (
              <div
                key={photo.id}
                className={styles.polaroid}
                style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]})` }}
                onClick={() => openPhoto(photo)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === "Enter" && openPhoto(photo)}
                aria-label={`Photo by ${photo.name}`}
              >
                <div className={styles.polaroidImg}>
                  {photo.src ? (
                    <Image
                      src={photo.src}
                      alt={`Photo by ${photo.name}`}
                      fill
                      className={styles.polaroidImgFill}
                      sizes="140px"
                      unoptimized
                    />
                  ) : (
                    <div className={styles.polaroidPlaceholder}>
                      <i className="ti ti-photo" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <p
                  className={`${styles.polaroidNote} ${
                    photo.note ? "" : styles.polaroidNoteEmpty
                  }`}
                >
                  {photo.note || "\u00A0"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <div className={styles.fullscreen}>
          <button
            type="button"
            className={styles.fsClose}
            onClick={() => setSelected(null)}
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.fsCloseIcon}>
              <path d="M14.71 6.71 13.3 5.3 6.6 12l6.7 6.7 1.41-1.41L9.42 12l5.29-5.29Z" />
            </svg>
          </button>

          <div className={styles.fsImg}>
            {selected.src ? (
              <Image
                src={selected.src}
                alt={`Photo by ${selected.name}`}
                fill
                className={styles.polaroidImgFill}
                sizes="100vw"
                unoptimized
              />
            ) : (
              <i
                className="ti ti-photo"
                aria-hidden="true"
                style={{ fontSize: 48, color: "rgba(30,20,10,0.15)" }}
              />
            )}
            <button
              type="button"
              className={styles.fsSaveOverlay}
              onClick={() => void handleCopySelectedPhoto()}
              aria-label="Copy photo link"
            >
              <Image
                src="/download-icon.svg"
                alt=""
                aria-hidden="true"
                className={styles.fsSaveIcon}
                width={24}
                height={24}
                unoptimized
              />
            </button>
          </div>

          <div className={styles.fsBody}>
            <div>
              <p className={styles.fsName}>{selected.name}</p>
              <p className={styles.fsTime}>{selected.time}</p>
            </div>
            {selected.note ? <p className={styles.fsNote}>{selected.note}</p> : null}
            <div className={styles.fsDivider} />
          </div>
        </div>
      ) : null}
    </>
  );
}

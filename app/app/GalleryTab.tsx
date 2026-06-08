"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query as firestoreQuery,
  startAfter,
  startAt,
  type DocumentData,
  type Timestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useI18n } from "@/components/I18nProvider";
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

type SortOrder = "desc" | "asc";
type ViewerMode = "photos" | "search";
type SlideDirection = "next" | "prev";

type SwipePoint = {
  x: number;
  y: number;
  pointerId: number | null;
};

const ROTATIONS = ["-1.5deg", "1.2deg", "-2deg", "1.8deg", "-1deg", "2.2deg"];
const PAGE_SIZE = 24;
const SORT_OPTIONS: Array<{ value: SortOrder }> = [
  { value: "desc" },
  { value: "asc" },
];

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

function toPhoto(
  docSnapshot: QueryDocumentSnapshot<DocumentData>,
): Photo | null {
  const data = docSnapshot.data() as Record<string, unknown>;
  const src = resolvePhotoUrl(data);

  if (!src) {
    return null;
  }

  return {
    id: docSnapshot.id,
    src,
    name:
      typeof data.name === "string" && data.name.trim() ? data.name : "Guest",
    note:
      typeof data.note === "string" && data.note.trim() ? data.note : "",
    time: resolvePhotoTime(data),
    createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
    ownerUid:
      typeof data.ownerUid === "string" && data.ownerUid.trim()
        ? data.ownerUid
        : "",
  } satisfies Photo;
}

export default function GalleryTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("photos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [searchResults, setSearchResults] = useState<Photo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewerTransition, setViewerTransition] = useState<SlideDirection | null>(
    null,
  );
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const photoCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const swipeStartRef = useRef<SwipePoint | null>(null);
  const pendingForwardAdvanceRef = useRef<number | null>(null);
  const searchTerm = query.trim().toLowerCase();

  const sortLabel =
    t(
      sortOrder === "desc"
        ? "gallery.newestToOldest"
        : "gallery.oldestToNewest",
    ) ??
    t("gallery.newestToOldest");

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialPhotos() {
      setLoading(true);
      setLoadingMore(false);
      setHasMore(true);
      setLastVisible(null);
      setSelectedIndex(null);
      setViewerMode("photos");
      setViewerTransition(null);
      pendingForwardAdvanceRef.current = null;

      try {
        const photosQuery = firestoreQuery(
          collection(db, "photos"),
          orderBy("createdAt", sortOrder),
          limit(PAGE_SIZE),
        );

        const snapshot = await getDocs(photosQuery);
        const nextPhotos = snapshot.docs
          .map(toPhoto)
          .filter((photo): photo is Photo => photo !== null);

        if (cancelled) return;

        setPhotos(nextPhotos);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setPhotos([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialPhotos();

    return () => {
      cancelled = true;
    };
  }, [sortOrder]);

  const loadMorePhotos = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !lastVisible) {
      return { loadedCount: 0, canContinue: hasMore };
    }

    setLoadingMore(true);

    try {
      const photosQuery = firestoreQuery(
        collection(db, "photos"),
        orderBy("createdAt", sortOrder),
        startAfter(lastVisible),
        limit(PAGE_SIZE),
      );

      const snapshot = await getDocs(photosQuery);
      const nextPhotos = snapshot.docs
        .map(toPhoto)
        .filter((photo): photo is Photo => photo !== null);

      setPhotos((currentPhotos) => {
        const existingIds = new Set(currentPhotos.map((photo) => photo.id));
        return [
          ...currentPhotos,
          ...nextPhotos.filter((photo) => !existingIds.has(photo.id)),
        ];
      });
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] ?? null);
      const canContinue = snapshot.docs.length === PAGE_SIZE;
      setHasMore(canContinue);

      return { loadedCount: nextPhotos.length, canContinue };
    } catch {
      setHasMore(false);
      return { loadedCount: 0, canContinue: false };
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, lastVisible, loading, loadingMore, sortOrder]);

  useEffect(() => {
    if (searchTerm || !hasMore) {
      return undefined;
    }

    const root = galleryScrollRef.current;
    const trigger = loadMoreTriggerRef.current;

    if (!root || !trigger) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMorePhotos();
        }
      },
      {
        root,
        rootMargin: "250px 0px",
        threshold: 0,
      },
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMorePhotos, searchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadSearchResults() {
      if (!searchTerm) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);

      try {
        const searchQuery = firestoreQuery(
          collection(db, "photos"),
          orderBy("nameLower"),
          startAt(searchTerm),
          endAt(`${searchTerm}\uf8ff`),
        );

        const snapshot = await getDocs(searchQuery);
        const nextResults = snapshot.docs
          .map(toPhoto)
          .filter((photo): photo is Photo => photo !== null);

        if (!cancelled) {
          setSearchResults(nextResults);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    void loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  const filtered = searchTerm ? searchResults : photos;
  const isLoading = searchTerm ? searchLoading : loading;
  const viewerPhotos = viewerMode === "search" ? searchResults : photos;
  const selected = selectedIndex !== null ? viewerPhotos[selectedIndex] ?? null : null;

  useEffect(() => {
    const pendingIndex = pendingForwardAdvanceRef.current;

    if (pendingIndex === null || viewerMode !== "photos" || selectedIndex === null) {
      pendingForwardAdvanceRef.current = null;
      return;
    }

    if (selectedIndex !== pendingIndex) {
      pendingForwardAdvanceRef.current = null;
      return;
    }

    if (pendingIndex + 1 < photos.length) {
      pendingForwardAdvanceRef.current = null;
      setViewerTransition("next");
      setSelectedIndex(pendingIndex + 1);
    }
  }, [photos.length, selectedIndex, viewerMode]);

  useEffect(() => {
    if (selectedIndex === null || viewerMode !== "photos") {
      pendingForwardAdvanceRef.current = null;
    }
  }, [selectedIndex, viewerMode]);

  function openPhoto(photo: Photo) {
    const currentList = searchTerm ? searchResults : photos;
    const nextIndex = currentList.findIndex((item) => item.id === photo.id);

    if (nextIndex < 0) {
      return;
    }

    pendingForwardAdvanceRef.current = null;
    setViewerMode(searchTerm ? "search" : "photos");
    setViewerTransition(null);
    setSelectedIndex(nextIndex);
  }

  function displayName(name: string) {
    return name === "Guest" ? t("guest") : name;
  }

  function isSwipeExcludedTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.closest("button") !== null;
  }

  function scrollGalleryToPhoto(photo: Photo | null) {
    if (!photo) return;

    const cardElement = photoCardRefs.current[photo.id];
    if (!cardElement) return;

    cardElement.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "auto",
    });
  }

  function beginSwipe(clientX: number, clientY: number, pointerId: number | null) {
    swipeStartRef.current = { x: clientX, y: clientY, pointerId };
  }

  async function completeSwipe(
    clientX: number,
    clientY: number,
    pointerId: number | null,
  ) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || selectedIndex === null) {
      return;
    }

    if (start.pointerId !== null && pointerId !== null && start.pointerId !== pointerId) {
      return;
    }

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    const minimumDistance = 40;

    if (Math.abs(deltaX) < minimumDistance || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      const nextIndex = selectedIndex + 1;

      if (nextIndex < viewerPhotos.length) {
        setViewerTransition("next");
        setSelectedIndex(nextIndex);
        return;
      }

      if (viewerMode !== "photos" || searchTerm || !hasMore) {
        return;
      }

      pendingForwardAdvanceRef.current = selectedIndex;

      if (loadingMore) {
        return;
      }

      const { canContinue } = await loadMorePhotos();

      if (!canContinue) {
        pendingForwardAdvanceRef.current = null;
      }
      return;
    }

    const previousIndex = selectedIndex - 1;

    if (previousIndex >= 0) {
      setViewerTransition("prev");
      setSelectedIndex(previousIndex);
    }
  }

  async function handleCopySelectedPhoto() {
    if (!selected?.src) return;

    window.open(selected.src, "_blank", "noopener,noreferrer");
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
            placeholder={t("gallery.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setQuery("")}
              aria-label={t("gallery.clearSearch")}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className={styles.sortRow} ref={sortMenuRef}>
          <button
            type="button"
            className={styles.sortButton}
            onClick={() => setSortMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={sortMenuOpen}
            aria-label={t("gallery.sortBy")}
          >
            <span>{t("gallery.sortBy")}</span>
            <span className={styles.sortButtonValue}>{sortLabel}</span>
            <i className="ti ti-chevron-down" aria-hidden="true" />
          </button>

          {sortMenuOpen ? (
            <div
              className={styles.sortDropdown}
              role="menu"
              aria-label={t("gallery.sortPhotos")}
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.sortOption} ${
                    sortOrder === option.value ? styles.sortOptionActive : ""
                  }`}
                  onClick={() => {
                    setSortOrder(option.value);
                    setSortMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  {t(
                    option.value === "desc"
                      ? "gallery.newestToOldest"
                      : "gallery.oldestToNewest",
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.galleryScroll} ref={galleryScrollRef}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <p>{t("gallery.loadingPhotos")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <i
              className="ti ti-mood-sad"
              aria-hidden="true"
              style={{ fontSize: 32, color: "#e2d0b8" }}
            />
            <p>{t("gallery.noUploadedPhotosYet")}</p>
          </div>
        ) : (
          <>
            <div className={styles.galleryGrid}>
              {filtered.map((photo, index) => (
                <div
                  key={photo.id}
                  className={styles.polaroid}
                  ref={(element) => {
                    photoCardRefs.current[photo.id] = element;
                  }}
                  style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]})` }}
                  onClick={() => openPhoto(photo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => event.key === "Enter" && openPhoto(photo)}
                  aria-label={`${t("gallery.photoBy")} ${displayName(photo.name)}`}
                >
                  <div className={styles.polaroidImg}>
                    {photo.src ? (
                      <Image
                        src={photo.src}
                        alt={`${t("gallery.photoBy")} ${displayName(photo.name)}`}
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

            {!searchTerm && hasMore ? (
              <div className={styles.loadMoreWrap}>
                {loadingMore ? (
                  <div className={styles.loadMoreStatus}>
                    {t("gallery.loadingMore")}
                  </div>
                ) : null}
                <div
                  ref={loadMoreTriggerRef}
                  className={styles.loadMoreTrigger}
                  aria-hidden="true"
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {selected ? (
        <div
          className={styles.fullscreen}
          onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
            if (isSwipeExcludedTarget(event.target)) {
              return;
            }

            beginSwipe(event.clientX, event.clientY, event.pointerId);
          }}
          onPointerUp={(event: ReactPointerEvent<HTMLDivElement>) => {
            if (isSwipeExcludedTarget(event.target)) {
              swipeStartRef.current = null;
              return;
            }

            void completeSwipe(event.clientX, event.clientY, event.pointerId);
          }}
          onPointerCancel={() => {
            swipeStartRef.current = null;
          }}
          >
          <button
            type="button"
            className={styles.fsClose}
            onClick={() => {
              scrollGalleryToPhoto(selected);
              setSelectedIndex(null);
              setViewerTransition(null);
              pendingForwardAdvanceRef.current = null;
            }}
            aria-label={t("gallery.goBack")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.fsCloseIcon}>
              <path d="M14.71 6.71 13.3 5.3 6.6 12l6.7 6.7 1.41-1.41L9.42 12l5.29-5.29Z" />
            </svg>
          </button>

          <button
            type="button"
            className={styles.fsSaveOverlay}
            onClick={() => void handleCopySelectedPhoto()}
            aria-label={t("gallery.openPhoto")}
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

          <div
            key={selected.id}
            className={`${styles.fsPanel} ${
              viewerTransition === "next"
                ? styles.fsPanelNext
                : viewerTransition === "prev"
                  ? styles.fsPanelPrev
                  : ""
            }`}
            onAnimationEnd={() => setViewerTransition(null)}
          >
            <div className={styles.fsImg}>
              {selected.src ? (
                <Image
                  src={selected.src}
                  alt={`${t("gallery.photoBy")} ${displayName(selected.name)}`}
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
            </div>

            <div className={styles.fsBody}>
              <div>
                <p className={styles.fsName}>{displayName(selected.name)}</p>
                <p className={styles.fsTime}>{selected.time}</p>
              </div>
              {selected.note ? <p className={styles.fsNote}>{selected.note}</p> : null}
              <div className={styles.fsDivider} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

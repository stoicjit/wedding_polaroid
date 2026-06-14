"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useGuestName } from "@/lib/guest";
import {
  MAX_NOTE_LENGTH,
  MAX_PHOTO_UPLOADS,
  isPhotoNoteValid,
} from "@/lib/photos";
import { useAnonymousAuth } from "@/lib/useAnonymousAuth";
import { useI18n } from "@/components/I18nProvider";
import styles from "./gallery.module.css";

type FacingMode = "environment" | "user";

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

function formatText(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (currentText, [key, replacement]) => currentText.replaceAll(`{${key}}`, replacement),
    template,
  );
}

export default function CaptureTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [note, setNote] = useState("");
  const [sendError, setSendError] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [uploadsStatusLoaded, setUploadsStatusLoaded] = useState(false);
  const guestName = useGuestName();
  const { currentUid, authReady } = useAnonymousAuth();
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    const videoElement = videoRef.current;

    function stopCameraStream() {
      if (videoElement) {
        videoElement.srcObject = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    }

    async function startCamera() {
      if (!uploadsEnabled) {
        stopCameraStream();
        return;
      }

      if (selectedFile) {
        stopCameraStream();
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      if (!window.isSecureContext) {
        setCameraError(t("capture.cameraAccessHttps"));
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("capture.cameraAccessUnsupported"));
        return;
      }

      setCameraError("");
      stopCameraStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoElement) {
          videoElement.srcObject = stream;
          await videoElement.play().catch(() => undefined);
        }

        setCameraReady(true);
      } catch (error) {
        if (cancelled) return;

        setCameraError(
          error instanceof Error && error.name === "NotAllowedError"
            ? t("capture.cameraAccessNeeded")
            : error instanceof Error && error.name === "NotFoundError"
              ? t("capture.noCameraFound")
            : t("capture.cameraOpenFailed"),
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [facingMode, selectedFile, t, uploadsEnabled]);

  useEffect(() => {
    if (!authReady || !currentUid) return undefined;

    const photosQuery = firestoreQuery(
      collection(db, "photos"),
      where("ownerUid", "==", currentUid),
    );

    const unsubscribe = onSnapshot(
      photosQuery,
      (snapshot) => {
        setPhotoCount(snapshot.size);
      },
      () => {
        setPhotoCount(0);
      },
    );

    return () => unsubscribe();
  }, [authReady, currentUid]);

  useEffect(() => {
    const settingsRef = doc(db, "settings", "app");

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        setUploadsEnabled(snapshot.exists() && snapshot.data().uploadsEnabled !== false);
        setUploadsStatusLoaded(true);
      },
      () => {
        setUploadsEnabled(false);
        setUploadsStatusLoaded(true);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function resetDraft() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setNote("");
    setSendError("");
  }

  function handleUploadTrigger() {
    if (!uploadsEnabled) {
      setSendError(t("capture.uploadsClosed"));
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadsEnabled) {
      setSendError(t("capture.uploadsClosed"));
      return;
    }

    if (!authReady || !currentUid) {
      setSendError(t("capture.pleaseWait"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setNote("");
    setSendError("");
  }

  async function handleCapture() {
    if (!uploadsEnabled) {
      setCameraError(t("capture.uploadsClosed"));
      return;
    }

    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError(t("capture.cameraStillGettingReady"));
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError(t("capture.captureFailed"));
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);

    if (!blob) {
      setCameraError(t("capture.captureFailed"));
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    const objectUrl = URL.createObjectURL(blob);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setNote("");
    setSendError("");
  }

  function handleFlipCamera() {
    if (uploading || !uploadsEnabled) return;
    setFacingMode((currentMode) =>
      currentMode === "environment" ? "user" : "environment",
    );
  }

  const limitReached = authReady && currentUid ? photoCount >= MAX_PHOTO_UPLOADS : false;
  const remainingPhotos = authReady && currentUid ? Math.max(MAX_PHOTO_UPLOADS - photoCount, 0) : MAX_PHOTO_UPLOADS;
  const remainingCountLabel = `${remainingPhotos}/${MAX_PHOTO_UPLOADS}`;
  const uploadsBlocked = !uploadsStatusLoaded || !uploadsEnabled;

  async function handleSend() {
    if (!selectedFile || !currentUid) return;

    if (!uploadsEnabled) {
      setSendError(t("capture.uploadsClosed"));
      return;
    }

    const trimmedNote = note.trim();
    if (!isPhotoNoteValid(trimmedNote)) {
      setSendError(
        formatText(t("capture.noteTooLong"), { max: String(MAX_NOTE_LENGTH) }),
      );
      return;
    }

    setUploading(true);
    setSendError("");

    try {
      const existingPhotosQuery = firestoreQuery(
        collection(db, "photos"),
        where("ownerUid", "==", currentUid),
      );
      const existingPhotosSnapshot = await getDocs(existingPhotosQuery);

      if (existingPhotosSnapshot.size >= MAX_PHOTO_UPLOADS) {
        setSendError(
          formatText(t("capture.photoLimitReached"), {
            max: String(MAX_PHOTO_UPLOADS),
          }),
        );
        return;
      }

      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `photos/${currentUid}/${Date.now()}-${safeFileName}`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, selectedFile);
      const url = await getDownloadURL(storageRef);

  await addDoc(collection(db, "photos"), {
    ownerUid: currentUid,
    name: guestName.trim() || "Guest",
    nameLower: (guestName.trim() || "Guest").toLowerCase(),
    url,
    note: trimmedNote,
    createdAt: serverTimestamp(),
  });

      resetDraft();
    } catch {
      setSendError(t("capture.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.cameraView}>
      {!selectedFile ? (
        <>
          <div className={styles.cameraStage}>
            <video
              ref={videoRef}
              className={`${styles.cameraFeed} ${
                facingMode === "user" ? styles.cameraFeedMirrored : ""
              }`}
              autoPlay
              muted
              playsInline
            />

            <div className={styles.cameraOverlay}>
              {uploadsBlocked ? (
                <div className={styles.cameraMessage}>
                  {uploadsStatusLoaded
                    ? t("capture.uploadsClosed")
                    : t("capture.uploadsChecking")}
                </div>
              ) : cameraError ? (
                <div className={styles.cameraMessage}>{cameraError}</div>
              ) : cameraReady ? (
                <>
                  <div className={styles.cameraCount}>{remainingCountLabel}</div>
                  {limitReached ? (
                    <div className={styles.cameraMessage}>
                      {t("capture.photoLimitReachedNotice")}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.cameraMessage}>{t("capture.cameraOpening")}</div>
              )}
            </div>
          </div>

          <div className={styles.cameraControls}>
            <button
              type="button"
              className={styles.uploadThumb}
              onClick={handleUploadTrigger}
              aria-label={t("capture.uploadFromPhone")}
              disabled={uploading || !authReady || limitReached || uploadsBlocked}
            >
              <i className="ti ti-photo-up" aria-hidden="true" />
            </button>

            <button
              type="button"
              className={styles.shutterBtn}
              onClick={handleCapture}
              aria-label={t("capture.takePhoto")}
              disabled={uploading || !authReady || !cameraReady || limitReached || uploadsBlocked}
            >
              <div className={styles.shutterInner} />
            </button>

            <button
              type="button"
              className={styles.switchBtn}
              onClick={handleFlipCamera}
              aria-label={t("capture.switchCamera")}
              disabled={uploading || !authReady || limitReached || uploadsBlocked}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.switchIcon}>
                <path d="M7 7h9.5a3.5 3.5 0 0 1 0 7H13" fill="none" />
                <path d="M12 4 8.5 7 12 10" fill="none" />
                <path d="M17 17H7.5a3.5 3.5 0 0 1 0-7H11" fill="none" />
                <path d="M12 20 15.5 17 12 14" fill="none" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <div className={styles.captureDraft}>
          <div className={styles.capturePolaroid}>
            <div className={styles.capturePhoto}>
              <Image
                src={previewUrl}
                alt={t("capture.photoPreview")}
                fill
                className={styles.polaroidImgFill}
                sizes="100vw"
                unoptimized
              />
            </div>
            <div className={styles.captureCaption}>
              <p className={styles.captureCaptionTitle}>{t("capture.addNote")}</p>
              <textarea
                className={styles.captureNoteInput}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSendError("");
                }}
                placeholder={t("capture.notePlaceholder")}
                rows={3}
                maxLength={MAX_NOTE_LENGTH}
              />
              <div className={styles.captureNoteMeta}>
                <span>
                  {note.trim().length}/{MAX_NOTE_LENGTH}
                </span>
              </div>
              {uploadsBlocked ? (
                <p className={styles.captureNotice}>
                  {uploadsStatusLoaded
                    ? t("capture.uploadsClosed")
                    : t("capture.uploadsChecking")}
                </p>
              ) : null}
              {limitReached ? (
                <p className={styles.captureNotice}>
                  {t("capture.photoLimitReachedNotice")}
                </p>
              ) : null}
              {sendError ? <p className={styles.captureError}>{sendError}</p> : null}
            </div>
          </div>

          <div className={styles.captureActions}>
            <button
              type="button"
              className={styles.captureSecondary}
              onClick={resetDraft}
              disabled={uploading}
            >
              {t("capture.retake")}
            </button>
            <button
              type="button"
              className={styles.capturePrimary}
              onClick={handleSend}
              disabled={uploading || !isPhotoNoteValid(note) || limitReached || uploadsBlocked}
            >
              {uploading ? t("capture.sending") : t("capture.send")}
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleUpload}
      />
    </div>
  );
}

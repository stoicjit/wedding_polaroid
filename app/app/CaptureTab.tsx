"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useGuestName } from "@/lib/guest";
import { MAX_NOTE_LENGTH, isPhotoNoteValid } from "@/lib/photos";
import { useAnonymousAuth } from "@/lib/useAnonymousAuth";
import styles from "./gallery.module.css";

type FacingMode = "environment" | "user";

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
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
  const guestName = useGuestName();
  const { currentUid, authReady } = useAnonymousAuth();

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
      if (selectedFile) {
        stopCameraStream();
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      if (!window.isSecureContext) {
        setCameraError(
          "Camera access needs HTTPS or localhost. On a phone, open the deployed site or an HTTPS tunnel.",
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "This browser does not support live camera access in this context.",
        );
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
            ? "Camera access is needed to take photos."
            : error instanceof Error && error.name === "NotFoundError"
              ? "No camera was found on this device."
            : "We could not open the camera.",
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [facingMode, selectedFile]);

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
    fileInputRef.current?.click();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!authReady || !currentUid) {
      setSendError("Please wait a moment and try again.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setNote("");
    setSendError("");
  }

  async function handleCapture() {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError("The camera is still getting ready.");
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("We could not capture this photo.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);

    if (!blob) {
      setCameraError("We could not capture this photo.");
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
    if (uploading) return;
    setFacingMode((currentMode) =>
      currentMode === "environment" ? "user" : "environment",
    );
  }

  async function handleSend() {
    if (!selectedFile || !currentUid) return;

    const trimmedNote = note.trim();
    if (!isPhotoNoteValid(trimmedNote)) {
      setSendError(`Add a note up to ${MAX_NOTE_LENGTH} characters.`);
      return;
    }

    setUploading(true);
    setSendError("");

    try {
      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `photos/${currentUid}/${Date.now()}-${safeFileName}`;
      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, selectedFile);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "photos"), {
        ownerUid: currentUid,
        name: guestName.trim() || "Guest",
        url,
        note: trimmedNote,
        createdAt: serverTimestamp(),
      });

      resetDraft();
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Upload failed. Please try again.",
      );
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
              {cameraError ? (
                <div className={styles.cameraMessage}>{cameraError}</div>
              ) : cameraReady ? (
                <div className={styles.cameraHint}>Tap the shutter to capture</div>
              ) : (
                <div className={styles.cameraMessage}>Opening camera...</div>
              )}
            </div>
          </div>

          <div className={styles.cameraControls}>
            <button
              type="button"
              className={styles.uploadThumb}
              onClick={handleUploadTrigger}
              aria-label="Upload photo from phone"
              disabled={uploading || !authReady}
            >
              <i className="ti ti-photo-up" aria-hidden="true" />
            </button>

            <button
              type="button"
              className={styles.shutterBtn}
              onClick={handleCapture}
              aria-label="Take photo"
              disabled={uploading || !authReady || !cameraReady}
            >
              <div className={styles.shutterInner} />
            </button>

            <button
              type="button"
              className={styles.switchBtn}
              onClick={handleFlipCamera}
              aria-label="Switch camera"
              disabled={uploading || !authReady}
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
                alt="Photo preview"
                fill
                className={styles.polaroidImgFill}
                sizes="100vw"
                unoptimized
              />
            </div>
            <div className={styles.captureCaption}>
              <p className={styles.captureCaptionTitle}>Add a note</p>
              <textarea
                className={styles.captureNoteInput}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSendError("");
                }}
                placeholder="Write a short note..."
                rows={3}
                maxLength={MAX_NOTE_LENGTH}
              />
              <div className={styles.captureNoteMeta}>
                <span>
                  {note.trim().length}/{MAX_NOTE_LENGTH}
                </span>
              </div>
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
              Retake
            </button>
            <button
              type="button"
              className={styles.capturePrimary}
              onClick={handleSend}
              disabled={uploading || !isPhotoNoteValid(note)}
            >
              {uploading ? "Sending..." : "Send"}
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

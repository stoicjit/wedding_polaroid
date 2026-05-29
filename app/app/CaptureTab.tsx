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

export default function CaptureTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [note, setNote] = useState("");
  const [sendError, setSendError] = useState("");
  const guestName = useGuestName();
  const { currentUid, authReady } = useAnonymousAuth();

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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleShutter() {
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
      {selectedFile ? (
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
      ) : (
        <div className={styles.viewfinder}>
          <i
            className="ti ti-camera"
            aria-hidden="true"
            style={{ fontSize: 40, color: "rgba(255,255,255,0.2)" }}
          />
          <span className={styles.cameraLabel}>Camera</span>
        </div>
      )}

      <div className={styles.cameraControls}>
        <button
          type="button"
          className={styles.uploadThumb}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload photo from phone"
          disabled={uploading || !authReady}
        >
          <i className="ti ti-photo-up" aria-hidden="true" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleUpload}
        />

        <button
          type="button"
          className={styles.shutterBtn}
          onClick={handleShutter}
          aria-label="Take photo"
          disabled={uploading || !authReady}
        >
          <div className={styles.shutterInner} />
        </button>

        <div style={{ width: 52 }} />
      </div>
    </div>
  );
}

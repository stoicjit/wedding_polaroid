export const MAX_NOTE_LENGTH = 30;
export const MAX_PHOTO_UPLOADS = 20;

export function isPhotoNoteValid(note: string) {
  const trimmedNote = note.trim();

  return trimmedNote.length > 0 && trimmedNote.length <= MAX_NOTE_LENGTH;
}

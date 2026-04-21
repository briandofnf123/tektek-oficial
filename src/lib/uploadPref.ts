/**
 * Persists the upload draft so a user can navigate to /music to pick a track
 * and come back without losing caption/tags/file selection.
 *
 * Files themselves can't be persisted, so we keep a simple "selectedTrackId"
 * + caption + tags in localStorage. The Upload page restores them on mount.
 */
const KEY = "tektek.upload_draft.v1";

export type UploadDraft = {
  caption?: string;
  tagsInput?: string;
  selectedTrackId?: string | null;
  mode?: "video" | "photo";
};

export const saveDraft = (draft: UploadDraft) => {
  try {
    const cur = readDraft();
    localStorage.setItem(KEY, JSON.stringify({ ...cur, ...draft }));
  } catch {
    /* noop */
  }
};

export const readDraft = (): UploadDraft => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

export const clearDraft = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};

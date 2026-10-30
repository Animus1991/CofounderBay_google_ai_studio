/**
 * File uploads for chat attachments, the data room and project assets.
 *
 * Files go to Cloud Storage under `<folder>/<uid>/…` and are shared through
 * their unguessable download URL. When Storage is not enabled on the Firebase
 * project, small files (≤ 700 KB) are kept inline instead, so the feature still
 * works; larger ones report a clear error.
 */
import { getStorageInstance } from '../firebase';
import { createLogger } from './logger';

const log = createLogger('files');

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_INLINE_BYTES = 700 * 1024;
/** A cloud upload that has not finished by then is abandoned for the inline fallback (or a clear error). */
export const CLOUD_UPLOAD_TIMEOUT_MS = 20_000;

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('upload-timeout')), ms);
    work.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export type UploadedFile = { name: string; type: string; size: number; url: string; storage: 'cloud' | 'inline'; path?: string };

export type UploadFolder = 'chat' | 'dataroom' | 'assets' | 'community' | 'decks';

function safeName(name: string) {
  return name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(-80) || 'file';
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

export class UploadError extends Error {
  constructor(public code: 'too-large' | 'unavailable' | 'failed') {
    super(code);
  }
}

export async function uploadFile(
  file: File | Blob,
  opts: { folder: UploadFolder; uid: string; name?: string; timeoutMs?: number; cloud?: boolean },
): Promise<UploadedFile> {
  const name = opts.name || (file instanceof File ? file.name : 'file');
  const type = file.type || 'application/octet-stream';
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('too-large');
  try {
    // The sample account has no cloud bucket of its own: keep its files inline.
    if (opts.cloud === false) throw new Error('cloud-disabled');
    const upload = (async () => {
      const storage = await getStorageInstance();
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const path = `${opts.folder}/${opts.uid}/${Date.now().toString(36)}-${safeName(name)}`;
      const target = ref(storage, path);
      await uploadBytes(target, file, { contentType: type, customMetadata: { originalName: name.slice(0, 200) } });
      const url = await getDownloadURL(target);
      return { name, type, size: file.size, url, storage: 'cloud' as const, path };
    })();
    return await withDeadline(upload, opts.timeoutMs ?? CLOUD_UPLOAD_TIMEOUT_MS);
  } catch (error) {
    if (!(error instanceof Error && error.message === 'cloud-disabled')) log.warn('cloud upload failed, trying inline', { error: String(error) });
    if (file.size <= MAX_INLINE_BYTES) {
      const url = await readAsDataUrl(file);
      return { name, type, size: file.size, url, storage: 'inline' };
    }
    throw new UploadError('unavailable');
  }
}

export async function removeUploadedFile(path: string | undefined) {
  if (!path) return;
  try {
    const storage = await getStorageInstance();
    const { ref, deleteObject } = await import('firebase/storage');
    await deleteObject(ref(storage, path));
  } catch (error) {
    log.warn('could not delete stored file', { error: String(error) });
  }
}

/** A square, compressed JPEG data URL for profile photos (small enough to live on the profile document). */
export function resizeImage(file: File, size = 320, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not-an-image'));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('no-canvas'));
        return;
      }
      context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad-image'));
    };
    image.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

'use client';

import { FirebaseApp } from 'firebase/app';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import type { PhotoCategory } from '@/lib/photo-categories';

export interface FileUploadResult {
  success: boolean;
  downloadUrl?: string;
  storagePath?: string;
  error?: string;
}

export interface EvidenceItem {
  type: 'photo' | 'pdf';
  urlOrBase64: string;
  name: string;
  uploadMethod: 'storage';
  category: PhotoCategory;
  aiGenerated?: boolean;
}

export interface UploadQueueItem {
  file: File;
  category: PhotoCategory;
  key: string;
}

const MAX_CONCURRENT = 3;

/**
 * Always-resumable upload — no size limit, no base64 fallback.
 * Path: projects/{projectId}/assets/{category}/{timestamp}_{sanitizedName}
 */
export async function uploadFileToStorage(
  firebaseApp: FirebaseApp,
  file: File,
  projectId: string,
  onProgress?: (progress: number) => void,
  category: PhotoCategory = 'General'
): Promise<FileUploadResult> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const folder = file.type.startsWith('image/') ? `photos/${category}` : 'pdfs';
  const storagePath = `projects/${projectId}/assets/${folder}/${timestamp}_${sanitizedName}`;
  return uploadToPath(firebaseApp, file, storagePath, onProgress);
}

/**
 * Upload a partner PDF report and store it in a dedicated collection path.
 * Path: projects/{projectId}/partner_reports/{timestamp}_{sanitizedName}
 */
export async function uploadPartnerPdfToStorage(
  firebaseApp: FirebaseApp,
  file: File,
  projectId: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `projects/${projectId}/partner_reports/${timestamp}_${sanitizedName}`;
  return uploadToPath(firebaseApp, file, storagePath, onProgress);
}

/**
 * Upload a project document to an organized Cloud Storage path.
 */
export async function uploadProjectDocument(
  firebaseApp: FirebaseApp,
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  return uploadToPath(firebaseApp, file, storagePath, onProgress);
}

/**
 * Process a queue of files with at most MAX_CONCURRENT parallel uploads.
 * Calls onItemComplete for each finished item (success or failure).
 */
export async function uploadQueue(
  firebaseApp: FirebaseApp,
  items: UploadQueueItem[],
  projectId: string,
  onItemProgress: (key: string, pct: number) => void,
  onItemComplete: (key: string, result: FileUploadResult, item: UploadQueueItem) => void
): Promise<void> {
  const queue = [...items];
  const running = new Set<Promise<void>>();

  const startNext = (): Promise<void> | null => {
    const item = queue.shift();
    if (!item) return null;
    const p = uploadFileToStorage(
      firebaseApp,
      item.file,
      projectId,
      (pct) => onItemProgress(item.key, pct),
      item.category
    ).then((result) => {
      running.delete(p);
      onItemComplete(item.key, result, item);
    });
    running.add(p);
    return p;
  };

  // Seed initial batch
  for (let i = 0; i < Math.min(MAX_CONCURRENT, items.length); i++) startNext();

  while (running.size > 0) {
    await Promise.race(running);
    while (running.size < MAX_CONCURRENT && queue.length > 0) startNext();
  }
}

// ─── Core engine (always resumable) ──────────────────────────────────────────
async function uploadToPath(
  firebaseApp: FirebaseApp,
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  return new Promise((resolve) => {
    try {
      const storage = getStorage(firebaseApp);
      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(pct);
        },
        (error) => {
          resolve({ success: false, error: error.message || 'Upload error' });
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, downloadUrl, storagePath });
          } catch (urlError) {
            resolve({
              success: false,
              error: urlError instanceof Error ? urlError.message : 'Error getting download URL',
            });
          }
        }
      );
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Initialization error',
      });
    }
  });
}

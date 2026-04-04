'use client';

import { FirebaseApp } from 'firebase/app';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';

export interface FileUploadResult {
  success: boolean;
  downloadUrl?: string;
  storagePath?: string;
  error?: string;
}

/**
 * Hybrid Secure Asset Upload Engine
 * Archivos < 5MB: Auto-enrutados por Transmisión Atómica (uploadBytes).
 * Archivos >= 5MB: Auto-enrutados por Transmisión Resumible (uploadBytesResumable).
 */
export async function uploadFileToStorage(
  firebaseApp: FirebaseApp,
  file: File,
  projectId: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `projects/${projectId}/assets/${timestamp}_${sanitizedName}`;
  return uploadToPath(firebaseApp, file, storagePath, onProgress);
}

/**
 * Upload a project document to an organized Cloud Storage path.
 * Path structure: projects/{project_code}/{type_folder}/{document_id}_{revision}.{ext}
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
 * Core upload engine — shared by both legacy assets and new project documents.
 */
async function uploadToPath(
  firebaseApp: FirebaseApp,
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  return new Promise(async (resolve) => {
    try {
      const storage = getStorage(firebaseApp);
      const fileRef = ref(storage, storagePath);

      const FIVE_MB = 5 * 1024 * 1024;

      if (file.size < FIVE_MB) {
        // --- MOTOR DE TRANSMISIÓN ATÓMICA ---
        setTimeout(() => onProgress?.(10), 50);
        const snapshot = await uploadBytes(fileRef, file);
        onProgress?.(100);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        resolve({ success: true, downloadUrl, storagePath });
      } else {
        // --- MOTOR RESUMIBLE ---
        const uploadTask = uploadBytesResumable(fileRef, file);
        uploadTask.on(
          'state_changed',
          (snapshot: any) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          },
          (error: any) => {
            resolve({
              success: false,
              error: error.message || 'Unknown error uploading file',
            });
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                success: true,
                downloadUrl,
                storagePath,
              });
            } catch (urlError) {
              resolve({
                success: false,
                error: urlError instanceof Error ? urlError.message : 'Error getting URL',
              });
            }
          }
        );
      }
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
      });
    }
  });
}

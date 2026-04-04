'use client';

import { useEffect, useRef } from "react";
import { getPendingJobs, removeJobFromQueue } from "@/lib/indexeddb-utils";
import { uploadFileToStorage, uploadProjectDocument } from "@/firebase/storage-utils";
import { useFirebaseApp, useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

export function useSyncWorker() {
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!firebaseApp || !firestore) return;

    const syncPendingJobs = async () => {
      // Prevent overlapping runs
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const jobs = await getPendingJobs();
        if (!jobs || jobs.length === 0) {
          isSyncingRef.current = false;
          return;
        }

        console.log(`[GHOST SYNC] Found ${jobs.length} pending jobs in the offline vault.`);

        for (const job of jobs) {
          try {
            let uploadResult;

            if (job.targetCollection === 'project_data' && job.storagePath) {
              // ──── PROJECT DATA DOCUMENT UPLOAD ────
              uploadResult = await uploadProjectDocument(
                firebaseApp,
                job.file,
                job.storagePath
              );

              if (uploadResult.success && uploadResult.downloadUrl) {
                // Update project_data document in Firestore
                const docRef = doc(firestore, "project_data", job.id);
                await updateDoc(docRef, {
                  download_url: uploadResult.downloadUrl,
                  storage_path: uploadResult.storagePath || job.storagePath,
                  status: "borrador",
                  last_modified: new Date().toISOString(),
                });

                await removeJobFromQueue(job.id);
                console.log(`[GHOST SYNC] Project document ${job.id} synced → Cloud Storage.`);
              }
            } else {
              // ──── LEGACY ASSET UPLOAD ────
              uploadResult = await uploadFileToStorage(
                firebaseApp,
                job.file,
                job.projectId
              );

              if (uploadResult.success && uploadResult.downloadUrl) {
                const assetRef = doc(firestore, "projects", job.projectId, "assets", job.id);
                await updateDoc(assetRef, {
                  fileUrl: uploadResult.downloadUrl,
                  status: "Available"
                });

                await removeJobFromQueue(job.id);
                console.log(`[GHOST SYNC] Legacy asset ${job.id} synced and cleared.`);
              }
            }
          } catch (error) {
            console.error(`[GHOST SYNC] Failed to sync job ${job.id}`, error);
          }
        }
      } catch (err) {
        console.error("[GHOST SYNC] Fatal read error", err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run every 5 seconds
    const interval = setInterval(syncPendingJobs, 5000);
    // Also run immediately on mount
    syncPendingJobs();

    return () => clearInterval(interval);
  }, [firebaseApp, firestore]);
}

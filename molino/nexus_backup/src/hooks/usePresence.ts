'use client';

import { useEffect, useState } from 'react';
import {
  doc, setDoc, onSnapshot, collection,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';

export interface PresenceUser {
  uid: string;
  displayName: string;
  profesionalName: string;
  photoURL: string | null;
  lastSeen: Date | null;
  isOnline: boolean;
  currentPath: string;
}

export function usePresence(currentPath: string = '/') {
  const firestore = useFirestore();
  const { user } = useUser();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  // Leer el perfil propio de Firestore para obtener profesionalName y foto actualizada
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  // Escribir presencia propia + heartbeat cada 30 s
  useEffect(() => {
    if (!firestore || !user || user.isAnonymous) return;

    const presenceRef = doc(firestore, 'presence', user.uid);

    const writePresence = () => {
      setDoc(presenceRef, {
        uid: user.uid,
        displayName: userData?.displayName || user.displayName || 'Usuario',
        profesionalName: userData?.profesionalName || user.displayName || 'Usuario',
        photoURL: userData?.photoURL || user.photoURL || null,
        lastSeen: serverTimestamp(),
        isOnline: true,
        currentPath,
      }, { merge: true }).catch(() => {});
    };

    const markOffline = () => {
      setDoc(presenceRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };

    writePresence();
    const interval = setInterval(writePresence, 30_000);

    const handleVisibilityChange = () => {
      if (document.hidden) markOffline();
      else writePresence();
    };

    window.addEventListener('beforeunload', markOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', markOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      markOffline();
    };
  }, [firestore, user, userData, currentPath]);

  // Escuchar la colección /presence para saber quién está en línea
  useEffect(() => {
    if (!firestore || !user) return;

    const unsubscribe = onSnapshot(
      collection(firestore, 'presence'),
      (snapshot) => {
        const now = Date.now();
        const STALE_MS = 2 * 60 * 1000; // 2 minutos sin heartbeat = offline

        const users: PresenceUser[] = snapshot.docs
          .filter(d => d.id !== user.uid) // excluir propio usuario
          .map(d => {
            const data = d.data();
            const lastSeenDate = data.lastSeen instanceof Timestamp
              ? data.lastSeen.toDate()
              : null;
            const fresh = lastSeenDate ? (now - lastSeenDate.getTime()) < STALE_MS : false;
            return {
              uid: d.id,
              displayName: data.displayName || 'Usuario',
              profesionalName: data.profesionalName || data.displayName || 'Usuario',
              photoURL: data.photoURL || null,
              lastSeen: lastSeenDate,
              isOnline: data.isOnline === true && fresh,
              currentPath: data.currentPath || '/',
            };
          })
          .filter(u => u.isOnline);

        setOnlineUsers(users);
      },
      () => {},
    );

    return unsubscribe;
  }, [firestore, user]);

  return { onlineUsers };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, setDoc, updateDoc,
  onSnapshot, query, where, orderBy, limit,
  serverTimestamp, Timestamp, increment,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { PresenceUser } from './usePresence';

export interface DMMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date | null;
}

export interface DMConversation {
  id: string;
  participants: string[];
  otherUser: {
    uid: string;
    displayName: string;
    profesionalName: string;
    photoURL: string | null;
  };
  lastMessage: string;
  lastMessageAt: Date | null;
  unreadCount: number;
}

// ID determinístico para una conversación entre dos usuarios
export function buildConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('__');
}

// ─── Hook: lista de conversaciones del usuario actual ────────────────────────
export function useDirectMessages() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!firestore || !user) return;

    // array-contains no requiere índice compuesto cuando no se usa orderBy
    const q = query(
      collection(firestore, 'direct_messages'),
      where('participants', 'array-contains', user.uid),
      limit(50),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: DMConversation[] = snapshot.docs
        .map(d => {
          const data = d.data();
          const otherUid = (data.participants as string[]).find(p => p !== user.uid) ?? '';
          const otherData = data.participantData?.[otherUid] ?? {};
          const lastMsgAt = data.lastMessageAt instanceof Timestamp
            ? data.lastMessageAt.toDate()
            : null;
          return {
            id: d.id,
            participants: data.participants ?? [],
            otherUser: {
              uid: otherUid,
              displayName: otherData.displayName || 'Usuario',
              profesionalName: otherData.profesionalName || otherData.displayName || 'Usuario',
              photoURL: otherData.photoURL || null,
            },
            lastMessage: data.lastMessage || '',
            lastMessageAt: lastMsgAt,
            unreadCount: data.unreadCounts?.[user.uid] ?? 0,
          };
        })
        // ordenar por último mensaje (más reciente primero, client-side)
        .sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));

      setConversations(convs);
      setTotalUnread(convs.reduce((sum, c) => sum + c.unreadCount, 0));
    }, () => {});

    return unsubscribe;
  }, [firestore, user]);

  // Obtener o crear la conversación con otro usuario
  const getOrCreateConversation = useCallback(async (other: PresenceUser): Promise<string | null> => {
    if (!firestore || !user) return null;

    const convId = buildConversationId(user.uid, other.uid);
    const convRef = doc(firestore, 'direct_messages', convId);

    await setDoc(convRef, {
      participants: [user.uid, other.uid],
      participantData: {
        [user.uid]: {
          displayName: user.displayName || 'Usuario',
          profesionalName: user.displayName || 'Usuario',
          photoURL: user.photoURL || null,
        },
        [other.uid]: {
          displayName: other.displayName,
          profesionalName: other.profesionalName,
          photoURL: other.photoURL,
        },
      },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      unreadCounts: { [user.uid]: 0, [other.uid]: 0 },
      createdAt: serverTimestamp(),
    }, { merge: true });

    return convId;
  }, [firestore, user]);

  // Enviar un mensaje
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    otherUid: string,
  ) => {
    if (!firestore || !user || !content.trim()) return;

    await addDoc(
      collection(firestore, 'direct_messages', conversationId, 'messages'),
      {
        senderId: user.uid,
        senderName: user.displayName || 'Usuario',
        content: content.trim(),
        timestamp: serverTimestamp(),
      },
    );

    await updateDoc(doc(firestore, 'direct_messages', conversationId), {
      lastMessage: content.trim().slice(0, 100),
      lastMessageAt: serverTimestamp(),
      [`unreadCounts.${otherUid}`]: increment(1),
    });
  }, [firestore, user]);

  // Marcar conversación como leída
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!firestore || !user) return;
    await updateDoc(doc(firestore, 'direct_messages', conversationId), {
      [`unreadCounts.${user.uid}`]: 0,
    }).catch(() => {});
  }, [firestore, user]);

  return { conversations, totalUnread, getOrCreateConversation, sendMessage, markAsRead };
}

// ─── Hook separado: mensajes de una conversación específica ──────────────────
export function useConversationMessages(conversationId: string | null) {
  const firestore = useFirestore();
  const [messages, setMessages] = useState<DMMessage[]>([]);

  useEffect(() => {
    if (!firestore || !conversationId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(firestore, 'direct_messages', conversationId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId,
            senderName: data.senderName,
            content: data.content,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : null,
          };
        }),
      );
    }, () => {});

    return unsubscribe;
  }, [firestore, conversationId]);

  return messages;
}

'use client';

// Firebase Cloud Messaging (FCM) utility for push notifications
// FCM is free with no credit limits

import { db } from './client';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Request notification permission and get FCM token.
 * Saves the token to the user's Firestore document.
 */
export async function requestNotificationPermission(uid: string): Promise<string | null> {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Dynamically import firebase messaging to avoid SSR issues
    const { getMessaging, getToken } = await import('firebase/messaging');
    const { app } = await import('./client');

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      // Save token to user document
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
      console.log('FCM token saved successfully');
    }

    return token;
  } catch (error) {
    console.error('Failed to get notification permission:', error);
    return null;
  }
}

/**
 * Listen for foreground messages (when app is open).
 * Shows a browser notification with the message content.
 */
export async function onForegroundMessage(callback: (payload: any) => void) {
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const { app } = await import('./client');

    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      // Show notification
      if (payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title || 'AI Club', {
          body: body || '',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
      callback(payload);
    });
  } catch (error) {
    console.error('Failed to set up foreground messaging:', error);
  }
}

/**
 * Check if the browser supports push notifications.
 */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

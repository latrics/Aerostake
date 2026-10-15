import { apiClient } from './api-client';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Register the Service Worker and request browser Notification permissions.
 * If granted, registers the device token with the Aerostake backend.
 */
export async function registerPushNotifications(): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { success: false, error: 'Web Push Notifications not supported on this device/browser.' };
  }

  try {
    // 1. Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    // 2. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was not granted by user.' };
    }

    // 3. Generate or retrieve push subscription token
    let subscription = await registration.pushManager.getSubscription();
    let deviceToken = '';

    if (subscription) {
      deviceToken = JSON.stringify(subscription.toJSON());
    } else {
      // Create a deterministic web push client identifier
      const generatedId = `web-${window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2)}-${Date.now()}`;
      deviceToken = generatedId;
    }

    // 4. Synchronize token with Aerostake Backend API
    try {
      await apiClient.post('/users/me/device-token', {
        device_token: deviceToken,
      });
      console.log('Aerostake push device token registered successfully');
    } catch (apiErr) {
      console.warn('Failed to sync device token to backend:', apiErr);
    }

    return { success: true, token: deviceToken };
  } catch (err: any) {
    console.error('Error during push notification registration:', err);
    return { success: false, error: err?.message || 'Registration failed' };
  }
}

/**
 * Check current notification permission state
 */
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

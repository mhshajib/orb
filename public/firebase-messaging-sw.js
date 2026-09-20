/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker — shows a notification when inbound
 * mail arrives and no Orb tab is in the foreground.
 *
 * This file is served straight out of public/, so Nuxt never bundles it: it
 * can't `import` from 'firebase/messaging' and it can't read runtimeConfig.
 * Hence the CDN compat builds below and the duplicated config — the two places
 * Orb uses the Firebase CDN and a literal config are both right here, and both
 * are forced by how service workers load. Everything else uses the npm SDK.
 *
 * Keep firebaseConfig in sync with runtimeConfig.public.firebase in
 * nuxt.config.ts, and the version in the import URLs in sync with the
 * `firebase` package version in package.json.
 */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyAC_-tLADrZUjPxnqirjikeOuq4rMdfDcE',
    authDomain: 'orb-bd.firebaseapp.com',
    projectId: 'orb-bd',
    storageBucket: 'orb-bd.firebasestorage.app',
    messagingSenderId: '671856313270',
    appId: '1:671856313270:web:569074b99687c904a6b717',
});

const messaging = firebase.messaging();

/**
 * The API sends data-only messages on purpose. A payload carrying FCM's
 * `notification` block would be auto-displayed by the browser *and* delivered
 * here, producing two alerts for one email.
 */
messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || 'New email';
    self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/favicon.png',
        badge: '/favicon.png',
        // Same tag as a previous alert for this message replaces it instead of
        // stacking, so a redelivery can't notify twice.
        tag: data.tag || 'orb-email',
        data: { link: data.link || '/app/emails' },
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || '/app/emails';

    // Prefer focusing a tab that's already open over spawning another one.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url === link && 'focus' in client) return client.focus();
            }
            for (const client of windowClients) {
                if ('navigate' in client && 'focus' in client) {
                    return client.navigate(link).then((c) => (c ? c.focus() : undefined));
                }
            }
            if (clients.openWindow) return clients.openWindow(link);
            return undefined;
        }),
    );
});

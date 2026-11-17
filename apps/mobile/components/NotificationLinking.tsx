import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

export default function NotificationLinking() {
  const lastOpened = useRef<{ id: string | null; at: number }>({ id: null, at: 0 });
  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const itemId = response.notification.request.content.data?.itemId;
      const notificationId = response.notification.request.identifier;
      if (typeof itemId !== 'string' || (lastOpened.current.id === notificationId && Date.now() - lastOpened.current.at < 1000)) return;
      lastOpened.current = { id: notificationId, at: Date.now() };
      router.push({ pathname: '/item/[id]', params: { id: itemId } });
    };
    void Notifications.getLastNotificationResponseAsync().then(openNotification).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, []);
  return null;
}

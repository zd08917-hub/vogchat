/**
 * Утилиты для работы с уведомлениями
 */

// Типы уведомлений
export type NotificationType = 'message' | 'call' | 'system';

// Интерфейс уведомления
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
  data?: any;
}

// Настройки уведомлений
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  showPreview: boolean;
  muteUntil?: Date;
}

// Звуки уведомлений
const NOTIFICATION_SOUNDS = {
  message: '/sounds/message.mp3',
  call: '/sounds/call.mp3',
  system: '/sounds/system.mp3',
} as const;

// Стандартные настройки
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  desktopEnabled: true,
  showPreview: true,
};

// Проверка поддержки уведомлений
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

// Проверка разрешения на уведомления
export function isNotificationPermissionGranted(): boolean {
  return Notification.permission === 'granted';
}

// Запрос разрешения на уведомления
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Уведомления не поддерживаются в этом браузере');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Ошибка при запросе разрешения на уведомления:', error);
    return false;
  }
}

// Воспроизведение звука уведомления
export function playNotificationSound(type: NotificationType = 'message'): void {
  if (!DEFAULT_SETTINGS.soundEnabled) return;

  try {
    const audio = new Audio(NOTIFICATION_SOUNDS[type]);
    audio.volume = 0.3;
    audio.play().catch(error => {
      console.warn('Не удалось воспроизвести звук уведомления:', error);
    });
  } catch (error) {
    console.warn('Ошибка при воспроизведении звука:', error);
  }
}

// Показать уведомление
export function showNotification(
  options: NotificationOptions,
  type: NotificationType = 'message'
): void {
  // Проверяем настройки
  const settings = getNotificationSettings();
  if (!settings.enabled || !settings.desktopEnabled) return;

  // Проверяем разрешение
  if (!isNotificationPermissionGranted()) {
    console.warn('Нет разрешения на показ уведомлений');
    return;
  }

  // Воспроизводим звук
  if (settings.soundEnabled) {
    playNotificationSound(type);
  }

  // Создаем уведомление
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag,
      silent: options.silent || false,
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    });

    // Обработчик клика по уведомлению
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Если есть данные о чате, переходим к нему
      if (options.data?.chatId) {
        // Эмитируем событие для перехода к чату
        window.dispatchEvent(new CustomEvent('notification-click', {
          detail: options.data
        }));
      }
    };

    // Автоматическое закрытие через 5 секунд
    setTimeout(() => {
      notification.close();
    }, 5000);
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
  }
}

// Уведомление о новом сообщении
export function notifyNewMessage(
  senderName: string,
  messageText: string,
  chatId: string,
  chatName?: string
): void {
  const settings = getNotificationSettings();
  
  // Если показ превью отключен, показываем общее уведомление
  const body = settings.showPreview
    ? `${senderName}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`
    : `${senderName} отправил(а) новое сообщение`;

  showNotification({
    title: chatName ? `${chatName}` : 'Новое сообщение',
    body,
    icon: '/favicon.ico',
    tag: `message-${chatId}`,
    data: { chatId, senderName, type: 'message' },
  }, 'message');
}

// Уведомление о новом чате
export function notifyNewChat(
  chatName: string,
  chatId: string
): void {
  const settings = getNotificationSettings();
  
  if (!settings.enabled) return;
  
  showNotification({
    title: 'Новый чат',
    body: `Вас добавили в чат "${chatName}"`,
    icon: '/favicon.ico',
    tag: `chat-${chatId}`,
    data: { chatId, chatName, type: 'chat' },
  }, 'system');
}

// Уведомление о входящем звонке
export function notifyIncomingCall(callerName: string, callId: string): void {
  showNotification({
    title: 'Входящий звонок',
    body: `${callerName} звонит вам`,
    icon: '/favicon.ico',
    tag: `call-${callId}`,
    requireInteraction: true,
    data: { callId, callerName, type: 'call' },
  }, 'call');
}

// Системное уведомление
export function notifySystem(title: string, body: string, data?: any): void {
  showNotification({
    title,
    body,
    icon: '/favicon.ico',
    tag: 'system',
    data: { ...data, type: 'system' },
  }, 'system');
}

// Работа с настройками в localStorage
const SETTINGS_KEY = 'notification_settings';

export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Проверяем наличие всех полей
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Преобразуем строку даты обратно в Date
        muteUntil: parsed.muteUntil ? new Date(parsed.muteUntil) : undefined,
      };
    }
  } catch (error) {
    console.error('Ошибка при чтении настроек уведомлений:', error);
  }
  
  return DEFAULT_SETTINGS;
}

export function saveNotificationSettings(settings: Partial<NotificationSettings>): void {
  try {
    const current = getNotificationSettings();
    const updated = {
      ...current,
      ...settings,
      // Сохраняем дату как строку ISO
      muteUntil: settings.muteUntil ? settings.muteUntil.toISOString() : current.muteUntil?.toISOString(),
    };
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Ошибка при сохранении настроек уведомлений:', error);
  }
}

export function resetNotificationSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

// Проверка, не заглушены ли уведомления
export function areNotificationsMuted(): boolean {
  const settings = getNotificationSettings();
  if (!settings.muteUntil) return false;
  
  return new Date() < new Date(settings.muteUntil);
}

// Заглушить уведомления на определенное время
export function muteNotifications(minutes: number): void {
  const muteUntil = new Date();
  muteUntil.setMinutes(muteUntil.getMinutes() + minutes);
  
  saveNotificationSettings({ muteUntil });
}

// Включить уведомления
export function unmuteNotifications(): void {
  saveNotificationSettings({ muteUntil: undefined });
}
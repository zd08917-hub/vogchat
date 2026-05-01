import { createApiError, isNetworkError, isAuthError } from '../utils/errorHandler';

// Используем относительный путь для API, когда фронтенд и бэкенд на одном домене
// Это работает как для локальной разработки, так и для публичного доступа через туннель
const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api');

// Вспомогательная функция для построения URL
function buildUrl(path: string, params?: Record<string, string>): string {
  let url = `${API_BASE}${path}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}

export interface Chat {
  id: string;
  name: string;
  avatar_url?: string;
  is_group: boolean;
  last_message_id?: string;
  last_message_time?: string;
  unread_count: number;
  is_pinned: boolean;
  participant_names: string[];
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name?: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'audio';
  file_url?: string;
  file_name?: string;
  duration?: number;
  read: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
}

/**
 * Получить список чатов
 */
export async function fetchChats(userId?: string): Promise<Chat[]> {
  const params = userId ? { userId } : undefined;
  const url = buildUrl('/chats', params);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch chats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Получить сообщения чата
 */
export async function fetchMessages(chatId: string): Promise<Message[]> {
  const url = buildUrl(`/chats/${chatId}/messages`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Отправить сообщение
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
  type: string = 'text',
  fileUrl?: string,
  fileName?: string
): Promise<Message> {
  const response = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      senderId,
      text,
      type,
      fileUrl,
      fileName
    }),
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to send message: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Если не удалось распарсить JSON, используем стандартное сообщение
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Получить список всех пользователей
 */
export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function fetchUsers(search?: string, page: number = 1, limit: number = 20): Promise<UsersResponse> {
  try {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString()
    };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    
    const url = buildUrl('/users', params);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      let errorMessage = `Ошибка загрузки пользователей: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Если не удалось распарсить JSON, используем стандартное сообщение
      }
      
      throw createApiError(errorMessage, response.status);
    }
    
    return response.json();
  } catch (error) {
    if (isNetworkError(error)) {
      throw createApiError('Ошибка сети. Проверьте подключение к интернету.', 0, 'NETWORK_ERROR');
    }
    
    if (isAuthError(error)) {
      throw createApiError('Ошибка авторизации. Пожалуйста, войдите снова.', 401, 'AUTH_ERROR');
    }
    
    // Перебрасываем уже созданные ошибки API
    if (error && typeof error === 'object' && (error as any).message) {
      throw error;
    }
    
    throw createApiError('Неизвестная ошибка при загрузке пользователей', 500, 'UNKNOWN_ERROR');
  }
}

/**
 * Создать новый чат (личный или групповой)
 */
export async function createChat(name: string, isGroup: boolean, participantIds: string[]): Promise<Chat> {
  const response = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, isGroup, participantIds }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create chat: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Загрузить файл
 */
export async function uploadFile(file: File): Promise<{
  success: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Обновить аватар пользователя
 */
export async function updateUserAvatar(userId: string, avatarFile: File): Promise<{
  success: boolean;
  avatarUrl: string;
}> {
  const formData = new FormData();
  formData.append('avatar', avatarFile);

  const response = await fetch(`${API_BASE}/users/${userId}/avatar`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to update avatar: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Проверить здоровье сервера
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Редактировать сообщение
 */
export async function editMessage(messageId: string, text: string, senderId: string): Promise<{
  id: string;
  text: string;
  edited: boolean;
  editedAt: string;
}> {
  const response = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, senderId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to edit message: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Удалить сообщение
 */
export async function deleteMessage(messageId: string, senderId: string): Promise<{
  success: boolean;
}> {
  const response = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ senderId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete message: ${response.statusText}`);
  }
  return response.json();
}
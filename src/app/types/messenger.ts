// Типы для внутреннего использования в компонентах (camelCase)
export interface User {
  id: string;
  name: string;
  avatar?: string;
  status: "online" | "offline" | "away";
  lastSeen?: Date;
  email?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  type: "text" | "image" | "file" | "audio";
  fileUrl?: string;
  fileName?: string;
  duration?: number;
  senderName?: string;
  edited?: boolean;
  deleted?: boolean;
  editedAt?: Date;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isGroup: boolean;
  participants: User[];
  isPinned?: boolean;
  participantNames?: string[];
}

// Типы для API (snake_case)
export interface ApiUser {
  id: string;
  name: string;
  avatar_url?: string;
  status: "online" | "offline" | "away";
  last_seen?: string;
  email?: string;
}

export interface ApiMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name?: string;
  text: string;
  type: "text" | "image" | "file" | "audio";
  file_url?: string;
  file_name?: string;
  duration?: number;
  read: boolean;
  created_at: string;
  edited?: boolean;
  deleted?: boolean;
  edited_at?: string;
}

export interface ApiChat {
  id: string;
  name: string;
  avatar_url?: string;
  is_group: boolean | number;
  last_message_id?: string;
  last_message_time?: string;
  unread_count: number;
  is_pinned: boolean | number;
  participant_names: string[];
  created_at?: string;
  updated_at?: string;
}

// Функции преобразования
export function apiChatToChat(apiChat: ApiChat): Chat {
  // Создаем минимальные объекты участников из имен
  // В реальном приложении нужно было бы загружать полные данные пользователей
  const participants: User[] = apiChat.participant_names.map((name, index) => ({
    id: `user-${index}-${Date.now()}`, // Временный ID
    name,
    status: 'offline' as const,
    avatar: undefined,
  }));
  
  // Convert relative avatar URL to absolute
  let avatar = apiChat.avatar_url;
  if (avatar && avatar.startsWith('/')) {
    const serverBase = getServerBaseUrl();
    avatar = `${serverBase}${avatar}`;
  }
  
  return {
    id: apiChat.id,
    name: apiChat.name,
    avatar: avatar || undefined,
    isGroup: Boolean(apiChat.is_group),
    lastMessageTime: apiChat.last_message_time ? new Date(apiChat.last_message_time) : undefined,
    unreadCount: apiChat.unread_count,
    isPinned: Boolean(apiChat.is_pinned),
    participants,
    participantNames: apiChat.participant_names,
  };
}

// Helper function to get server base URL
function getServerBaseUrl(): string {
  // Try to get from window object (browser) or use default
  if (typeof window !== 'undefined' && (window as any).SERVER_BASE_URL) {
    return (window as any).SERVER_BASE_URL;
  }
  // Default to localhost:3001
  return 'http://localhost:3001';
}

export function apiMessageToMessage(apiMessage: ApiMessage): Message {
  // Convert relative file URLs to absolute URLs
  let fileUrl = apiMessage.file_url;
  if (fileUrl && fileUrl.startsWith('/')) {
    // Prepend server base URL
    const serverBase = getServerBaseUrl();
    fileUrl = `${serverBase}${fileUrl}`;
  }
  
  return {
    id: apiMessage.id,
    chatId: apiMessage.chat_id,
    senderId: apiMessage.sender_id,
    senderName: apiMessage.sender_name,
    text: apiMessage.text,
    timestamp: new Date(apiMessage.created_at),
    read: apiMessage.read,
    type: apiMessage.type,
    fileUrl,
    fileName: apiMessage.file_name,
    duration: apiMessage.duration,
    edited: apiMessage.edited || false,
    deleted: apiMessage.deleted || false,
    editedAt: apiMessage.edited_at ? new Date(apiMessage.edited_at) : undefined,
  };
}

export function apiUserToUser(apiUser: ApiUser): User {
  // Convert relative avatar URLs to absolute URLs
  let avatar = apiUser.avatar_url;
  if (avatar && avatar.startsWith('/')) {
    // Prepend server base URL
    const serverBase = getServerBaseUrl();
    avatar = `${serverBase}${avatar}`;
  }
  
  return {
    id: apiUser.id,
    name: apiUser.name,
    avatar,
    status: apiUser.status,
    lastSeen: apiUser.last_seen ? new Date(apiUser.last_seen) : undefined,
    email: apiUser.email,
  };
}

// WebSocket типы
export interface SocketMessageData {
  chatId: string;
  message: ApiMessage;
}

export interface SocketJoinData {
  chatId: string;
}
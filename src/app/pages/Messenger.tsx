import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ChatList } from "../components/messenger/ChatList";
import { ChatWindow } from "../components/messenger/ChatWindow";
import { EmptyState } from "../components/messenger/EmptyState";
import { CreateGroupDialog } from "../components/messenger/CreateGroupDialog";
import { AddContactDialog } from "../components/messenger/AddContactDialog";
import { UserProfileDialog } from "../components/messenger/UserProfileDialog";
import { Message, Chat, User, ApiMessage, apiChatToChat, apiMessageToMessage, SocketMessageData } from "../types/messenger";
import { UserProvider } from "../contexts/UserContext";
import { toast } from "sonner";
import { fetchChats, fetchMessages, sendMessage as apiSendMessage, fetchUsers, createChat, editMessage, deleteMessage } from "../api/messengerApi";
import io, { Socket } from "socket.io-client";
import { notifyNewMessage, notifyNewChat, requestNotificationPermission } from "../utils/notifications";
import { Button } from "../components/ui/button";

export default function Messenger() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  const selectedChatIdRef = useRef<string | undefined>(undefined);
  const allUsersRef = useRef<User[]>([]);

  // Функция для выхода из системы
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('registeredUser');
    localStorage.removeItem('currentUserId');
    setCurrentUser(null);
    toast.info("Вы вышли из системы");
    navigate('/registration');
  };

  // Обновляем refs при изменении соответствующих state значений
  useEffect(() => {
    currentUserRef.current = currentUser;
    console.log('[DEBUG] currentUserRef updated:', currentUser?.id);
  }, [currentUser]);

  useEffect(() => {
    chatsRef.current = chats;
    console.log('[DEBUG] chatsRef updated, count:', chats.length);
  }, [chats]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
    console.log('[DEBUG] selectedChatIdRef updated:', selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    allUsersRef.current = allUsers;
    console.log('[DEBUG] allUsersRef updated, count:', allUsers.length);
  }, [allUsers]);

  // Проверка аутентификации при монтировании
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userData = localStorage.getItem('registeredUser');
    
    if (!isAuthenticated || !userData) {
      toast.error("Пожалуйста, войдите в систему");
      navigate('/registration');
      setIsUserLoading(false);
      return;
    }
    
    try {
      const userDataParsed = JSON.parse(userData);
      // Ensure the user object has all required fields for User type
      const user: User = {
        id: userDataParsed.id || `user-${Date.now()}`,
        name: userDataParsed.name || userDataParsed.email?.split('@')[0] || 'Пользователь',
        avatar: userDataParsed.avatar || userDataParsed.avatar_url || '',
        status: 'online', // Default status
        email: userDataParsed.email || '',
        lastSeen: new Date() // Default last seen
      };
      setCurrentUser(user);
      console.log('[DEBUG] User loaded from localStorage:', user);
      
      // Запрашиваем разрешение на уведомления после загрузки пользователя
      if ('Notification' in window && Notification.permission === 'default') {
        requestNotificationPermission().then(granted => {
          if (granted) {
            console.log('Разрешение на уведомления получено');
          }
        });
      }
      
      // Set loading to false AFTER currentUser is set
      // This ensures ChatWindow only renders when currentUser is available
      setIsUserLoading(false);
    } catch (error) {
      console.error("Failed to parse user data:", error);
      toast.error("Ошибка загрузки данных пользователя");
      navigate('/registration');
      setIsUserLoading(false);
    }
  }, [navigate]);

  // Загрузка чатов при монтировании
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoadingChats(true);
        // Pass current user ID to fetch only their chats
        const userId = currentUser?.id;
        const apiChats = await fetchChats(userId);
        const convertedChats = apiChats.map(apiChatToChat);
        setChats(convertedChats);
      } catch (error) {
        console.error("Failed to load chats:", error);
        toast.error("Не удалось загрузить чаты");
      } finally {
        setLoadingChats(false);
      }
    };
    
    if (currentUser) {
      loadChats();
    }
  }, [currentUser]);

  // Загрузка всех пользователей
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetchUsers();
        setAllUsers(response.users);
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    };
    loadUsers();
  }, []);

  // Настройка обработчика кликов по уведомлениям
  useEffect(() => {
    const handleNotificationClick = (event: CustomEvent) => {
      const { chatId } = event.detail;
      if (chatId) {
        // Переходим к чату
        setSelectedChatId(chatId);
        // На мобильных устройствах показываем окно чата
        setShowMobileChat(true);
        // Прокручиваем к последнему сообщению
        setTimeout(() => {
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      }
    };

    // Добавляем обработчик события
    window.addEventListener('notification-click', handleNotificationClick as EventListener);

    return () => {
      window.removeEventListener('notification-click', handleNotificationClick as EventListener);
    };
  }, []);

  // Инициализация WebSocket соединения
  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      
      // Аутентифицируем пользователя при подключении
      const currentUser = currentUserRef.current;
      if (currentUser?.id) {
        socket.emit('authenticate', currentUser.id);
        console.log('Sent authentication for user:', currentUser.id);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Ошибка подключения к серверу в реальном времени');
    });

    socket.on('new_message', (data: any) => {
      console.log('[DEBUG] WebSocket new_message received', data);
      
      // Используем ref для получения актуального currentUser
      const currentUser = currentUserRef.current;
      
      // Пропускаем сообщения от текущего пользователя - они уже добавлены локально
      if (currentUser && data.senderId === currentUser.id) {
        console.log(`[DEBUG] Skipping own message ${data.id} from WebSocket (senderId: ${data.senderId}, currentUser.id: ${currentUser?.id})`);
        return;
      }
      
      // Дополнительная проверка: если currentUser отсутствует, логируем предупреждение
      if (!currentUser) {
        console.warn('[WARNING] WebSocket new_message: currentUser is null/undefined. Message side determination may be incorrect.');
      }
      
      // Сервер отправляет объект с полями: id, chatId, senderId, text, type, read, createdAt
      // Преобразуем в ApiMessage (snake_case)
      const apiMessage: ApiMessage = {
        id: data.id,
        chat_id: data.chatId,
        sender_id: data.senderId,
        sender_name: data.senderName, // может отсутствовать
        text: data.text,
        type: data.type,
        file_url: data.fileUrl,
        file_name: data.fileName,
        duration: data.duration,
        read: data.read,
        created_at: data.createdAt,
      };
      const chatId = data.chatId;
      console.log('[DEBUG] WebSocket new_message: converting to message', apiMessage);
      const convertedMessage = apiMessageToMessage(apiMessage);
      console.log('[DEBUG] WebSocket new_message: converted message', {
        id: convertedMessage.id,
        senderId: convertedMessage.senderId,
        senderName: convertedMessage.senderName,
        isOwn: currentUser ? convertedMessage.senderId === currentUser.id : 'no currentUser',
        textPreview: convertedMessage.text?.substring(0, 50)
      });
      
      // Проверяем, нет ли уже такого сообщения в чате (по ID)
      // Это предотвращает дублирование, когда сообщение уже добавлено локально
      setMessages(prev => {
        const existingMessages = prev[chatId] || [];
        const messageExists = existingMessages.some(msg => msg.id === data.id);
        
        if (messageExists) {
          console.log(`[DEBUG] Message ${data.id} already exists in chat ${chatId}, skipping`);
          return prev;
        }
        
        console.log(`[DEBUG] WebSocket new_message: adding message ${data.id} to chat ${chatId}`);
        return {
          ...prev,
          [chatId]: [...existingMessages, convertedMessage],
        };
      });

      // Обновляем последнее сообщение в чате
      setChats(prev => prev.map(chat =>
        chat.id === chatId
          ? { ...chat, lastMessage: data.text, lastMessageTime: new Date(data.createdAt) }
          : chat
      ));

      // Показываем уведомление, если сообщение не от текущего пользователя
      if (currentUser && data.senderId !== currentUser.id) {
        const senderName = data.senderName || 'Неизвестный';
        let chatName = 'Новое сообщение';
        
        // Пытаемся найти чат в списке (используем ref для актуальных данных)
        const chat = chatsRef.current.find(c => c.id === chatId);
        if (chat) {
          chatName = chat.name || 'Чат';
        } else {
          // Если чата нет в списке, возможно это новое сообщение в новом чате
          // В этом случае мы можем попытаться определить имя чата из отправителя
          chatName = senderName;
          
          // Также можно попробовать загрузить информацию о чате
          // Но для простоты пока используем имя отправителя
          console.log(`Chat ${chatId} not found in list, using sender name for notification`);
        }
        
        // Показываем уведомление только если чат не активен (пользователь не в этом чате)
        const isChatActive = selectedChatIdRef.current === chatId;
        if (!isChatActive) {
          notifyNewMessage(senderName, data.text || 'Вложение', chatId, chatName);
        }
      }
    });

    // Событие: сообщение отредактировано
    socket.on('message_updated', (data: { id: string; chatId: string; text: string; edited: boolean; editedAt: string }) => {
      console.log('Message updated received:', data);
      
      setMessages(prev => {
        const chatMessages = prev[data.chatId] || [];
        const updatedMessages = chatMessages.map(msg =>
          msg.id === data.id
            ? {
                ...msg,
                text: data.text,
                edited: true,
                editedAt: new Date(data.editedAt)
              }
            : msg
        );
        return {
          ...prev,
          [data.chatId]: updatedMessages
        };
      });
    });

    // Событие: сообщение удалено
    socket.on('message_deleted', (data: { id: string; chatId: string; deleted: boolean }) => {
      console.log('Message deleted received:', data);
      
      setMessages(prev => {
        const chatMessages = prev[data.chatId] || [];
        const updatedMessages = chatMessages.map(msg =>
          msg.id === data.id
            ? {
                ...msg,
                deleted: true,
                text: 'Сообщение удалено',
                fileUrl: undefined,
                fileName: undefined
              }
            : msg
        );
        return {
          ...prev,
          [data.chatId]: updatedMessages
        };
      });
    });

    // Событие: обновление статуса пользователя
    socket.on('user_status_update', (data: { userId: string; status: 'online' | 'offline' | 'away'; lastSeen: string }) => {
      console.log('User status update received:', data);
      
      // Обновляем статус пользователя в списке всех пользователей
      setAllUsers(prev => prev.map(user =>
        user.id === data.userId
          ? {
              ...user,
              status: data.status,
              lastSeen: new Date(data.lastSeen)
            }
          : user
      ));
      
      // Обновляем статус пользователя в чатах
      setChats(prev => prev.map(chat => {
        // Проверяем, является ли этот пользователь участником чата
        // Для групповых чатов нужно проверить всех участников
        // Для простоты обновляем только если это личный чат с этим пользователем
        if (!chat.isGroup && chat.participants?.some(p => p.id === data.userId)) {
          return {
            ...chat,
            participants: chat.participants?.map(p =>
              p.id === data.userId
                ? { ...p, status: data.status, lastSeen: new Date(data.lastSeen) }
                : p
            )
          };
        }
        return chat;
      }));
    });

    // Событие: создан новый чат (пользователь добавлен в чат другим пользователем)
    socket.on('chat_created', (data: any) => {
      console.log('Chat created notification received:', data);
      
      // Проверяем, не существует ли уже такой чат (используем ref для актуальных данных)
      const existingChat = chatsRef.current.find(chat => chat.id === data.id);
      if (existingChat) {
        console.log(`Chat ${data.id} already exists, skipping`);
        return;
      }
      
      // Создаем объект чата из данных сервера
      // Участники чата - это массив ID пользователей, нужно преобразовать в объекты User
      // Для этого используем информацию из allUsers или создаем временные объекты
      const participantObjects: User[] = [];
      
      if (data.participant_names && Array.isArray(data.participant_names)) {
        // Если сервер отправил имена участников, создаем объекты User
        data.participant_names.forEach((name: string, index: number) => {
          // Пытаемся найти пользователя в allUsers по имени или ID (используем ref)
          const userId = data.participants?.[index] || `user-${index}`;
          const existingUser = allUsersRef.current.find(u => u.id === userId || u.name === name);
          
          if (existingUser) {
            participantObjects.push(existingUser);
          } else {
            // Создаем временный объект пользователя
            participantObjects.push({
              id: userId,
              name: name,
              email: '',
              avatar: '',
              status: 'offline' as const,
              lastSeen: new Date(),
            });
          }
        });
      } else if (data.participants && Array.isArray(data.participants)) {
        // Если есть только ID участников, создаем минимальные объекты
        data.participants.forEach((userId: string) => {
          const existingUser = allUsersRef.current.find(u => u.id === userId);
          if (existingUser) {
            participantObjects.push(existingUser);
          } else {
            participantObjects.push({
              id: userId,
              name: `Пользователь ${userId.substring(0, 8)}`,
              email: '',
              avatar: '',
              status: 'offline' as const,
              lastSeen: new Date(),
            });
          }
        });
      }
      
      const newChat: Chat = {
        id: data.id,
        name: data.name || 'Новый чат',
        isGroup: data.is_group || false,
        participants: participantObjects,
        unreadCount: 0,
        isPinned: false,
        lastMessage: '',
        lastMessageTime: new Date(data.last_message_time || Date.now()),
      };
      
      // Добавляем чат в список
      setChats(prev => {
        // Проверяем еще раз на случай, если чат был добавлен в промежутке
        const alreadyExists = prev.some(chat => chat.id === data.id);
        if (alreadyExists) {
          return prev;
        }
        return [newChat, ...prev];
      });
      
      // Инициализируем пустой список сообщений для этого чата
      setMessages(prev => ({
        ...prev,
        [data.id]: [],
      }));
      
      // Показываем уведомление
      const currentUser = currentUserRef.current;
      if (currentUser && data.participants && data.participants.includes(currentUser.id)) {
        const chatName = data.name || 'Новый чат';
        notifyNewChat(chatName, data.id);
      }
      
      console.log(`Added new chat ${data.id} to list with ${participantObjects.length} participants`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  // Отслеживание активности пользователя для обновления статуса
  useEffect(() => {
    if (!currentUser?.id || !socketRef.current?.connected) return;

    let awayTimeout: NodeJS.Timeout | null = null;
    const AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут бездействия = away

    const updateStatus = (status: 'online' | 'away') => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('update_status', { status });
        console.log(`Status updated to ${status}`);
      }
    };

    const resetAwayTimer = () => {
      if (awayTimeout) {
        clearTimeout(awayTimeout);
      }
      
      // Если текущий статус away, возвращаемся в online
      const currentUser = currentUserRef.current;
      const currentStatus = allUsers.find(u => u.id === currentUser?.id)?.status;
      if (currentStatus === 'away') {
        updateStatus('online');
      }
      
      // Устанавливаем таймер для перехода в away
      awayTimeout = setTimeout(() => {
        updateStatus('away');
      }, AWAY_TIMEOUT_MS);
    };

    // Обработчики активности
    const handleActivity = () => {
      resetAwayTimer();
    };

    // Обработчик видимости страницы
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Пользователь переключил вкладку или свернул браузер
        updateStatus('away');
      } else {
        // Пользователь вернулся на вкладку
        updateStatus('online');
        resetAwayTimer();
      }
    };

    // Добавляем обработчики событий
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Инициализируем таймер
    resetAwayTimer();

    // Очистка при размонтировании
    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (awayTimeout) {
        clearTimeout(awayTimeout);
      }
      
      // При закрытии страницы обновляем статус на offline
      // Это делается автоматически на сервере при отключении WebSocket
    };
  }, [currentUser?.id, socketRef.current?.connected, allUsers]);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (!selectedChatId) return;

    const loadMessages = async () => {
      try {
        setLoadingMessages(prev => ({ ...prev, [selectedChatId]: true }));
        const apiMessages = await fetchMessages(selectedChatId);
        const convertedMessages = apiMessages.map(apiMessageToMessage);
        setMessages(prev => ({
          ...prev,
          [selectedChatId]: convertedMessages,
        }));
      } catch (error) {
        console.error(`Failed to load messages for chat ${selectedChatId}:`, error);
        toast.error("Не удалось загрузить сообщения");
      } finally {
        setLoadingMessages(prev => ({ ...prev, [selectedChatId]: false }));
      }
    };

    // Загружаем сообщения только если их еще нет
    if (!messages[selectedChatId]) {
      loadMessages();
    }
  }, [selectedChatId]);

  // Подписка на WebSocket комнату при выборе чата
  useEffect(() => {
    if (!selectedChatId || !socketRef.current) return;

    socketRef.current.emit('join_chat', selectedChatId);
    console.log(`Joined chat room: ${selectedChatId}`);

    return () => {
      // При смене чата можно отписаться, но не обязательно
      // socketRef.current?.emit('leave_chat', selectedChatId);
    };
  }, [selectedChatId]);

  // Все пользователи загружаются из API

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  const chatMessages = selectedChatId ? messages[selectedChatId] || [] : [];
  const isLoadingCurrentMessages = selectedChatId ? loadingMessages[selectedChatId] : false;

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  const handleCreateGroup = async (name: string, selectedUsers: User[]) => {
    if (!currentUser) {
      toast.error("Пользователь не авторизован");
      return;
    }
    
    try {
      // Создаем массив ID участников (включая текущего пользователя)
      const participantIds = [...selectedUsers.map(u => u.id), currentUser.id];
      
      // Создаем группу через API
      const apiChat = await createChat(name, true, participantIds);
      
      // Преобразуем API чат в Chat тип
      const newChat: Chat = {
        id: apiChat.id,
        name: apiChat.name,
        isGroup: apiChat.is_group,
        participants: [...selectedUsers, currentUser],
        unreadCount: apiChat.unread_count || 0,
        isPinned: apiChat.is_pinned || false,
        lastMessage: "Группа создана",
        lastMessageTime: new Date(apiChat.last_message_time || Date.now()),
      };

      // Обновляем состояние
      setChats((prev) => [newChat, ...prev]);
      setMessages((prev) => ({
        ...prev,
        [newChat.id]: [],
      }));
      toast.success(`Группа "${name}" создана`);
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Не удалось создать группу");
    }
  };

  const handleSendMessage = async (text: string, attachments?: { fileUrl: string; fileName: string; type: string }[]) => {
    if (!selectedChatId || !currentUser) {
      console.log('[DEBUG] handleSendMessage: missing selectedChatId or currentUser', { selectedChatId, currentUser });
      return;
    }

    try {
      console.log('[DEBUG] handleSendMessage: starting', {
        selectedChatId,
        text,
        attachments,
        currentUser: {
          id: currentUser.id,
          name: currentUser.name,
          status: currentUser.status
        }
      });
      
      // Если есть вложения, отправляем их как часть сообщения
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let type: string = 'text';
      
      if (attachments && attachments.length > 0) {
        // Берем первое вложение (можно расширить для множественных)
        const attachment = attachments[0];
        fileUrl = attachment.fileUrl;
        fileName = attachment.fileName;
        type = attachment.type;
      }
      
      // Отправляем сообщение через API
      console.log('[DEBUG] handleSendMessage: calling apiSendMessage with senderId:', currentUser.id);
      const apiMessage = await apiSendMessage(selectedChatId, currentUser.id, text, type, fileUrl, fileName);
      console.log('[DEBUG] handleSendMessage: apiSendMessage response', apiMessage);
      
      const newMessage = apiMessageToMessage(apiMessage);
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Убедимся, что senderId совпадает с currentUser.id
      // Это гарантирует, что собственные сообщения всегда отображаются справа
      if (currentUser && newMessage.senderId !== currentUser.id) {
        console.warn(`[CRITICAL FIX] Message senderId (${newMessage.senderId}) doesn't match currentUser.id (${currentUser.id}). Overriding to ensure correct side display.`);
        newMessage.senderId = currentUser.id;
      }
      
      // Убедимся, что senderName установлен правильно для локально добавленного сообщения
      if (currentUser && (!newMessage.senderName || newMessage.senderName === 'Неизвестный')) {
        newMessage.senderName = currentUser.name;
        console.log('[DEBUG] handleSendMessage: fixed senderName to', currentUser.name);
      }
      console.log('[DEBUG] handleSendMessage: converted message', newMessage);
      console.log('[DEBUG] handleSendMessage: currentUser.id vs message.senderId', {
        currentUserId: currentUser.id,
        messageSenderId: newMessage.senderId,
        match: currentUser.id === newMessage.senderId,
        senderName: newMessage.senderName,
        note: currentUser.id === newMessage.senderId ? 'IDs MATCH - message should appear on RIGHT' : 'IDs DO NOT MATCH - message will appear on LEFT'
      });
      
      // Обновляем локальное состояние
      setMessages((prev) => {
        const currentMessages = prev[selectedChatId] || [];
        const updatedMessages = [...currentMessages, newMessage];
        console.log('[DEBUG] handleSendMessage: updating messages', {
          selectedChatId,
          currentCount: currentMessages.length,
          newCount: updatedMessages.length,
          newMessageId: newMessage.id,
          senderId: newMessage.senderId,
          currentUserId: currentUser.id,
          isOwn: newMessage.senderId === currentUser.id,
          critical: newMessage.senderId === currentUser.id ? 'Message should appear as OWN (right side)' : 'WARNING: Message will appear as OTHER (left side)'
        });
        return {
          ...prev,
          [selectedChatId]: updatedMessages,
        };
      });

      // Отправляем WebSocket событие для других пользователей
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          chatId: selectedChatId,
          message: apiMessage
        });
        console.log('WebSocket send_message event emitted for chat:', selectedChatId);
      }

      // Обновляем последнее сообщение в чате
      const displayText = text || (fileName ? `Файл: ${fileName}` : 'Вложение');
      setChats(prev => prev.map(chat =>
        chat.id === selectedChatId
          ? { ...chat, lastMessage: displayText, lastMessageTime: new Date() }
          : chat
      ));
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      // Проверяем, содержит ли ошибка сообщение о несуществующем пользователе
      const errorMessage = error.message || '';
      if (errorMessage.includes('User not found') ||
          errorMessage.includes('Пользователь не найден') ||
          errorMessage.includes('Missing senderId or content')) {
        toast.error(
          <div className="flex flex-col gap-1">
            <span>Проблема с аутентификацией. Возможно, ваш аккаунт устарел.</span>
            <Button
              variant="link"
              className="h-auto p-0 text-blue-500 dark:text-blue-400 justify-start"
              onClick={() => {
                // Используем handleLogout из компонента
                handleLogout();
                toast.dismiss();
                toast.info("Вы вышли из системы. Пожалуйста, войдите снова.");
              }}
            >
              Выйти и войти снова
            </Button>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error("Не удалось отправить сообщение");
      }
    }
  };

  // Редактировать сообщение
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!currentUser) return;
    
    try {
      await editMessage(messageId, newText, currentUser.id);
      // WebSocket событие обновит состояние автоматически
      toast.success("Сообщение отредактировано");
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast.error("Не удалось отредактировать сообщение");
    }
  };

  // Удалить сообщение
  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    
    try {
      await deleteMessage(messageId, currentUser.id);
      // WebSocket событие обновит состояние автоматически
      toast.success("Сообщение удалено");
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Не удалось удалить сообщение");
    }
  };

  const handleSendVoice = (duration: number) => {
    if (!selectedChatId || !currentUser) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      chatId: selectedChatId,
      senderId: currentUser.id,
      text: "",
      timestamp: new Date(),
      read: false,
      type: "audio",
      duration,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
    }));
  };

  const handleClearChat = () => {
    if (!selectedChatId) return;

    setMessages((prev) => ({
      ...prev,
      [selectedChatId]: [],
    }));
    toast.info("Чат очищен");
  };

  const handleDeleteChat = () => {
    if (!selectedChatId) return;

    setChats((prev) => prev.filter((chat) => chat.id !== selectedChatId));
    setMessages((prev) => {
      const newMessages = { ...prev };
      delete newMessages[selectedChatId];
      return newMessages;
    });
    setSelectedChatId(undefined);
    setShowMobileChat(false);
    toast.info("Чат удален");
  };

  const handleBlockUser = () => {
    toast.warning("Пользователь заблокирован");
  };

  const handleStartChatWithUser = async (userId: string) => {
    if (!currentUser) {
      toast.error("Пользователь не авторизован");
      return;
    }
    
    // Проверяем, есть ли уже чат с этим пользователем
    const existingChat = chats.find(
      (chat) => !chat.isGroup && chat.participants.some((p) => p.id === userId)
    );

    if (existingChat) {
      setSelectedChatId(existingChat.id);
      setShowMobileChat(true);
      return;
    }

    const otherUser = allUsers.find((u) => u.id === userId);
    if (!otherUser) {
      toast.error("Пользователь не найден");
      return;
    }
    
    try {
      // Создаем личный чат через API
      const apiChat = await createChat("", false, [currentUser.id, userId]);
      
      // Преобразуем API чат в Chat тип
      const newChat: Chat = {
        id: apiChat.id,
        name: apiChat.name || `${otherUser.name}`,
        isGroup: apiChat.is_group,
        participants: [currentUser, otherUser],
        unreadCount: apiChat.unread_count || 0,
        isPinned: apiChat.is_pinned || false,
        lastMessage: "",
        lastMessageTime: new Date(apiChat.last_message_time || Date.now()),
      };

      // Обновляем состояние
      setChats((prev) => [newChat, ...prev]);
      setMessages((prev) => ({
        ...prev,
        [newChat.id]: [],
      }));
      setSelectedChatId(newChat.id);
      setShowMobileChat(true);
      toast.success("Новый чат создан");
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Не удалось создать чат");
    }
  };

  const handleViewProfile = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    setSelectedUserForProfile(user || null);
    setUserProfileOpen(true);
  };

  const handleViewChatProfile = () => {
    if (!selectedChat || !currentUser) return;
    // Для группового чата показываем информацию о группе
    // Для личного чата показываем профиль собеседника
    if (selectedChat.isGroup) {
      toast.info("Информация о группе");
    } else {
      const otherUser = selectedChat.participants.find((p) => p.id !== currentUser.id);
      if (otherUser) {
        setSelectedUserForProfile(otherUser);
        setUserProfileOpen(true);
      }
    }
  };

  return (
    <UserProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-900">
        {/* Список чатов */}
        <div className={`w-full md:w-[380px] lg:w-[420px] h-full ${showMobileChat ? 'hidden md:block' : 'block'}`}>
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onAddContact={() => setAddContactOpen(true)}
            onViewProfile={handleViewProfile}
            isLoading={loadingChats}
          />
        </div>

        {/* Окно чата или пустое состояние */}
        <div className={`flex-1 h-full ${showMobileChat ? 'block' : 'hidden md:block'}`}>
          {isUserLoading || !currentUser ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">
                {isUserLoading ? 'Загрузка пользователя...' : 'Ошибка загрузки пользователя'}
              </div>
            </div>
          ) : selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              messages={chatMessages}
              currentUserId={currentUser.id}
              onSendMessage={handleSendMessage}
              onSendVoice={handleSendVoice}
              onBack={handleBackToList}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
              onBlockUser={handleBlockUser}
              onViewProfile={handleViewChatProfile}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              isLoading={isLoadingCurrentMessages}
            />
          ) : (
            <EmptyState onStartChat={handleStartChatWithUser} />
          )}
        </div>

        {/* Мобильное отображение: скрываем список чатов при открытом окне */}
        <div className="md:hidden w-full h-full">
          {showMobileChat && selectedChat && currentUser ? (
            <ChatWindow
              chat={selectedChat}
              messages={chatMessages}
              currentUserId={currentUser.id}
              onSendMessage={handleSendMessage}
              onSendVoice={handleSendVoice}
              onBack={handleBackToList}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
              onBlockUser={handleBlockUser}
              onViewProfile={handleViewChatProfile}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              isLoading={isLoadingCurrentMessages}
            />
          ) : (
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={handleSelectChat}
              onCreateGroup={() => setCreateGroupOpen(true)}
              onAddContact={() => setAddContactOpen(true)}
              onViewProfile={handleViewProfile}
              isLoading={loadingChats}
            />
          )}
        </div>

        {/* Диалоги */}
        <CreateGroupDialog
          open={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          availableUsers={allUsers}
          onCreateGroup={handleCreateGroup}
        />
        <AddContactDialog
          open={addContactOpen}
          onClose={() => setAddContactOpen(false)}
          onStartChat={(userId) => {
            handleStartChatWithUser(userId);
            setAddContactOpen(false);
          }}
          onViewProfile={(userId) => {
            // We need to fetch the user details for the profile
            // For now, we'll find it in allUsers if available
            const user = allUsers.find(u => u.id === userId);
            if (user) {
              setSelectedUserForProfile(user);
              setUserProfileOpen(true);
            } else {
              // If not found in allUsers, we could fetch from API
              // For simplicity, we'll just show a toast
              toast.info("Информация о пользователе загружается...");
            }
          }}
        />
        <UserProfileDialog
          open={userProfileOpen}
          onClose={() => setUserProfileOpen(false)}
          user={selectedUserForProfile}
          onStartChat={() => {
            if (selectedUserForProfile) {
              handleStartChatWithUser(selectedUserForProfile.id);
              setUserProfileOpen(false);
            }
          }}
          onStartAudioCall={() => toast.info("Аудиозвонок начат")}
          onStartVideoCall={() => toast.info("Видеозвонок начат")}
        />
      </div>
    </UserProvider>
  );
}
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import knex from 'knex';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Импорт конфигурации Knex через require, чтобы избежать проблем с TypeScript
const knexConfig = require('../knexfile.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Инициализация базы данных
const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

// Проверка подключения к БД
db.raw('SELECT 1')
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB лимит
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|ogg|mp4|avi|mov/;
    const allowedMimeTypes = /image\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/|audio\/|video\//;
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);
    
    // Для текстовых файлов разрешаем любые MIME-типы, начинающиеся с text/
    if (file.mimetype.startsWith('text/')) {
      return cb(null, true);
    }
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла. Разрешены: изображения, документы, аудио, видео, текстовые файлы'));
    }
  }
});

// Простой маршрут для проверки
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Получить список чатов для пользователя (заглушка - возвращаем все чаты)
app.get('/api/chats', async (req, res) => {
  try {
    const { userId } = req.query;
    
    let query = db('chats')
      .select('chats.*', db.raw('GROUP_CONCAT(users.name) as participant_names'))
      .leftJoin('participants', 'chats.id', 'participants.chat_id')
      .leftJoin('users', 'participants.user_id', 'users.id')
      .groupBy('chats.id')
      .orderBy('chats.last_message_time', 'desc');
    
    // Если передан userId, фильтруем чаты, где этот пользователь является участником
    if (userId && typeof userId === 'string') {
      query = query.whereIn('chats.id', function() {
        this.select('chat_id')
          .from('participants')
          .where('user_id', userId);
      });
      console.log(`[DEBUG] Filtering chats for user ${userId}`);
    } else {
      console.log('[DEBUG] No userId provided, returning all chats');
    }
    
    const chats = await query;
    
    // Преобразуем participant_names в массив и обновляем названия чатов
    const formattedChats = chats.map(chat => {
      const participantNames = chat.participant_names ? chat.participant_names.split(',') : [];
      
      // Для личных чатов всегда показываем имена участников
      let chatName = chat.name;
      if (!chat.is_group) {
        if (participantNames.length > 0) {
          // Для личного чата показываем имена всех участников
          chatName = participantNames.join(', ');
        } else if (chatName === 'Личный чат' || !chatName) {
          chatName = 'Новый чат';
        }
      }
      
      return {
        ...chat,
        name: chatName,
        participant_names: participantNames
      };
    });
    
    console.log(`[DEBUG] Returning ${formattedChats.length} chats`);
    res.json(formattedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать новый чат (личный или групповой)
app.post('/api/chats', async (req, res) => {
  const { name, isGroup = false, participantIds } = req.body;
  
  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ error: 'At least one participant is required' });
  }
  
  try {
    console.log(`[DEBUG] Creating chat: name=${name}, isGroup=${isGroup}, participantIds=${JSON.stringify(participantIds)}`);
    
    // Проверяем, что все участники существуют в базе данных
    const existingUsers = await db('users')
      .select('id', 'name')
      .whereIn('id', participantIds);
    
    const existingUserIds = existingUsers.map(user => user.id);
    const missingUserIds = participantIds.filter(id => !existingUserIds.includes(id));
    
    if (missingUserIds.length > 0) {
      console.log(`[DEBUG] Some users not found: ${missingUserIds.join(', ')}`);
      return res.status(400).json({
        error: 'Some users not found',
        missingUserIds
      });
    }
    
    const chatId = `chat-${Date.now()}`;
    
    // Для личных чатов получаем имена участников для названия
    let chatName = name;
    if (!chatName && !isGroup) {
      if (existingUsers.length > 0) {
        // Для личного чата используем имена всех участников через запятую
        chatName = existingUsers.map(u => u.name).join(', ');
      } else {
        chatName = 'Личный чат';
      }
    } else if (!chatName && isGroup) {
      chatName = 'Новая группа';
    }
    
    console.log(`[DEBUG] Creating chat with id ${chatId}, name ${chatName}`);
    
    // Создаем чат
    await db('chats').insert({
      id: chatId,
      name: chatName,
      is_group: isGroup,
      last_message_time: new Date().toISOString()
    });
    
    // Добавляем участников с уникальными ID
    const timestamp = Date.now();
    const participants = participantIds.map((userId, index) => ({
      id: `part-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      chat_id: chatId,
      user_id: userId
    }));
    
    console.log(`[DEBUG] Inserting ${participants.length} participants`);
    await db('participants').insert(participants);
    
    // Получаем созданный чат с именами участников
    const chat = await db('chats')
      .select('chats.*', db.raw('GROUP_CONCAT(users.name) as participant_names'))
      .leftJoin('participants', 'chats.id', 'participants.chat_id')
      .leftJoin('users', 'participants.user_id', 'users.id')
      .where('chats.id', chatId)
      .groupBy('chats.id')
      .first();
    
    if (chat) {
      chat.participant_names = chat.participant_names ? chat.participant_names.split(',') : [];
      console.log(`[DEBUG] Created chat:`, chat);
    }
    
    // Отправляем WebSocket уведомление всем участникам чата
    // Преобразуем чат в формат для фронтенда
    const chatForNotification = {
      id: chat.id,
      name: chat.name,
      is_group: chat.is_group,
      last_message_time: chat.last_message_time,
      participant_names: chat.participant_names,
      participants: participantIds
    };
    
    // Отправляем уведомление каждому участнику
    participantIds.forEach(userId => {
      io.to(`user_${userId}`).emit('chat_created', chatForNotification);
      console.log(`[DEBUG] Sent chat_created notification to user ${userId}`);
    });
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: 'Internal server error',
      details: errorMessage
    });
  }
});

// Получить сообщения конкретного чата
app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await db('messages')
      .select('messages.*', 'users.name as sender_name')
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .where('messages.chat_id', chatId)
      .orderBy('messages.created_at', 'asc');
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Отправить сообщение
app.post('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const { senderId, text, type = 'text', fileUrl, fileName, duration } = req.body;
  
  if (!senderId || (!text && !fileUrl)) {
    return res.status(400).json({ error: 'Missing senderId or content' });
  }
  
  try {
    // Проверяем, существует ли пользователь
    const user = await db('users').where('id', senderId).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please log out and log in again.' });
    }
    
    // Проверяем, существует ли чат
    const chat = await db('chats').where('id', chatId).first();
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const messageId = `msg-${Date.now()}`;
    await db('messages').insert({
      id: messageId,
      chat_id: chatId,
      sender_id: senderId,
      text: text || (fileName ? `Файл: ${fileName}` : 'Вложение'),
      type,
      file_url: fileUrl,
      file_name: fileName,
      duration,
      read: false,
      edited: false,
      deleted: false,
      edited_at: null,
      created_at: new Date().toISOString()
    });
    
    // Обновляем last_message_id и last_message_time в чате
    await db('chats')
      .where('id', chatId)
      .update({
        last_message_id: messageId,
        last_message_time: new Date().toISOString()
      });
    
    // Получаем имя отправителя
    const sender = await db('users').where('id', senderId).first();
    const senderName = sender?.name || 'Неизвестный';
    
    // Отправляем через WebSocket
    const newMessage = {
      id: messageId,
      chatId,
      senderId,
      senderName,
      text: text || (fileName ? `Файл: ${fileName}` : 'Вложение'),
      type,
      fileUrl,
      fileName,
      duration,
      read: false,
      edited: false,
      deleted: false,
      editedAt: null,
      createdAt: new Date().toISOString()
    };
    io.to(`chat_${chatId}`).emit('new_message', newMessage);
    
    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error('Error sending message:', error);
    
    // Более информативные ошибки для распространенных случаев
    if (error.code === 'SQLITE_CONSTRAINT') {
      if (error.message?.includes('FOREIGN KEY constraint failed')) {
        if (error.message?.includes('sender_id')) {
          return res.status(404).json({ error: 'User not found. Please log out and log in again.' });
        } else if (error.message?.includes('chat_id')) {
          return res.status(404).json({ error: 'Chat not found' });
        }
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Редактировать сообщение
app.patch('/api/messages/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { text, senderId } = req.body;
  
  if (!text || !senderId) {
    return res.status(400).json({ error: 'Missing text or senderId' });
  }
  
  try {
    // Проверяем, существует ли сообщение и принадлежит ли оно отправителю
    const message = await db('messages')
      .where('id', messageId)
      .first();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.sender_id !== senderId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    
    // Обновляем сообщение
    await db('messages')
      .where('id', messageId)
      .update({
        text,
        edited: true,
        edited_at: new Date().toISOString()
      });
    
    // Получаем обновленное сообщение
    const updatedMessage = await db('messages')
      .where('id', messageId)
      .first();
    
    // Отправляем через WebSocket
    const messageUpdate = {
      id: messageId,
      chatId: updatedMessage.chat_id,
      text: updatedMessage.text,
      edited: true,
      editedAt: updatedMessage.edited_at
    };
    io.to(`chat_${updatedMessage.chat_id}`).emit('message_updated', messageUpdate);
    
    res.json({
      id: messageId,
      text: updatedMessage.text,
      edited: true,
      editedAt: updatedMessage.edited_at
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить сообщение
app.delete('/api/messages/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { senderId } = req.body;
  
  if (!senderId) {
    return res.status(400).json({ error: 'Missing senderId' });
  }
  
  try {
    // Проверяем, существует ли сообщение и принадлежит ли оно отправителю
    const message = await db('messages')
      .where('id', messageId)
      .first();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.sender_id !== senderId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Помечаем сообщение как удаленное (мягкое удаление)
    await db('messages')
      .where('id', messageId)
      .update({
        deleted: true,
        text: 'Сообщение удалено',
        file_url: null,
        file_name: null
      });
    
    // Отправляем через WebSocket
    const messageUpdate = {
      id: messageId,
      chatId: message.chat_id,
      deleted: true
    };
    io.to(`chat_${message.chat_id}`).emit('message_deleted', messageUpdate);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Импорт email утилиты
const { sendVerificationCode } = require('./email');

// Генерация 6-значного кода
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Отправка кода подтверждения на email
app.post('/api/auth/send-code', async (req, res) => {
  const { email, purpose = 'login' } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    // Генерируем код
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
    
    console.log(`[DEBUG] Generated verification code for ${email} (${purpose}): ${code}, expires at ${expiresAt}`);
    
    // Сохраняем в базу
    await db('verification_codes').insert({
      email,
      code,
      purpose,
      expires_at: expiresAt.toISOString(),
    });
    
    // Отправляем email
    await sendVerificationCode(email, code, purpose);
    
    res.json({ success: true, message: 'Code sent successfully' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send code' });
  }
});

// Получить список всех пользователей (для добавления в контакты)
app.get('/api/users', async (req, res) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    
    let query = db('users')
      .select('id', 'name', 'email', 'avatar_url', 'status', 'last_seen');
    
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(function() {
        this.where('name', 'like', searchTerm)
          .orWhere('email', 'like', searchTerm);
      });
    }
    
    // Получаем общее количество пользователей (для пагинации)
    const countQuery = db('users').count('* as total');
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      countQuery.where(function() {
        this.where('name', 'like', searchTerm)
          .orWhere('email', 'like', searchTerm);
      });
    }
    
    const countResult = await countQuery.first();
    const total = countResult ? parseInt(countResult.total as string, 10) : 0;
    
    // Применяем пагинацию
    const users = await query
      .orderBy('name', 'asc')
      .limit(limitNum)
      .offset(offset);
    
    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверка кода и создание/авторизация пользователя
// Helper function to generate consistent user ID from email
function generateUserIdFromEmail(email: string): string {
  // Create a hash of the email to get a consistent ID
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  // Take first 12 characters of hash and prefix with 'user-'
  return `user-${hash.substring(0, 12)}`;
}

app.post('/api/auth/verify-code', async (req, res) => {
  const { email, code, purpose = 'login', name: userName } = req.body;
  
  console.log(`[DEBUG] Verify code request: email=${email}, code=${code}, purpose=${purpose}, name=${userName}`);
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }
  
  try {
    // Ищем актуальный код
    const verification = await db('verification_codes')
      .where({ email, code, purpose, used: false })
      .where('expires_at', '>', new Date().toISOString())
      .first();
    
    console.log(`[DEBUG] Found verification record:`, verification);
    
    if (!verification) {
      console.log(`[DEBUG] No valid verification found for email ${email}`);
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    
    // Генерируем consistent user ID из email
    const userId = generateUserIdFromEmail(email);
    const name = userName || email.split('@')[0];
    
    // Проверяем, существует ли пользователь
    let user = await db('users').where({ email }).first();
    console.log(`[DEBUG] Existing user:`, user);
    
    if (!user) {
      // Пользователь не существует, создаем нового
      console.log(`[DEBUG] Creating new user with id ${userId}, name ${name}, email ${email}`);
      
      await db('users').insert({
        id: userId,
        email,
        name,
        avatar_url: null,
        status: 'online',
        last_seen: new Date().toISOString(),
      });
      
      user = await db('users').where({ id: userId }).first();
      console.log(`[DEBUG] Created user:`, user);
    } else {
      // Пользователь существует, обновляем имя если предоставлено новое
      if (userName && user.name !== userName) {
        console.log(`[DEBUG] Updating user name from ${user.name} to ${userName}`);
        await db('users').where({ id: user.id }).update({ name: userName });
        user.name = userName;
      }
      
      // Обновляем статус на online
      await db('users').where({ id: user.id }).update({
        status: 'online',
        last_seen: new Date().toISOString()
      });
      user.status = 'online';
      user.last_seen = new Date().toISOString();
    }
    
    // Помечаем код как использованный
    await db('verification_codes')
      .where({ id: verification.id })
      .update({ used: true });
    
    // Генерируем JWT токен (упрощенно - возвращаем user id)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

// Загрузить файл (аватар или вложение)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Обновить аватар пользователя
app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Обновляем аватар пользователя в базе данных
    await db('users')
      .where({ id: userId })
      .update({ avatar_url: fileUrl });

    res.json({
      success: true,
      avatarUrl: fileUrl,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Ошибка обновления аватара' });
  }
});

// Добавить статический маршрут для загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Хранилище для отслеживания подключенных пользователей (userId -> socketId)
const connectedUsers = new Map<string, string>();

// WebSocket соединение
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Событие: пользователь аутентифицировался (отправляет свой userId)
  socket.on('authenticate', async (userId: string) => {
    try {
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      
      // Сохраняем связь userId -> socketId
      connectedUsers.set(userId, socket.id);
      
      // Обновляем статус пользователя в БД
      await db('users')
        .where({ id: userId })
        .update({
          status: 'online',
          last_seen: db.fn.now()
        });
      
      // Сохраняем userId в объекте socket для последующего использования
      (socket as any).userId = userId;
      
      // Пользователь присоединяется к своей персональной комнате для получения уведомлений
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined personal room user_${userId}`);
      
      // Рассылаем обновление статуса всем подключенным клиентам
      io.emit('user_status_update', {
        userId,
        status: 'online',
        lastSeen: new Date().toISOString()
      });
      
      console.log(`User ${userId} status updated to online`);
    } catch (error) {
      console.error('Error authenticating user:', error);
    }
  });

  // Событие: пользователь обновляет свой статус
  socket.on('update_status', async (data: { status: 'online' | 'away' | 'offline' }) => {
    try {
      const userId = (socket as any).userId;
      if (!userId) {
        console.warn('Unauthorized status update attempt');
        return;
      }
      
      const { status } = data;
      console.log(`User ${userId} updating status to ${status}`);
      
      // Обновляем статус в БД
      await db('users')
        .where({ id: userId })
        .update({
          status,
          last_seen: db.fn.now()
        });
      
      // Рассылаем обновление статуса всем подключенным клиентам
      io.emit('user_status_update', {
        userId,
        status,
        lastSeen: new Date().toISOString()
      });
      
      console.log(`User ${userId} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  socket.on('send_message', (data) => {
    const { chatId, message } = data;
    // Сохраняем сообщение в БД (уже делается через REST API)
    // Рассылаем другим участникам чата
    io.to(`chat_${chatId}`).emit('new_message', message);
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    const userId = (socket as any).userId;
    if (userId) {
      try {
        // Удаляем из хранилища подключенных пользователей
        connectedUsers.delete(userId);
        
        // Обновляем статус пользователя в БД
        await db('users')
          .where({ id: userId })
          .update({
            status: 'offline',
            last_seen: db.fn.now()
          });
        
        // Рассылаем обновление статуса всем подключенным клиентам
        io.emit('user_status_update', {
          userId,
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
        
        console.log(`User ${userId} status updated to offline`);
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      }
    }
  });
});

// Debug endpoint to get latest verification code for an email
// Debug endpoint removed - was only for testing

const port: number = parseInt(process.env.PORT || '3001', 10);
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

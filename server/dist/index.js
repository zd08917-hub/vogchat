"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const knex_1 = __importDefault(require("knex"));
dotenv_1.default.config();
// Импорт конфигурации Knex через require, чтобы избежать проблем с TypeScript
const knexConfig = require('../knexfile.js');
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Инициализация базы данных
const environment = process.env.NODE_ENV || 'development';
const db = (0, knex_1.default)(knexConfig[environment]);
// Проверка подключения к БД
db.raw('SELECT 1')
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
});
// Простой маршрут для проверки
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Получить список чатов для пользователя (заглушка - возвращаем все чаты)
app.get('/api/chats', async (req, res) => {
    try {
        const chats = await db('chats')
            .select('chats.*', db.raw('GROUP_CONCAT(users.name) as participant_names'))
            .leftJoin('participants', 'chats.id', 'participants.chat_id')
            .leftJoin('users', 'participants.user_id', 'users.id')
            .groupBy('chats.id')
            .orderBy('chats.last_message_time', 'desc');
        // Преобразуем participant_names в массив
        const formattedChats = chats.map(chat => ({
            ...chat,
            participant_names: chat.participant_names ? chat.participant_names.split(',') : []
        }));
        res.json(formattedChats);
    }
    catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Internal server error' });
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
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Отправить сообщение
app.post('/api/chats/:chatId/messages', async (req, res) => {
    const { chatId } = req.params;
    const { senderId, text, type = 'text' } = req.body;
    if (!senderId || !text) {
        return res.status(400).json({ error: 'Missing senderId or text' });
    }
    try {
        const [messageId] = await db('messages').insert({
            id: `msg-${Date.now()}`,
            chat_id: chatId,
            sender_id: senderId,
            text,
            type,
            read: false,
            created_at: new Date().toISOString()
        }).returning('id');
        // Обновляем last_message_id и last_message_time в чате
        await db('chats')
            .where('id', chatId)
            .update({
            last_message_id: messageId,
            last_message_time: new Date().toISOString()
        });
        // Отправляем через WebSocket
        const newMessage = {
            id: messageId,
            chatId,
            senderId,
            text,
            type,
            read: false,
            createdAt: new Date().toISOString()
        };
        io.to(`chat_${chatId}`).emit('new_message', newMessage);
        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// WebSocket соединение
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
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
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map
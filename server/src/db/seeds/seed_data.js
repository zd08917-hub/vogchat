const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('attachments').del();
  await knex('messages').del();
  await knex('participants').del();
  await knex('chats').del();
  await knex('users').del();
  await knex('verification_codes').del();

  // Хеш пароля (для демо используем 'password123')
  const passwordHash = await bcrypt.hash('password123', 10);

  // Вставляем только одного демо пользователя (опционально)
  // Если хотим полностью чистую базу - оставляем пустую
  // await knex('users').insert([
  //   {
  //     id: 'demo-user',
  //     name: 'Демо Пользователь',
  //     email: 'demo@example.com',
  //     password_hash: passwordHash,
  //     avatar_url: null,
  //     status: 'online',
  //     last_seen: knex.fn.now()
  //   }
  // ]);

  // Для полностью чистой базы - не вставляем никаких данных
  console.log('База данных очищена от тестовых данных. Готова для реальных пользователей.');
};

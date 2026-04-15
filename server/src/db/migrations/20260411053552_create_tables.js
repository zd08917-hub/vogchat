/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('avatar_url');
      table.enum('status', ['online', 'offline', 'away']).defaultTo('offline');
      table.timestamp('last_seen').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })
    .createTable('chats', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('avatar_url');
      table.boolean('is_group').defaultTo(false);
      table.string('last_message_id').references('id').inTable('messages').onDelete('SET NULL');
      table.timestamp('last_message_time').defaultTo(knex.fn.now());
      table.integer('unread_count').defaultTo(0);
      table.boolean('is_pinned').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('participants', (table) => {
      table.string('id').primary();
      table.string('chat_id').notNullable().references('id').inTable('chats').onDelete('CASCADE');
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.unique(['chat_id', 'user_id']);
      table.timestamps(true, true);
    })
    .createTable('messages', (table) => {
      table.string('id').primary();
      table.string('chat_id').notNullable().references('id').inTable('chats').onDelete('CASCADE');
      table.string('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('text');
      table.enum('type', ['text', 'image', 'file', 'audio']).defaultTo('text');
      table.string('file_url');
      table.string('file_name');
      table.integer('duration');
      table.boolean('read').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('attachments', (table) => {
      table.string('id').primary();
      table.string('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
      table.string('file_url').notNullable();
      table.string('file_name');
      table.integer('file_size');
      table.string('mime_type');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('attachments')
    .dropTableIfExists('messages')
    .dropTableIfExists('participants')
    .dropTableIfExists('chats')
    .dropTableIfExists('users');
};

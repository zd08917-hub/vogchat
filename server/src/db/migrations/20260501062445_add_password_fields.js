/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    // Добавляем поле has_password для быстрой проверки наличия пароля
    table.boolean('has_password').defaultTo(false);
    
    // Время установки пароля
    table.timestamp('password_set_at').nullable();
    
    // Предпочтительный способ входа
    table.enu('preferred_login_method', ['password', 'email_code']).defaultTo('email_code');
    
    // Индекс для быстрого поиска пользователей с паролем
    table.index('has_password');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('has_password');
    table.dropColumn('password_set_at');
    table.dropColumn('preferred_login_method');
  });
};
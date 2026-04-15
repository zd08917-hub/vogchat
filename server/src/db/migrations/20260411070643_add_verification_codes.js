/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('verification_codes', (table) => {
    table.string('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))))'));
    table.string('email').notNullable().index();
    table.string('code').notNullable();
    table.enu('purpose', ['registration', 'login', 'password_reset']).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.boolean('used').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('verification_codes');
};

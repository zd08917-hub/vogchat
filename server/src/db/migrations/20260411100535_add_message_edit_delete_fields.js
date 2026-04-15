/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('messages', (table) => {
    table.boolean('edited').defaultTo(false);
    table.boolean('deleted').defaultTo(false);
    table.timestamp('edited_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('messages', (table) => {
    table.dropColumn('edited');
    table.dropColumn('deleted');
    table.dropColumn('edited_at');
  });
};

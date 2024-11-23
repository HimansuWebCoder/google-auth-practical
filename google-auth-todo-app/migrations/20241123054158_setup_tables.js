/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Creating 'users' table
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('google_id').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('name').notNullable();
    })
    // Creating 'todos' table
    .createTable('todos', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('task').notNullable();
      table.boolean('completed').defaultTo(false);
    })
    // Creating 'session' table for storing session data
    .createTable('session', function(table) {
      table.string('sid').primary(); // session id
      table.boolean('isLoggedIn').defaultTo(false); // Whether the user is logged in
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL'); // Linked user_id
      table.timestamp('expire', { useTz: true }).notNullable(); // Session expiration time
      table.jsonb('data'); // Store the session data as JSON
      table.jsonb('sess');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('session')  // Drop the session table
    .dropTableIfExists('todos')  // Drop the todos table
    .dropTableIfExists('users');  // Drop the users table
};

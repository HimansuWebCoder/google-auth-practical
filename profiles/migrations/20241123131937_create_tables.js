/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
   return knex.schema
      .raw('CREATE SCHEMA IF NOT EXISTS profiles')  // Add this line to create schema if not exists
      .createTable("users", (table) => {
         table.increments("id").primary();
         table.string("google_id").notNullable().unique();
         table.string("email").notNullable().unique();
         table.string("name").notNullable();
      })
      .createTable("info", (table) => {
         table.increments("id").primary();
         table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
         table.string("hobby");
         table.string("profession");
      })
      .createTable('session', (table) => {
      	table.string('sid').primary(); // session id
      	table.boolean('isLoggedIn').defaultTo(false); // Whether the user is logged in
      	table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL'); // Linked user_id
      	table.timestamp('expire', {useTz: true}).notNullable(); // Session expiration time
      	table.jsonb('data'); // Store session data as JSON
      	table.jsonb('sess'); 
      })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
   return knex.schema
      .dropTableIfExists('session')
      .dropTableIfExists("info")
      .dropTableIfExists("users");
};



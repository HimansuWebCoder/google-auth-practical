require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const knex = require('knex');
const { Pool } = require('pg');
const knexConfig = require('./knexfile');

// Initialize Express
const app = express();
const db = knex(knexConfig);

console.log(process.env.GOOGLE_CLIENT_ID)

// Setup Passport for Google Authentication
require('./passport-config');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    column: 'data', 
  }),
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure: true if using HTTPS
  // cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Middleware for initializing Passport
app.use(passport.initialize());

// Middleware for using Passport sessions
app.use(passport.session());

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Check if user is logged in
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/google');
};

// Home route after login
app.get('/', ensureAuthenticated, (req, res) => {
  // res.send(`<h1>Hello, ${req.user.name}</h1><a href="/todos">Go to Todos</a>`);
  res.json({username: req.user.name, link: "http://localhost:3000/todos"})
});

// CRUD Operations for To-Dos
app.get('/todos', ensureAuthenticated, async (req, res) => {
  try {
    const todos = await db('todos').where('user_id', req.user.id);
    res.setHeader('Content-Type', 'application/json'); // Explicitly set JSON header
    return res.json(todos);
  } catch (err) {
    res.status(500).send(err.message);
  }

  // db('todos')
  //    .select("*")
  //    .where('user_id', req.user.id)
  //    .then(todo => {
  //      return res.json(todo);
  //    })
});

app.post('/todos', ensureAuthenticated, async (req, res) => {
  const { task } = req.body;
  try {
    const [todo] = await db('todos').insert({
      user_id: req.user.id,
      task,
      completed: false
    }).returning('*');

    return res.json(todo);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/todos/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  try {
    const [todo] = await db('todos')
      .where('id', id)
      .update({ completed }, ['*']);
    return res.json(todo);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/todos/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    await db('todos').where('id', id).del();
    res.sendStatus(204);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Server Setup
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

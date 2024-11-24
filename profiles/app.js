require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const knex = require('knex');
const { Pool } = require('pg');
const cors = require("cors");
const knexConfig = require('./knexfile');

// Setup Passport for Google Authentication
require('./passport-config');

const app = express();
const db = knex(knexConfig);

// Middleware
app.use(express.json());


app.use(cors({
	origin: ['http://localhost:3000', "http://localhost:8080"],
    credentials: true
}))

app.use(express.urlencoded({extended: true}));

// Session Setup

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
})

app.use(session({
	store: new PgSession({
		pool: pool,
		tableName: 'session',
		column: 'data',
	}),
	secret: process.env.SECRET_KEY,
	resave: false,
	saveUninitialized: true,
	// cookie: { secure: false,  maxAge: 60 * 1000 } // 1 minute expiration
	cookie: { secure: false,  maxAge: 20 * 1000 } // 20 seconds expiration
}));

console.log("Google OAuth Config: ", {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI
});



// Middleware for initializing Passport
app.use(passport.initialize());

// Middleware for using Passport sessions
app.use(passport.session());

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', {
	scope: ['profile', 'email']
}));

app.get('/auth/google/callback', 
    passport.authenticate('google', {failureRedirect: '/'}), (req, res) => {
    	 // res.redirect('http://localhost:3000/dashboard');
    	 res.redirect('http://localhost:3000');
    }
);


// Check if user is logged in
const ensureAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('http://localhost:8000/auth/google');
};

// Home route after login
// app.get('/', ensureAuthenticated, (req, res) => {
// 	res.send(`<h1>Hello, ${req.user.name}</h1>
// 		<a href="/profile">Go to Your profile</a>
// 		<a href="/auth/google/callback">Logout</a>
// 		`);
// })


// CRUD operations for profiles
app.get('/profile', ensureAuthenticated, async (req, res) => {
	try {
		const profile = await db('info').where('user_id', req.user.id);
		// return res.json(profile);
		if (profile.length > 0) {
			return res.json(profile);
		} else {
			return res.json({message: "No data found for this profile user"})
		}
	} catch (err) {
		// res.status(500).send(err.message);
		res.status(500).json({message: `No Data found ${err}`})
	}
});


app.post('/profile', ensureAuthenticated, async (req, res) => {
	const { hobby } = req.body;

	try {
		const myHobby = await db('info').insert({hobby, user_id: req.user.id}).returning("*");
		return res.status(201).json(myHobby);
	} catch (err) {
		return res.status(500).json({message: `Internale Server Error: ${err.message}` })
	}
})


app.put('/profile/:id', ensureAuthenticated, async (req, res) => {
	const { id } = req.params;
	const { hobby, profession } = req.body;

	try {
		const updateInfo = await db("info").update({hobby, profession}).where({id}).returning("*")
		return res.status(200).json(updateInfo);
	} catch (err) {
		return res.status(500).json({message: `Internal server error ${err.message}`})
	}
})

app.delete('/profile/:id', ensureAuthenticated, async (req, res) => {
	const { id } = req.params;
		const deleteInfo = await db("info").del().where({id});
		if (!deleteInfo.length) {
			return res.json("info deleted successfully")
		}
})



// Logout Route
// app.get('/logout', (req, res) => {
//   console.log('Session before logout:', req.session);
//   req.logout((err) => {
//     if (err) {
//       return res.status(500).send('Failed to log out');
//     }
//     console.log('Session after logout:', req.session);
//     res.clearCookie('connect.sid');
//     res.redirect('/');
//   });
// });

// app.get('/logout', (req, res) => {
//     console.log('Session before logout:', req.session);

//     // Destroy session
//     req.logout((err) => {
//         if (err) {
//             return res.status(500).send('Failed to log out');
//         }

//         // Destroy the session store record
//         req.session.destroy((err) => {
//             if (err) {
//                 return res.status(500).send('Failed to destroy session');
//             }

//             // Manually remove session from the PostgreSQL session store
//             const sessionId = req.sessionID;
//             pool.query('DELETE FROM session WHERE sid = $1', [sessionId], (err, result) => {
//                 if (err) {
//                     console.error('Error deleting session from database:', err);
//                     return res.status(500).send('Failed to delete session from database');
//                 }

//                 console.log('Session deleted from database');
//                 // Clear the session cookie
//                 res.clearCookie('connect.sid', { path: '/' });

//                 // Redirect to home page
//                 res.redirect('/auth/google');
//             });
//         });
//     });
// });





app.listen(8000, () => {
	console.log('Server running on http://localhost:8000');
});

// add this in postman to see and access data in postman 
// first login in browser
// then copy connect.sid from browser
// then Key: Cookie and Value: connect.sid=session-id 
// do all CRUD
'use strict';

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || 'development';
const express     = require('express');
const bodyParser  = require('body-parser');
const sass        = require('node-sass');
const app         = express();
const session     = require('cookie-session');

const knexConfig  = require('./knexfile');
const knex        = require('knex')(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');
const fs          = require('fs');


app.use(session({
  name: "session",
  keys: ["Hg8mCTKao7", "lhHJBeTM1X", "zLCrHUM3So"],
  maxAge: 24 * 60 * 60 * 1000,
}));

// Seperated Routes for each Resource
const usersRoutes = require('./routes/users');
// const routes      = require('./routes/main');
// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

sass.render({
  file: './styles/style.scss',
  outputStyle: 'compressed',
}, (err, data) => {
  if(!err) {
    fs.writeFile('./public//styles/style.css', data.css, (err) => {
      if(!err) {
        console.log('Successfully compiled SCSS');
      } else console.log(err);
    });
  } else console.log(err);
});

app.use(express.static('public'));
// redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
// redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
// redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));

// Mount all resource routes
app.use('/api/users', usersRoutes(knex));


/*
--- FUNCTIONS ---
*/

// retrieve user's id given their email
const getUserIdFromEmail = (email, cb) => {
  knex('accounts')
    .select('userid').where('email', email)
    .then((result) => {
      cb(result[0]);
    })
    .catch((error) => {
      if(error) throw error;
    })
};

// retrieve user's name from 'accounts' table in database
const getUserName = (uid, cb) => {
   knex('accounts')
    .select('name').where('userid', uid)
    .then((result) => {
      cb(result[0])
    })
    .catch((error) => {
      if(error) throw error;
    });
};

// Populate "name" property for EJS render
// ...then render the page parameter
const passNameForRender = (req, res, page, paramsObject) => {
  // check for session cookie
  const uid = req.session.user_id;
  // if cookie exists, get username for the uid
  if (uid) {
    getUserName(uid, (user) => {
      // add name to render params
      paramsObject.name = user.name;
      res.render(page, paramsObject);
    });
  }
  else {
    // ... or populate name key as empty string
    paramsObject.name = '';
    res.render(page, paramsObject);
  }
};

/*
---  GET REQUEST HANDLERS ---
*/

// ---- home page ----
app.get('/', (req, res) => {
  passNameForRender(req, res, 'index', {});
});

// ---- snacks list ----
app.get("/snacks", (req,res) =>{
  // find all the snacks in the 'snacks' table
  knex
    .select()
    .from('snacks')
    .then((result) => {
      passNameForRender(req, res, 'snacks', {snacks: result});
    })
    .catch(function(err){
      console.log(err);
    });
});


// ---- registration ----
app.get('/register', (req, res) => {
  res.render('register');
});

// ---- basket / checkout ----
app.get("/basket", (req,res) =>{
  let snacksList;
  knex
  .select()
  .from('snacks')
  .then(function(result){
    snacksList = result;
    //knex.destroy();
    res.render("basket", {snacks: snacksList});
  })
  .catch(function(err){
    console.log(err);
    //knex.destroy();
  });
});

app.listen(PORT, () => {
  console.log('Example app listening on port ' + PORT);
});

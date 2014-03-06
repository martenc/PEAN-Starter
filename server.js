// modules =================================================
var express = require('express');
var app     = express();
var mongoose= require('mongoose');
// var hbs 	= require('hbs');
var hbs = require('express-hbs');

// kaiseki setup
var Kaiseki = require('kaiseki');
var parsecred = require('./config/parse');
var APP_ID = parsecred.app_id;
var REST_API_KEY = parsecred.rest_api_key;


// configuration ===========================================
	
// config files
var db = require('./config/db');


var port = process.env.PORT || 8080; // set our port
// mongoose.connect(db.url); // connect to our mongoDB database (comment out after you enter in your own credentials)

app.configure(function() {
	app.use(express.static(__dirname + '/public')); 	// set the static files location /public/img will be /img for users

	// Use `.hbs` for extensions and find partials in `views/partials`.
	app.engine('hbs', hbs.express3({
	  partialsDir: __dirname + '/templates/partials'
	}));

	app.engine('html', require('hbs').__express);		// use hbs for dynamic templates 
  	app.set('views', __dirname + '/templates');			// hbs templates (non-angular)
  	app.set('view engine', 'hbs');

	app.use(express.logger('dev')); 					// log every request to the console
	app.use(express.bodyParser()); 						// pull information from html in POST
	app.use(express.methodOverride()); 					// simulate DELETE and PUT

	app.use(express.cookieParser());					// handle sessions
	app.use(express.session({ secret: 'just a secret' }));
});



// set up global util 
//var util = require('./util');
//console.log(util.getCurrentUser.username);



// routes ==================================================
require('./app/routes')(app); // pass our application into our routes

// start app ===============================================
app.listen(port);	
console.log('Listening on port ' + port); 
exports = module.exports = app; 						// expose app
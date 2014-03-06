var Kaiseki = require('kaiseki');
var path = require('path');
var parsecred = require(path.relative('','../config/parse'));
var q = require('q');
var APP_ID = parsecred.app_id;
var REST_API_KEY = parsecred.rest_api_key;
var MASTER_KEY = parsecred.master_key;
var ADMIN_ID = parsecred.admin_objectid;
var nonAdminErrorMessage = 'sorry, you need to be the admin to manage roles and users';
var notLoggedInErrorMessage = 'sorry, you need to be logged in';


// setup SMTP
var emailconfig = require(path.relative('','../config/email'));
var nodemailer = require("nodemailer");
var transport = nodemailer.createTransport("SMTP", {
    service: emailconfig.service,
    auth: {
        user: emailconfig.authuser,
        pass: emailconfig.authopassword
    }
});


//get users

var allUsers = function () {
	var kaisekiUsers = new Kaiseki(APP_ID, REST_API_KEY);
	var deferred = q.defer();
	kaisekiUsers.getUsers(function(err, response, body, success) {
		//console.log(body);	
		deferred.resolve(body);	
		if (err != null) {
				deferred.reject(err);
			}		
	});

	return deferred.promise;
}


module.exports = function(app) {

	// user routes =========================================================

	/*
	 * GET register view
	 */
	app.get('/register', function(req, res) {
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			res.render('profile.html', { 
				layout: false , 
				'loggedin': 'true', 
				'username': req.session.username });
		}
		else {
			res.render('register.html');
		}
	});


	/*
	 * POST register
	 */
	app.post('/register', function(req, res) {

		var userInfo = {
		  // required
		  username: req.body.username,
		  password: req.body.password,
		  firstName: req.body.firstname,
		  lastName: req.body.lastname,
		  email: req.body.username,
		  status: '0' // which means email requires verification
		};

		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.createUser(userInfo, function(err, response, body, success) {
		  	console.log('posted: ' + req.body.username + ' ' + req.body.password);
			if (success) {
				// verify email/username
				/* 
				// NOT USED
				require('crypto').randomBytes(48, function(ex, buf) {
				    token = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-'));
				});
				*/
				var verifyMessage = "Please activate your email account: " + 
					req.protocol + "://" + req.get('host') + "/verify/" + body.objectId;
				var thankyouMessage = "Thank you for registering! We will review your account and reach out shortly, no matter what!"
				var mailOptions = {
				    from: emailconfig.fromemail,
				    to: req.body.username,
				    subject: "Welcome - activation required",
				    text: thankyouMessage
				}

				transport.sendMail(mailOptions, function(error, responseStatus){
				    if(!error){
				        console.log(responseStatus.message); // response from the server
				        console.log(responseStatus.messageId); // Message-ID value used
				    }
				});

				res.render('login.html', { 
					layout: false , 
					'message': 'Thank you for registering! We will review your account and reach out shortly, no matter what!' });
			}
			else {
				res.render('register.html', { 
					layout: false , 
					'message': body.error });
			}	
		});
	});


	/*
	 * GET verify email view - NOT USED BECAUSE... Parse::UserCannotBeAlteredWithoutSessionError
	 */
	app.get('/verify/:id', function(req, res) {
		var userid = new Object(req.params.id);
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.updateUser(userid, { status: '1' }, function(err, response, body, success) {
			console.log(userid);
			if (success) {
				res.render('verify.html', { 
					layout: false , 
					'headline': 'Verified!', 
					'message': req.session.username + ' is verified! Pleae login.' });
			}
			else {
				res.render('verify.html', { 
					layout: false , 
					'headline': 'Error', 
					'message': body.error });
			}	
		});
	});


	/*
	 * GET login view
	 */
	app.get('/login', function(req, res) {
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			res.redirect("/profile");
		}
		else {
			res.render('login.html');
		}
		console.log('session: ' + req.session.currentUserSessionToken);
	});


	/*
	 * POST login (requires user.status = 1, which means their email has been verified)
	 */
	app.post('/login', function(req, res) {
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.loginUser(req.body.username, req.body.password, function(err, response, body, success) {
		  	if (success) {

			  	// make sure username/email has been verified
	  			var kaisekiCheckUser = new Kaiseki(APP_ID, REST_API_KEY);
				kaisekiCheckUser.getUser( body.objectId, function(err1, response1, body1, success1) {
				  if (body1.status == '1') { // 0 = email not verified, 1 = email verified, 2 = deactivated
				  	// make session values global
			  		req.session.currentUserSessionToken = body.sessionToken;
			  		req.session.username = body.username;
			  		req.session.userObjectId = body.objectId;
			  		
			  		//redirect to profile page
			  		res.redirect("/profile");
				  }
				  else if (body1.status == '2') { 
				  	res.render('login.html', { 
				  		layout: false , 
				  		'message': 'Sorry, your account has been deactivated.' });
				  }
				  else {
				  	res.render('login.html', { 
				  		layout: false , 
				  		'message': 'Please verify your username/email.' });
				  }
				});
			}
			else {
				res.render('login.html', { 
					layout: false , 
					'message': 'Sorry, either your username and/or password were incorrect.' });
			}
		});
	});


	/*
	 * GET logout
	 */
	app.get('/logout', function(req, res) {
		req.session.currentUserSessionToken = null;
		req.session.username = null;

		res.render('login.html', { 
			layout: false , 
			'message': 'You have been successfully logged out.' });
	});


	/*
	 * GET profile view
	 */
	app.get('/profile', function(req, res) {
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.sessionToken = req.session.currentUserSessionToken; //'ef531109wz7sb67amtje31swy';
		kaiseki.getCurrentUser(function(err, response, body, success) {
			if (success) {
				console.log('Session token is valid for user ', body.username + ' ' + body.sessionToken);
				res.render('profile.html', { 
					layout: false , 
					'loggedin': 'true', 
					'body': body , 
					'admin': (req.session.userObjectId == ADMIN_ID) });
			}
			else {
				res.render('login.html');
			}
		});
	});


	/*
	 * POST profile update
	 */
	app.post('/profile', function(req, res) {

		var profileData = {
		  	'firstName' : req.body.firstname, 
		  	'lastName' : req.body.lastname,
		  	'password' : req.body.password
		  };

		console.log('posted: ' + req.body.firstname + ' ' + req.body.lastname);
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.sessionToken = req.session.currentUserSessionToken; //'ef531109wz7sb67amtje31swy';
		kaiseki.updateUser(req.body.objectid, profileData, function(err, response, body, success) {
			//console.log(body);
			if (success) {
				res.redirect('profile');
				// res.render('profile.html', { 
				// 	layout: false , 
				// 	'loggedin': 'true', 
				// 	'body': body });
			}
			else {
				res.render('login.html');
			}
		});
	});


	// admin routes ===========================================================
	/*
	 * GET create role view
	 */
	app.get('/createrole', function(req, res) {
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			if (req.session.userObjectId == ADMIN_ID) { // use the configured admin

				res.render('createrole.html', { 
					layout: false, 
					'loggedin': 'true', 
					'admin': (req.session.userObjectId == ADMIN_ID),
					'username': req.session.username  });
			}
			else {
				res.send(nonAdminErrorMessage);
			}
		}
		else {
			res.send(notLoggedInErrorMessage);
		}
	});


	/*
	 * POST create role view
	 */
	app.post('/createrole', function(req, res) {
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.masterKey = MASTER_KEY; // required to create a role
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			kaiseki.sessionToken = req.session.currentUserSessionToken;
			if (req.session.userObjectId == ADMIN_ID) { // use the configured admin

				// setup role
				var data = {
				  name: req.body.rolename,
				  ACL: {
				      "*": {
				        "read": true
				      }
				    }
				};

				kaiseki.createRole(data, function(err, response, body, success) {
					if (success) {
						console.log('role created = ', body.createdAt);	
						res.redirect('/roles');
					}
					else {
						console.log(err);
					}
					
				});
			}
			else {
				res.send(nonAdminErrorMessage);
			}
		}
		else {
			res.send(notLoggedInErrorMessage);
		}
	});


	/*
	 * GET get all roles
	 */
	app.get('/roles', function(req, res) {
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.masterKey = MASTER_KEY; // required to create a role
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			kaiseki.sessionToken = req.session.currentUserSessionToken;
			if (req.session.userObjectId == ADMIN_ID) { // use the configured admin

				kaiseki.getRoles(function(err, response, body, success) {
					// console.log(body);
					res.render('roles.html', { 
						layout: false, 
						'loggedin': 'true', 
						'admin': (req.session.userObjectId == ADMIN_ID), 
						'username': req.session.username,
						'body': body  });
				});
			}
			else {
				res.send(nonAdminErrorMessage);
			}
		}
		else {
			res.send(notLoggedInErrorMessage);
		}
	});


	/*
	 * GET role detail view
	 */
	app.get('/roledetail/:objectid', function(req, res) {
		var kaisekiRoles = new Kaiseki(APP_ID, REST_API_KEY);
		kaisekiRoles.masterKey = MASTER_KEY; // required to create a role
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			kaisekiRoles.sessionToken = req.session.currentUserSessionToken;
			if (req.session.userObjectId == ADMIN_ID) { // use the configured admin

				//get roles
				var roleId = new Object(req.params.objectid);
				kaisekiRoles.getRole(roleId, function(err, response, roleBody, success) {

					//get all users
					allUsers().then( function(resp) {

						var aclObj = {
							Users: resp,
							Role: roleBody
						}

						console.log(aclObj);

						res.render('roledetail.html', { 
							layout: false, 
							'loggedin': 'true', 
							'admin': (req.session.userObjectId == ADMIN_ID), 
							'username': req.session.username,
							'content': aclObj });

					}, function(err){
						console.log(err);
					});
				});
			}
			else {
				res.send(nonAdminErrorMessage);
			}
		}
		else {
			res.send(notLoggedInErrorMessage);
		}
	});


	/*
	 * POST update role 
	 */
	 app.post('/roledetail', function(req, res) {

	 	var data = {
		  users: {
		      "__op": "AddRelation",
		      "objects": [
		        {
		          "__type": "Pointer",
		          "className": "_User",
		          "objectId": req.body.users
		        }
		      ]
		    }
		};

		console.log('role = ' + req.body.objectid);

	 	var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.masterKey = MASTER_KEY; // required to create a role
		kaiseki.sessionToken = req.session.currentUserSessionToken;
		if (req.session.userObjectId == ADMIN_ID) { // use the configured admin
			kaiseki.updateRole( req.body.objectid, data, function(err, response, body, success) {

				if (success) {
			  		console.log(data);
			  		console.log('role updated at = ', body.updatedAt);
			  		res.redirect('/roles');	
				}
				else {
					console.log(err);
				}
			  
			});
		}
	 });


	/*
	 * GET get all users
	 */
	app.get('/users', function(req, res) {
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		if (req.session.currentUserSessionToken != null || req.session.currentUserSessionToken != undefined) {
			kaiseki.sessionToken = req.session.currentUserSessionToken;
			if (req.session.userObjectId == ADMIN_ID) { // use the configured admin

				//get all users
				allUsers().then( function(resp) {

					console.log(resp);

					res.render('users.html', { 
						layout: false, 
						'loggedin': 'true', 
						'admin': (req.session.userObjectId == ADMIN_ID), 
						'username': req.session.username,
						'body': resp  });

				}, function(err){
					console.log(err);
				});
			}
			else {
				res.send(nonAdminErrorMessage);
			}
		}
		else {
			res.send(notLoggedInErrorMessage);
		}
	});


	// server routes ===========================================================

	// test call
	app.get('/api/getmonster', function(req, res) {
		// instantiate kaiseki
		var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
		kaiseki.getObjects('Monster', function(err, response, body, success) {
	  		console.log('monster = ', body);
	  		res.send(body);
		});
		
		//res.sendfile('./public/login.html');
	});


	// route to handle all angular requests - not needed for hybrid app routing
	// app.get('*', function(req, res) {
	// 	res.sendfile('./public/index.html');
	// });

};
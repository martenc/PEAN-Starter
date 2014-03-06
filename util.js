
var Kaiseki = require('kaiseki');
var path = require('path');
var parsecred = require('./config/parse');
var APP_ID = parsecred.app_id;
var REST_API_KEY = parsecred.rest_api_key;


// check if user is logged in
function getCurrentUserWrapper() {
	// instantiate kaiseki
	var kaiseki = new Kaiseki(APP_ID, REST_API_KEY);
	kaiseki.sessionToken = 'ef531109wz7sb67amtje31swy';
	kaiseki.getCurrentUser(function(err, result, body, success) {
		// if (success) {
			console.log('Session token is valid for user ', body.username);
		// 	user = body.username;
		// }
		// else {
		// 	user = 'false';
		// }
		return this.body;
	});
}



// expose these suckers
module.exports = {
	getCurrentUser : getCurrentUserWrapper()
}
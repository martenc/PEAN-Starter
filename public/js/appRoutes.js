angular.module('appRoutes', ['ngRoute', 'ui.router']).config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {

$locationProvider.html5Mode(false);

	// For any unmatched url, redirect to /state1
	$urlRouterProvider.otherwise("/");

	$stateProvider
		.state('home', {
			url: '/',
			templateUrl: 'views/home.html',
			controller: 'MainController'
		})

		.state('about', {
			url: '/about',
			templateUrl: 'views/about.html',
			controller: 'AboutController'
		})

		.state('contact', {
			url: '/contact',
			templateUrl: 'views/contact.html',
			controller: 'ContactController'	
		})
}]);
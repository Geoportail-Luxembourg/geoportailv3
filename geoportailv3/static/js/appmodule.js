/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
goog.provide('app');

goog.require('goog.dom.classlist');
goog.require('ngeo');
goog.require('ngeo.statemanager.module');
goog.require('ngeo.search.module');
goog.require('ol.has');


/**
 * @type {!angular.Module}
 */
app.module = angular.module('app', [ngeo.module.name, 'gettext', ngeo.search.module.name])
    .run(function() {
      if (!ol.has.TOUCH) {
        goog.dom.classlist.add(document.body, 'no-touch');
      }
    });


// Use ngeo's mockLocationProvider to work around a problem in Angular
// and avoid problems when using both ngeoLocation and ng-include in
// the application.
app.module.config(ngeo.statemanager.Location.MockProvider);


// activate pre-assigning bindings
// See https://toddmotto.com/angular-1-6-is-here#component-and-oninit
app.module.config(['$compileProvider', function($compileProvider) {
  $compileProvider.preAssignBindingsEnabled(true);
}]);


// Strict Contextual Escaping (SCE) configuration
app.module.config(['$sceDelegateProvider', function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    // trust data from shop.geoportail.lu
    'http*://shop.geoportail.lu/Portail/inspire/webservices/**'
  ]);
}]);


/**
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 */
app.sanitizeFilename = function(name) {
  name = name.replace(/\s+/g, '_'); // Replace white space with _.
  return name.replace(/[^a-z0-9\-\_]/gi, ''); // Strip any special character.
};

app.module.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push('noCacheInterceptor');
}]).factory('noCacheInterceptor', function() {
  return {
    request: function(config) {
      if (config.method == 'GET' && config.url.indexOf('.html') === -1) {
        var separator = config.url.indexOf('?') === -1 ? '?' : '&';
        config.url = config.url + separator + 'noCache=' + new Date().getTime();
      }
      return config;
    }};
});

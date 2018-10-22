/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
goog.provide('app.module');

goog.require('ol.has');
goog.require('ngeo');
goog.require('ngeo.datasource.module');
goog.require('ngeo.download.module');
goog.require('ngeo.draw.module');
goog.require('ngeo.editing.module');
goog.require('ngeo.filter.module');
goog.require('ngeo.googlestreetview.module');
goog.require('ngeo.grid.module');
goog.require('ngeo.layertree.module');
goog.require('ngeo.map.module');
goog.require('ngeo.map.extraModule');
goog.require('ngeo.misc.extraModule');
goog.require('ngeo.measure.module');
goog.require('ngeo.message.extraModule');
goog.require('app.offline.Configuration');
goog.require('ngeo.offline.module');
goog.require('ngeo.olcs.olcsModule');
goog.require('ngeo.print.module');
goog.require('ngeo.profile.module');
goog.require('ngeo.query.module');
goog.require('ngeo.search.module');
goog.require('ngeo.statemanager.Location');
goog.require('ngeo.statemanager.module');
goog.require('ngeo.statemanager.WfsPermalink');


/**
 * @type {!angular.Module}
 */
app.module = angular.module('app', [
  ngeo.datasource.module.name,
  ngeo.download.module.name,
  ngeo.draw.module.name,
  ngeo.editing.module.name,
  ngeo.filter.module.name,
  ngeo.googlestreetview.module.name,
  ngeo.grid.module.name,
  ngeo.layertree.module.name,
  ngeo.map.extraModule.name,
  ngeo.map.module.name,
  ngeo.misc.extraModule.name,
  ngeo.message.extraModule.name,
  ngeo.measure.module.name,
  ngeo.olcs.olcsModule.name,
  ngeo.offline.module.name,
  ngeo.print.module.name,
  ngeo.profile.module.name,
  ngeo.query.module.name,
  ngeo.search.module.name,
  ngeo.statemanager.module.name,
  ngeo.statemanager.WfsPermalink.module.name,
  'gettext']).run(function() {
    if (!ol.has.TOUCH) {
      document.body.classList.add('no-touch');
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

// Define the offline download configuration service
app.module.service('ngeoOfflineConfiguration', app.offline.Configuration);

app.module.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push('noCacheInterceptor');
}]).factory('noCacheInterceptor', function() {
  return {
    request: function(config) {
      if (config.method == 'GET' &&
          config.url.indexOf('geoportailv3.json') === -1 && // static files already have cache control
          config.url.indexOf('.html') === -1) {
        var separator = config.url.indexOf('?') === -1 ? '?' : '&';
        config.url = config.url + separator + 'noCache=' + new Date().getTime();
      }
      return config;
    }};
});


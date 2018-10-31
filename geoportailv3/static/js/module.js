/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
goog.module('app.module');

goog.module.declareLegacyNamespace();
const olHas = goog.require('ol.has');
const ngeoBase = goog.require('ngeo');
const ngeoDatasourceModule = goog.require('ngeo.datasource.module');
const ngeoDownloadModule = goog.require('ngeo.download.module');
const ngeoDrawModule = goog.require('ngeo.draw.module');
const ngeoEditingModule = goog.require('ngeo.editing.module');
const ngeoFilterModule = goog.require('ngeo.filter.module');
const ngeoGooglestreetviewModule = goog.require('ngeo.googlestreetview.module');
const ngeoGridModule = goog.require('ngeo.grid.module');
const ngeoLayertreeModule = goog.require('ngeo.layertree.module');
const ngeoMapModule = goog.require('ngeo.map.module');
const ngeoMapExtraModule = goog.require('ngeo.map.extraModule');
const ngeoMiscExtraModule = goog.require('ngeo.misc.extraModule');
const ngeoMeasureModule = goog.require('ngeo.measure.module');
const ngeoMessageExtraModule = goog.require('ngeo.message.extraModule');
const appOfflineConfiguration = goog.require('app.offline.Configuration');
const ngeoOfflineModule = goog.require('ngeo.offline.module');
const ngeoOlcsOlcsModule = goog.require('ngeo.olcs.olcsModule');
const ngeoPrintModule = goog.require('ngeo.print.module');
const ngeoProfileModule = goog.require('ngeo.profile.module');
const ngeoQueryModule = goog.require('ngeo.query.module');
const ngeoSearchModule = goog.require('ngeo.search.module');
const ngeoStatemanagerLocation = goog.require('ngeo.statemanager.Location');
const ngeoStatemanagerModule = goog.require('ngeo.statemanager.module');
const ngeoStatemanagerWfsPermalink = goog.require('ngeo.statemanager.WfsPermalink');


/**
 * @type {!angular.Module}
 */
exports = angular.module('app', [
  ngeoDatasourceModule.name,
  ngeoDownloadModule.name,
  ngeoDrawModule.name,
  ngeoEditingModule.name,
  ngeoFilterModule.name,
  ngeoGooglestreetviewModule.name,
  ngeoGridModule.name,
  ngeoLayertreeModule.name,
  ngeoMapExtraModule.name,
  ngeoMapModule.name,
  ngeoMiscExtraModule.name,
  ngeoMessageExtraModule.name,
  ngeoMeasureModule.name,
  ngeoOlcsOlcsModule.name,
  ngeoOfflineModule.name,
  ngeoPrintModule.name,
  ngeoProfileModule.name,
  ngeoQueryModule.name,
  ngeoSearchModule.name,
  ngeoStatemanagerModule.name,
  ngeoStatemanagerWfsPermalink.module.name,
  'gettext']).run(function() {
    if (!olHas.TOUCH) {
      document.body.classList.add('no-touch');
    }
  });

// Use ngeo's mockLocationProvider to work around a problem in Angular
// and avoid problems when using both ngeoLocation and ng-include in
// the application.
exports.config(ngeoStatemanagerLocation.MockProvider);


// activate pre-assigning bindings
// See https://toddmotto.com/angular-1-6-is-here#component-and-oninit
exports.config(['$compileProvider', function($compileProvider) {
  $compileProvider.preAssignBindingsEnabled(true);
}]);


// Strict Contextual Escaping (SCE) configuration
exports.config(['$sceDelegateProvider', function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    // trust data from shop.geoportail.lu
    'http*://shop.geoportail.lu/Portail/inspire/webservices/**'
  ]);
}]);

// Define the offline download configuration service
exports.service('ngeoOfflineConfiguration', appOfflineConfiguration);

exports.config(['$httpProvider', function($httpProvider) {
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


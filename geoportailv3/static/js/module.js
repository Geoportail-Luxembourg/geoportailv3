/**
 * @module app.module
 */
/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */

import olHas from 'ol/has.js';
import ngeoBase from 'ngeo.js';
import ngeoDatasourceModule from 'ngeo/datasource/module.js';
import ngeoDownloadModule from 'ngeo/download/module.js';
import ngeoDrawModule from 'ngeo/draw/module.js';
import ngeoEditingModule from 'ngeo/editing/module.js';
import ngeoFilterModule from 'ngeo/filter/module.js';
import ngeoGooglestreetviewModule from 'ngeo/googlestreetview/module.js';
import ngeoGridModule from 'ngeo/grid/module.js';
import ngeoLayertreeModule from 'ngeo/layertree/module.js';
import ngeoMapModule from 'ngeo/map/module.js';
import ngeoMapExtraModule from 'ngeo/map/extraModule.js';
import ngeoMiscExtraModule from 'ngeo/misc/extraModule.js';
import ngeoMeasureModule from 'ngeo/measure/module.js';
import ngeoMessageExtraModule from 'ngeo/message/extraModule.js';
import appOfflineConfiguration from './offline/Configuration.js';
import ngeoOfflineModule from 'ngeo/offline/module.js';
import ngeoOlcsOlcsModule from 'ngeo/olcs/olcsModule.js';
import ngeoPrintModule from 'ngeo/print/module.js';
import ngeoProfileModule from 'ngeo/profile/module.js';
import ngeoQueryModule from 'ngeo/query/module.js';
import ngeoSearchModule from 'ngeo/search/module.js';
import ngeoStatemanagerLocation from 'ngeo/statemanager/Location.js';
import ngeoStatemanagerModule from 'ngeo/statemanager/module.js';
import ngeoStatemanagerWfsPermalink from 'ngeo/statemanager/WfsPermalink.js';

/**
 * @type {!angular.Module}
 */
const exports = angular.module('app', [
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


export default exports;

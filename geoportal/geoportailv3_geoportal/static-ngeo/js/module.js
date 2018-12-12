/**
 * @module app.module
 */
/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */

import {TOUCH} from 'ol/has.js';

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

const fakeGmfAbstractAppControllerModule = angular.module('GmfAbstractAppControllerModule', []);

/**
 * @type {!angular.Module}
 */
const exports = angular.module('Appmain', [
  fakeGmfAbstractAppControllerModule.name,
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
    if (!TOUCH) {
      document.body.classList.add('no-touch');
    }
  });

// Use ngeo's mockLocationProvider to work around a problem in Angular
// and avoid problems when using both ngeoLocation and ng-include in
// the application.
exports.config(ngeoStatemanagerLocation.MockProvider);


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
          config.url.indexOf('templatecache/') !== 0 && // template cache URLs should not be tempered (see below)
          config.url.indexOf('.html') === -1) {
        var separator = config.url.indexOf('?') === -1 ? '?' : '&';
        config.url = config.url + separator + 'noCache=' + new Date().getTime();
      }
      return config;
    }};
});


exports.constant('ngeoLayertreeTemplateUrl', 'templatecache/ngeoLayertreeTemplateUrl');
exports.constant('ngeoPopupTemplateUrl', 'templatecache/ngeoPopupTemplateUrl');
exports.constant('ngeoScaleselectorTemplateUrl', 'templatecache/ngeoScaleselectorTemplateUrl');
exports.constant('ngeoOfflineTestUrl', 'templatecache/ngeoOfflineTestUrl');
exports.constant('ngeoOfflineTemplateUrl', 'templatecache/ngeoOfflineTemplateUrl');
exports.constant('ngeoOlcsControls3dTemplateUrl', 'templatecache/ngeoOlcsControls3dTemplateUrl');
exports.constant('appBackgroundlayerTemplateUrl', 'templatecache/appBackgroundlayerTemplateUrl');
exports.constant('appLayermanagerTemplateUrl', 'templatecache/appLayermanagerTemplateUrl');
exports.constant('appLayerlegendsTemplateUrl', 'templatecache/appLayerlegendsTemplateUrl');
exports.constant('appStreetviewTemplateUrl', 'templatecache/appStreetviewTemplateUrl');
exports.constant('appSliderTemplateUrl', 'templatecache/appSliderTemplateUrl');
exports.constant('appMeasureTemplateUrl', 'templatecache/appMeasureTemplateUrl');
exports.constant('appDrawTemplateUrl', 'templatecache/appDrawTemplateUrl');
exports.constant('appFeaturePopupTemplateUrl', 'templatecache/appFeaturePopupTemplateUrl');
exports.constant('appStyleEditingTemplateUrl', 'templatecache/appStyleEditingTemplateUrl');
exports.constant('appSymbolSelectorTemplateUrl', 'templatecache/appSymbolSelectorTemplateUrl');
exports.constant('appLayerinfoTemplateUrl', 'templatecache/appLayerinfoTemplateUrl');
exports.constant('appAuthenticationTemplateUrl', 'templatecache/appAuthenticationTemplateUrl');
exports.constant('appInfobarTemplateUrl', 'templatecache/appInfobarTemplateUrl');
exports.constant('appProjectionselectorTemplateUrl', 'templatecache/appProjectionselectorTemplateUrl');
exports.constant('appMapTemplateUrl', 'templatecache/appMapTemplateUrl');
exports.constant('appThemeswitcherTemplateUrl', 'templatecache/appThemeswitcherTemplateUrl');
exports.constant('appProfileTemplateUrl', 'templatecache/appProfileTemplateUrl');
exports.constant('appPrintTemplateUrl', 'templatecache/appPrintTemplateUrl');
exports.constant('appSearchTemplateUrl', 'templatecache/appSearchTemplateUrl');
exports.constant('appShareTemplateUrl', 'templatecache/appShareTemplateUrl');
exports.constant('appShorturlTemplateUrl', 'templatecache/appShorturlTemplateUrl');
exports.constant('appQueryTemplateUrl', 'templatecache/appQueryTemplateUrl');
exports.constant('appLocationinfoTemplateUrl', 'templatecache/appLocationinfoTemplateUrl');
exports.constant('appMymapsTemplateUrl', 'templatecache/appMymapsTemplateUrl');
exports.constant('appRoutingTemplateUrl', 'templatecache/appRoutingTemplateUrl');
exports.constant('appPagreportTemplateUrl', 'templatecache/appPagreportTemplateUrl');
exports.constant('appCasiporeportTemplateUrl', 'templatecache/appCasiporeportTemplateUrl');
exports.constant('appPdsreportTemplateUrl', 'templatecache/appPdsreportTemplateUrl');
exports.constant('appExternalDataTemplateUrl', 'templatecache/appExternalDataTemplateUrl');
exports.constant('appWmsTreeTemplateUrl', 'templatecache/appWmsTreeTemplateUrl');
exports.constant('appWmtsTreeTemplateUrl', 'templatecache/appWmtsTreeTemplateUrl');
exports.constant('appFeedbackTemplateUrl', 'templatecache/appFeedbackTemplateUrl');
exports.constant('appAskredirectTemplateUrl', 'templatecache/appAskredirectTemplateUrl');

/**
 * @ngInject
 * @param {any} $templateCache The template cache
 */
function templateRunner($templateCache) {
  $templateCache.put('templatecache/ngeoLayertreeTemplateUrl', require('./catalog/layertree.html'));
  $templateCache.put('templatecache/ngeoPopupTemplateUrl', require('./layerinfo/popup.html'));
  $templateCache.put('templatecache/ngeoScaleselectorTemplateUrl', require('./infobar/scaleselector.html'));
  $templateCache.put('templatecache/ngeoOfflineTestUrl', 'infobar/scaleselector.html'); // This one is special, it is polled and must not be part of the bundle
  $templateCache.put('templatecache/ngeoOfflineTemplateUrl', require('./offlineNgeoComponent.html')); //  # FIXME was a function
  $templateCache.put('templatecache/ngeoOlcsControls3dTemplateUrl', require('./olcs/controls3d.html'));
  $templateCache.put('templatecache/appBackgroundlayerTemplateUrl', require('./backgroundlayer/backgroundlayer.html'));
  $templateCache.put('templatecache/appLayermanagerTemplateUrl', require('./layermanager/layermanager.html'));
  $templateCache.put('templatecache/appLayerlegendsTemplateUrl', require('./layerlegends/layerlegends.html'));
  $templateCache.put('templatecache/appStreetviewTemplateUrl', require('./streetview/streetview.html'));
  $templateCache.put('templatecache/appSliderTemplateUrl', require('./slider/slider.html'));
  $templateCache.put('templatecache/appMeasureTemplateUrl', require('./measure/measure.html'));
  $templateCache.put('templatecache/appDrawTemplateUrl', require('./draw/draw.html'));
  $templateCache.put('templatecache/appFeaturePopupTemplateUrl', require('./draw/featurepopup.html'));
  $templateCache.put('templatecache/appStyleEditingTemplateUrl', require('./draw/styleediting.html'));
  $templateCache.put('templatecache/appSymbolSelectorTemplateUrl', require('./draw/symbolselector.html'));
  $templateCache.put('templatecache/appLayerinfoTemplateUrl', require('./layerinfo/layerinfo.html'));
  $templateCache.put('templatecache/appAuthenticationTemplateUrl', require('./authentication/authentication.html'));
  $templateCache.put('templatecache/appInfobarTemplateUrl', require('./infobar/infobar.html'));
  $templateCache.put('templatecache/appProjectionselectorTemplateUrl', require('./infobar/projectionselector.html'));
  $templateCache.put('templatecache/appMapTemplateUrl', require('./map/map.html'));
  $templateCache.put('templatecache/appThemeswitcherTemplateUrl', require('./themeswitcher/themes.html'));
  $templateCache.put('templatecache/appProfileTemplateUrl', require('./profile/profile.html'));
  $templateCache.put('templatecache/appPrintTemplateUrl', require('./print/print.html'));
  $templateCache.put('templatecache/appSearchTemplateUrl', require('./search/search.html'));
  $templateCache.put('templatecache/appShareTemplateUrl', require('./share/share.html'));
  $templateCache.put('templatecache/appShorturlTemplateUrl', require('./share/shorturl.html'));
  $templateCache.put('templatecache/appQueryTemplateUrl', require('./query/info.html'));
  $templateCache.put('templatecache/appLocationinfoTemplateUrl', require('./locationinfo/locationinfo.html'));
  $templateCache.put('templatecache/appMymapsTemplateUrl', require('./mymaps/mymaps.html'));
  $templateCache.put('templatecache/appRoutingTemplateUrl', require('./routing/routing.html'));
  $templateCache.put('templatecache/appPagreportTemplateUrl', require('./query/pagreport.html'));
  $templateCache.put('templatecache/appCasiporeportTemplateUrl', require('./query/casiporeport.html'));
  $templateCache.put('templatecache/appPdsreportTemplateUrl', require('./query/pdsreport.html'));
  $templateCache.put('templatecache/appExternalDataTemplateUrl', require('./externaldata/externaldata.html'));
  $templateCache.put('templatecache/appWmsTreeTemplateUrl', require('./externaldata/wmstree.html'));
  $templateCache.put('templatecache/appWmtsTreeTemplateUrl', require('./externaldata/wmtstree.html'));
  $templateCache.put('templatecache/appFeedbackTemplateUrl', require('./feedback/feedback.html'));
  $templateCache.put('templatecache/appAskredirectTemplateUrl', require('./askredirect/askredirect.html'));
}

// activate pre-assigning bindings
// See https://toddmotto.com/angular-1-6-is-here#component-and-oninit
exports.config(['$compileProvider', function($compileProvider) {
  $compileProvider.preAssignBindingsEnabled(true);
}]);

exports.run(templateRunner);

export default exports;

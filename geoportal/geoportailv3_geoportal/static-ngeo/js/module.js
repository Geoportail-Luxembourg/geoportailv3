/**
 * @module app.module
 */
/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */

import {TOUCH} from 'ol/has.js';

 /* eslint-disable no-unused-vars */
 import appAskredirectAskredirectDirective from './askredirect/askredirectDirective.js';
 import appAskredirectAskredirectController from './askredirect/AskredirectController.js';
 import appAuthenticationAuthenticationDirective from './authentication/authenticationDirective.js';
 import appAuthenticationAuthenticationController from './authentication/AuthenticationController.js';
 import appBackgroundlayerBackgroundlayerDirective from './backgroundlayer/backgroundlayerDirective.js';
 import appBackgroundlayerBackgroundlayerController from './backgroundlayer/BackgroundlayerController.js';
 import appBackgroundlayerBlankLayer from './backgroundlayer/BlankLayer.js';
 import appCatalogCatalogController from './catalog/CatalogController.js';
 import appCatalogCatalogDirective from './catalog/catalogDirective.js';
 import appDrawDrawDirective from './draw/drawDirective.js';
 import appDrawDrawController from './draw/DrawController.js';
 import appDrawDrawnFeatures from './draw/DrawnFeatures.js';
 import appDrawFeatureHash from './draw/FeatureHash.js';
 import appDrawFeaturePopup from './draw/FeaturePopup.js';
 import appDrawFeaturePopupController from './draw/FeaturePopupController.js';
 import appDrawFeaturePopupDirective from './draw/featurePopupDirective.js';
 import appDrawRouteControl from './draw/RouteControl.js';

 //const appDrawRouteControlOptions = goog.require('app.draw.RouteControlOptions');
 import appDrawSelectedFeatures from './draw/SelectedFeaturesService.js';

 import appDrawStyleEditingController from './draw/StyleEditingController.js';
 import appDrawStyleEditingDirective from './draw/styleEditingDirective.js';
 import appDrawSymbolSelectorController from './draw/SymbolSelectorController.js';
 import appDrawSymbolSelectorDirective from './draw/symbolSelectorDirective.js';
 import appExclusionManager from './ExclusionManager.js';
 import appExternaldataExternalDataDirective from './externaldata/externalDataDirective.js';
 import appExternaldataExternalDataController from './externaldata/ExternalDataController.js';
 import appFeedbackFeedbackDirective from './feedback/feedbackDirective.js';
 import appFeedbackFeedbackController from './feedback/FeedbackController.js';
 import appInfobarElevationDirective from './infobar/elevationDirective.js';
 import appInfobarElevationController from './infobar/ElevationController.js';
 import appInfobarInfobarController from './infobar/InfobarController.js';
 import appInfobarInfobarDirective from './infobar/infobarDirective.js';
 import appInfobarProjectionselectorDirective from './infobar/projectionselectorDirective.js';
 import appInfobarProjectionselectorController from './infobar/ProjectionselectorController.js';
 import appInfobarScalelineDirective from './infobar/scalelineDirective.js';
 import appInfobarScalelineController from './infobar/ScalelineController.js';
 import appInfobarScaleselectorDirective from './infobar/scaleselectorDirective.js';
 import appInfobarScaleselectorController from './infobar/ScaleselectorController.js';
 import appLayerinfoLayerinfoDirective from './layerinfo/layerinfoDirective.js';
 import appLayerinfoLayerinfoController from './layerinfo/LayerinfoController.js';
 import appLocationinfoLocationInfoOverlay from './locationinfo/LocationInfoOverlay.js';
 import appLayerinfoShowLayerinfo from './layerinfo/ShowLayerinfoFactory.js';
 import appLayermanagerLayermanagerDirective from './layermanager/layermanagerDirective.js';
 import appLayermanagerLayermanagerController from './layermanager/LayermanagerController.js';
 import appLayerlegendsLayerlegendsDirective from './layerlegends/layerlegendsDirective.js';
 import appLayerlegendsLayerlegendsController from './layerlegends/LayerlegendsController.js';
 import appLocationinfoLocationinfoDirective from './locationinfo/locationinfoDirective.js';
 import appLocationinfoLocationinfoController from './locationinfo/LocationinfoController.js';
 import appMapMapDirective from './map/mapDirective.js';
 import appMapMapController from './map/MapController.js';
 import appMainController from './apps/Controllermain.js';
 import appMymapsFilereaderDirective from './mymaps/filereaderDirective.js';
 import appMeasureMeasureController from './measure/MeasureController.js';
 import appMeasureMeasureDirective from './measure/MeasureDirective.js';
 import appMymapsMymapsDirective from './mymaps/mymapsDirective.js';
 import appMymapsMymapsController from './mymaps/MymapsController.js';
 import appNotify from './NotifyFactory.js';
 import appPrintPrintDirective from './print/printDirective.js';
 import appPrintPrintController from './print/PrintController.js';
 import appPrintPrintservice from './print/Printservice.js';
 import appProfileProfileDirective from './profile/profileDirective.js';
 import appProfileProfileController from './profile/ProfileController.js';
 import appQueryPagreportDirective from './query/pagreportDirective.js';
 import appQueryPagreportController from './query/PagreportController.js';
 import appQueryCasiporeportDirective from './query/casiporeportDirective.js';
 import appQueryCasiporeportController from './query/CasiporeportController.js';
 import appQueryPdsreportDirective from './query/pdsreportDirective.js';
 import appQueryPdsreportController from './query/PdsreportController.js';

 //const appQueryQueryStyles = goog.require('app.query.QueryStyles');
 import appQueryQueryDirective from './query/queryDirective.js';

 import appQueryQueryController from './query/QueryController.js';
 import appResizemapDirective from './resizemapDirective.js';
 import appRoutingRoutingController from './routing/RoutingController.js';
 import appRoutingRoutingDirective from './routing/routingDirective.js';
 import appSearchSearchDirective from './search/searchDirective.js';
 import appSearchSearchController from './search/SearchController.js';
 import appShareShareDirective from './share/ShareDirective.js';
 import appShareShareController from './share/ShareController.js';
 import appShareShorturlDirective from './share/shorturlDirective.js';
 import appShareShorturlController from './share/ShorturlController.js';
 import appSliderSliderDirective from './slider/SliderDirective.js';
 import appSliderSliderController from './slider/SliderController.js';
 import appStreetviewStreetviewDirective from './streetview/streetviewDirective.js';
 import appStreetviewStreetviewController from './streetview/StreetviewController.js';
 import appThemeswitcherThemeswitcherDirective from './themeswitcher/themeswitcherDirective.js';
 import appThemeswitcherThemeswitcherController from './themeswitcher/ThemeswitcherController.js';
 import appActivetool from './Activetool.js';
 import appCoordinateString from './CoordinateStringService.js';
 import appExport from './Export.js';
 import appGeocoding from './Geocoding.js';
 import appGetDevice from './GetDevice.js';
 import appGetElevation from './GetElevationService.js';
 import appGetLayerForCatalogNode from './GetLayerForCatalogNodeFactory.js';
 import appGetProfile from './GetProfileService.js';
 import appGetShorturl from './GetShorturlService.js';
 import appGetWmsLayer from './GetWmsLayerFactory.js';
 import appGetWmtsLayer from './GetWmtsLayerFactory.js';
 import appLayerOpacityManager from './LayerOpacityManager.js';
 import appLayerPermalinkManager from './LayerPermalinkManager.js';
 import appLocationControl from './LocationControl.js';

 // const appLocationControlOptions = goog.require('app.LocationControlOptions');
 import appMap from './Map.js';

 //const appMapsResponse = goog.require('app.MapsResponse');
 import appMymaps from './Mymaps.js';

 import appMymapsOffline from './MymapsOffline.js';
 import appOlcsToggle3d from './olcs/toggle3d.js';
 import appOlcsLux3DManager from './olcs/Lux3DManager.js';
 import appOlcsExtent from './olcs/Extent.js';
 import appOlcsZoomToExtent from './olcs/ZoomToExtent.js';
 import appProjections from './projections.js';
 import appRouting from './Routing.js';
 import appScalesService from './ScalesService.js';
 import appStateManager from './StateManager.js';
 import appTheme from './Theme.js';
 import appThemes from './Themes.js';

 //const appThemesResponse = goog.require('app.ThemesResponse');
 import appUserManager from './UserManager.js';

 import appWmsHelper from './WmsHelper.js';
 import appWmtsHelper from './WmtsHelper.js';
 import appMiscFile from './misc/file.js';

 /* eslint-enable no-unused-vars */

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
          config.url.indexOf('.html') === -1) {
        var separator = config.url.indexOf('?') === -1 ? '?' : '&';
        config.url = config.url + separator + 'noCache=' + new Date().getTime();
      }
      return config;
    }};
});


export default exports;

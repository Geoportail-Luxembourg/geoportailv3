/**
 * @module app.apps.MainController
 */
/**
 * @fileoverview This file defines the controller class for the application's
 * main controller (created using "ng-controller" in the page).
 *
 * In particular, this controller creates the OpenLayers map, and makes it
 * available in the controller for use from other parts (directives) of the
 * application. It also defines the behavior of elements of the HTML page (the
 * management of the sidebar for example).
 */

import 'core-js';
import 'jquery';
import 'bootstrap';
import 'angular';
import 'angular-gettext';
import 'angular-dynamic-locale';

import useLuxLib, {
  createApp,
  h,
  backend,
  App,
  defineCustomElement,
  getCurrentInstance,
  i18next as Luxi18next,
  storeToRefs,
  watch,
  AlertNotifications,
  LayerPanel,
  MapContainer,
  BackgroundSelector,
  StyleSelector,
  LayerMetadata,
  RemoteLayers,
  HeaderBar,
  proxyUrlHelper,
  styleUrlHelper,
  useMap,
  useMvtStyles,
  useOpenLayers,
  useAppStore,
  useMapStore,
  useOfflineLayers,
  useStyleStore,
  useThemeStore,
  statePersistorAppService,
  statePersistorBgLayerService,
  statePersistorLayersService,
  statePersistorThemeService,
  statePersistorMyMapService,
  statePersistorStyleService,
  themeSelectorService,
  SliderComparator,
  backend as Luxi18backend,
  I18NextVue,
  createPinia,
  VueDOMPurifyHTML
} from "luxembourg-geoportail/bundle/lux.dist.js";

const i18nextConfig = {
  ns: 'client',
  nonExplicitWhitelist: true,
  returnEmptyString: false,
  fallbackLng: 'en',
  debug: false,
  backend: {
    loadPath: async (lng, ns) => {
      if (ns === 'app') {
        return '/static-ngeo/locales/{{app}}.{{lng}}.json'
      }

      const response = await fetch("/dynamic.json");
      const dynamicUrls = await response.json();

      return dynamicUrls.constants.langUrls[lng]
    },
    parse: function(data, lng, ns) {
      return JSON.parse(data)[lng]
    }
  },
  nsSeparator: '|', // ! force separator to '|' instead of ':' because some i18n keys have ':' (otherwise, i18next doesn't find the key)
};

const luxLib = useLuxLib({ i18nextConfig });
const { app, createElementInstance } =  luxLib;

// Important! keep order
statePersistorMyMapService.bootstrap()
statePersistorLayersService.bootstrap()
statePersistorThemeService.bootstrap()
statePersistorAppService.bootstrap()
// styles must not be bootstrapped here as one would like to do naively, but themes must be loaded first
// statePersistorStyleService.bootstrap()
statePersistorBgLayerService.bootstrap()

const luxAppStore = useAppStore()

// LayerPanel includes Catalog, ThemeSelector, LayerManager
// Note: Themes are now handled by new theme-selector
// MainController watches useThemeStore().theme via vue watch to affect changes necessary for the legacy code
const LayerPanelElement = createElementInstance(LayerPanel, app)
customElements.define('layer-panel', LayerPanelElement)

const MapContainerElement = createElementInstance(MapContainer, app)
customElements.define('map-container', MapContainerElement)

const BackgroundSelectorElement = createElementInstance(BackgroundSelector, app)
customElements.define('background-selector', BackgroundSelectorElement)

const StyleSelectorElement = createElementInstance(StyleSelector, app)
customElements.define('style-selector', StyleSelectorElement)

const LayerMetadataElement = createElementInstance(LayerMetadata, app)
customElements.define('layer-metadata', LayerMetadataElement)

const RemoteLayersElement = createElementInstance(RemoteLayers, app)
customElements.define('remote-layers', RemoteLayersElement)

const SliderComparatorElement = createElementInstance(SliderComparator, app)
customElements.define('slider-comparator', SliderComparatorElement)

const AlertNotificationsElement = createElementInstance(AlertNotifications, app)
customElements.define('alert-notifications', AlertNotificationsElement)

import i18next from 'i18next';

import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';

import appModule from '../module.js';
import appLocationControl from '../LocationControl.js';
import appMap from '../Map.js';
import olFeature from 'ol/Feature.js';
import olGeomPoint from 'ol/geom/Point.js';
import {defaults as interactionDefaults} from 'ol/interaction.js';
import LayerGroup from 'ol/layer/Group';
import olLayerVector from 'ol/layer/Vector.js';
import ngeoMiscSyncArrays from 'ngeo/misc/syncArrays.js';
import olView from 'ol/View.js';
import olControlAttribution from 'ol/control/Attribution.js';
import olControlFullScreen from 'ol/control/FullScreen.js';
import olControlOverviewMap from 'ol/control/OverviewMap.js';
import olControlZoom from 'ol/control/Zoom.js';
import appOlcsZoomToExtent from '../olcs/ZoomToExtent.js';
import appOlcsLux3DManager from '../olcs/Lux3DManager.js';
import {transform, transformExtent} from 'ol/proj.js';
import {toRadians} from 'ol/math.js';
import {listen} from 'ol/events.js';
import {isValidSerial} from '../utils.js';
import MaskLayer from 'ngeo/print/Mask.js';

import bootstrapApp from './bootstrap.js';

import '../../less/geoportailv3.less';

 /* eslint-disable no-unused-vars */
 import appAskredirectAskredirectDirective from '../askredirect/askredirectDirective.js';
 import appAskredirectAskredirectController from '../askredirect/AskredirectController.js';
 import appAuthenticationAuthenticationDirective from '../authentication/authenticationDirective.js';
 import appAuthenticationAuthenticationController from '../authentication/AuthenticationController.js';
 import appBackgroundlayerBlankLayer from '../backgroundlayer/BlankLayer.js';
 import appBackgroundselectorController from '../backgroundselector/BackgroundselectorController.js';
 import appBackgroundselectorDirective from '../backgroundselector/BackgroundselectorDirective.js';
 import appCatalogCatalogController from '../catalog/CatalogController.js';
 import appCatalogCatalogDirective from '../catalog/catalogDirective.js';
 import appDrawDrawDirective from '../draw/drawDirective.js';
 import appDrawDrawController from '../draw/DrawController.js';
 import appDrawDrawnFeatures from '../draw/DrawnFeatures.js';
 import appDrawFeatureHash from '../draw/FeatureHash.js';
 import appDrawFeaturePopup from '../draw/FeaturePopup.js';
 import appDrawFeaturePopupController from '../draw/FeaturePopupController.js';
 import appDrawFeaturePopupDirective from '../draw/featurePopupDirective.js';
 import appDrawRouteControl from '../draw/RouteControl.js';
 import appGetLayerForCatalogNodeFactory from '../GetLayerForCatalogNodeFactory.js';

 //const appDrawRouteControlOptions = goog.require('app.draw.RouteControlOptions');
 import appDrawSelectedFeatures from '../draw/SelectedFeaturesService.js';
 import AppImguploadController from '../imageupload/ImguploadController.js'
 import appImgupload from '../imageupload/ImguploadDirective.js'
 import appDrawStyleEditingController from '../draw/StyleEditingController.js';
 import appDrawStyleEditingDirective from '../draw/styleEditingDirective.js';
 import appDrawSymbolSelectorController from '../draw/SymbolSelectorController.js';
 import appDrawSymbolSelectorDirective from '../draw/symbolSelectorDirective.js';
 import appExclusionManager from '../ExclusionManager.js';
 import appExternaldataExternalDataDirective from '../externaldata/externalDataDirective.js';
 import appExternaldataExternalDataController from '../externaldata/ExternalDataController.js';
 import appFeedbackFeedbackDirective from '../feedback/feedbackDirective.js';
 import appFeedbackFeedbackController from '../feedback/FeedbackController.js';
 import appFeedbackanfFeedbackanfDirective from '../feedbackanf/feedbackanfDirective.js';
 import appFeedbackcruesFeedbackcruesDirective from '../feedbackcrues/feedbackcruesDirective.js';
 import appFeedbackageFeedbackcruesController from '../feedbackcrues/FeedbackcruesController.js';
 import appFeedbackageFeedbackageDirective from '../feedbackage/feedbackageDirective.js';
 import appFeedbackanfFeedbackanfController from '../feedbackanf/FeedbackanfController.js';
 import appFeedbackageFeedbackageController from '../feedbackage/FeedbackageController.js';
 import appInfobarElevationDirective from '../infobar/elevationDirective.js';
 import appInfobarElevationController from '../infobar/ElevationController.js';
 import appInfobarInfobarController from '../infobar/InfobarController.js';
 import appInfobarInfobarDirective from '../infobar/infobarDirective.js';
 import appInfobarProjectionselectorDirective from '../infobar/projectionselectorDirective.js';
 import appInfobarProjectionselectorController from '../infobar/ProjectionselectorController.js';
 import appInfobarScalelineDirective from '../infobar/scalelineDirective.js';
 import appInfobarScalelineController from '../infobar/ScalelineController.js';
 import appInfobarScaleselectorDirective from '../infobar/scaleselectorDirective.js';
 import appInfobarScaleselectorController from '../infobar/ScaleselectorController.js';
 import appLayerinfoLayerinfoDirective from '../layerinfo/layerinfoDirective.js';
 import appLayerinfoLayerinfoController from '../layerinfo/LayerinfoController.js';
 import appLocationinfoLocationInfoOverlay from '../locationinfo/LocationInfoOverlay.js';
 import appLayerinfoShowLayerinfo from '../layerinfo/ShowLayerinfoFactory.js';
 import appLayermanagerLayermanagerDirective from '../layermanager/layermanagerDirective.js';
 import appLayermanagerLayermanagerController from '../layermanager/LayermanagerController.js';
 import appLayerlegendsLayerlegendsDirective from '../layerlegends/layerlegendsDirective.js';
 import appLayerlegendsLayerlegendsController from '../layerlegends/LayerlegendsController.js';
 import appLocationinfoLocationinfoDirective from '../locationinfo/locationinfoDirective.js';
 import appLocationinfoLocationinfoController from '../locationinfo/LocationinfoController.js';
 import appLotChasse from '../LotChasse.js';
 import appMapMapDirective from '../map/mapDirective.js';
 import appMapMapController from '../map/MapController.js';
 import appMainController from './MainController.js';
 import appMymapsFilereaderDirective from '../mymaps/filereaderDirective.js';
 import appMeasureMeasureController from '../measure/MeasureController.js';
 import appMeasureMeasureDirective from '../measure/MeasureDirective.js';
 import appMymapsMymapsDirective from '../mymaps/mymapsDirective.js';
 import appMymapsMymapsController from '../mymaps/MymapsController.js';
 import appNotify from '../NotifyFactory.js';
 import appPrintPrintDirective from '../print/printDirective.js';
 import appPrintPrintController from '../print/PrintController.js';
 import appPrintPrintservice from '../print/Printservice.js';
 import appProfileProfileDirective from '../profile/profileDirective.js';
 import appProfileProfileController from '../profile/ProfileController.js';
 import appQueryPagreportDirective from '../query/pagreportDirective.js';
 import appQueryPagreportController from '../query/PagreportController.js';
 import appQueryCasiporeportDirective from '../query/casiporeportDirective.js';
 import appQueryCasiporeportController from '../query/CasiporeportController.js';
 import appQueryForagevirtuelreportDirective from '../query/foragevirtuelreportDirective.js';
 import appQueryForagevirtuelreportController from '../query/foragevirtuelreportController.js';
 import appQueryPdsreportDirective from '../query/pdsreportDirective.js';
 import appQueryPdsreportController from '../query/PdsreportController.js';
 import appOfflineBar from '../offline/offlinebar.js'

 //const appQueryQueryStyles = goog.require('app.query.QueryStyles');
 import appQueryQueryDirective from '../query/queryDirective.js';

 import appQueryQueryController from '../query/QueryController.js';
 import appResizemapDirective from '../resizemapDirective.js';
 import appRoutingRoutingController from '../routing/RoutingController.js';
 import appRoutingRoutingDirective from '../routing/routingDirective.js';
 import appSearchSearchDirective from '../search/searchDirective.js';
 import appSearchSearchController from '../search/SearchController.js';
 import appShareShareDirective from '../share/ShareDirective.js';
 import appShareShareController from '../share/ShareController.js';
 import appShareShorturlDirective from '../share/shorturlDirective.js';
 import appShareShorturlController from '../share/ShorturlController.js';
 import appStreetviewStreetviewDirective from '../streetview/streetviewDirective.js';
 import appStreetviewStreetviewController from '../streetview/StreetviewController.js';
 import appThemeswitcherThemeswitcherDirective from '../themeswitcher/themeswitcherDirective.js';
 import appThemeswitcherThemeswitcherController from '../themeswitcher/ThemeswitcherController.js';
 import appActivetool from '../Activetool.js';
 import appCoordinateString from '../CoordinateStringService.js';
 import appExport from '../Export.js';
 import appGeocoding from '../Geocoding.js';
 import appGetDevice from '../GetDevice.js';
 import appGetElevation from '../GetElevationService.js';
 import appGetProfile from '../GetProfileService.js';
 import appGetShorturl from '../GetShorturlService.js';
 import appGetWmsLayer from '../GetWmsLayerFactory.js';
 import appGetWmtsLayer from '../GetWmtsLayerFactory.js';
 import appLayerOpacityManager from '../LayerOpacityManager.js';
 import appLayerPermalinkManager from '../LayerPermalinkManager.js';

 // const appLocationControlOptions = goog.require('app.LocationControlOptions');
 //const appMapsResponse = goog.require('app.MapsResponse');
 import appMymaps from '../Mymaps.js';

 import appMymapsOffline from '../MymapsOffline.js';
 import appToggleOffline from '../offline/toggleOffline.js';
 import appOlcsToggle3d from '../olcs/toggle3d.js';
 import appOlcsExtent from '../olcs/Extent.js';
 import appProjections from '../projections.js';
 import appRouting from '../Routing.js';
 import appScalesService from '../ScalesService.js';
 import appStateManager from '../StateManager.js';
 import appTheme from '../Theme.js';
 import appThemes from '../Themes.js';
 import appMvtStylingService from '../mvtstyling/MvtStylingService.js';

 //const appThemesResponse = goog.require('app.ThemesResponse');
 import appUserManager from '../UserManager.js';

 import appWmsHelper from '../WmsHelper.js';
 import appWmtsHelper from '../WmtsHelper.js';
 import appMiscFile from '../misc/file.js';

 import OfflineDownloader from '../OfflineDownloader.js';
 import OfflineRestorer from '../OfflineRestorer.js';

 import '../mvtstyling/MediumStyleController.js';
 import '../mvtstyling/SimpleStyleController.js';
 /* eslint-enable no-unused-vars */

import '../lux-iframe-preview/lux-iframe-preview.ts';
import '../gmf-lidar-panel/gmf-lidar-panel.ts';
import '../lidar-plot/lidar-plot.ts';
import '../offline/lux-offline/lux-offline.component.ts';
import '../offline/lux-offline/lux-offline-alert.component.ts';
import '../offline/lux-offline/lux-offline-reload.component.ts';
import '../offline/lux-offline/lux-offline-error.component.ts';

import DragRotate from 'ol/interaction/DragRotate';
import {platformModifierKeyOnly} from 'ol/events/condition';
import Rotate from 'ol/control/Rotate';

// See intermediate_editor_spec.md
function getDefaultMediumStyling(label) {
  if (label === 'basemap_2015_global') return getDefaultMediumRoadmapStyling();
  if (label === 'topogr_global' || label === 'topo_bw_jpeg') return getDefaultMediumTopoStyling();
  return getDefaultMediumRoadmapStyling(); // Default value at init app loading
}

function getDefaultMediumRoadmapStyling() {
  const gettext = t => t;
  return [{
    label: gettext('Roads primary'),
    color: '#f7f7f7',
    lines: ['lu_road_trunk_primary', 'lu_bridge_major','lu_tunnel_major','lu_road_major_motorway'],
    visible: true
  },{
    label: gettext('Roads secondary'),
    color: '#f7f7f7',
    lines: ['lu_road_minor', 'lu_road_secondary_tertiary','lu_bridge_minor','lu_road_path','lu_bridge_path','lu_bridge_railway case','lu_bridge_path case'],
    visible: true
  },{
    label: gettext('Vegetation'),
    color: '#B8D293',
    opacity : '1',
    fills: ['lu_landcover_wood','lu_landcover_grass','lu_landuse_stadium','lu_landuse_cemetery'],
    visible: true
  },{
    label: gettext('Buildings'),
    color: '#D6AA85',
    opacity : '1',
    fillExtrusions: ['lu_building-3d_public','lu_building-3d'],
    fills: ['lu_building','lu_building_public'],
    lines: ["lu_bridge_railway","lu_railway","lu_tunnel_railway"],
    visible: true
  },{
    label: gettext('Water'),
    color: '#94c1e1',
    lines: ['lu_waterway','lu_waterway_tunnel','lu_waterway_intermittent'],
    fills: ['lu_water'],
    visible: true
  },{
    label: gettext('Background'),
    color: '#e7e7e7',
    backgrounds: ['background'],
    visible: true
  }, {
    label: gettext('Hillshade'),
    hillshades: ['hillshade'],
    visible: true
  }
];
}

function getDefaultMediumTopoStyling() {
  const gettext = t => t;
  return [{
    label: gettext('Primary Names'),
    symbols: ['lu_place-label_other','lu_place-label_city','lu_place-label_canton','lu_country-label-other','lu_country-label','place_label_other','place_label_city','country_label-other','country_label'],
    visible: true
  },{
    label: gettext('Secondary Names'),
    symbols: ['lu_place-label_isolated','lu_place-label_locality_forest','lu_place-label_locality_lieudit'],
    visible: true
  },{
    label: gettext('Transport'),
    lines: ['lu_tunnel_track-casing','lu_tunnel_major_motorway-casing','lu_tunnel_railway_transit','lu_tunnel_railway',
            'lu_tunnel_railway-hatching','lu_tunnel_path','lu_tunnel_track','lu_tunnel_minor','lu_tunnel_major_motorway',
            'lu_tunnel_secondary_tertiary','lu_tunnel_trunk_primary','lu_road_track-casing','lu_road_minor-casing',
            'lu_road_major_motorway-casing','lu_road_secondary_tertiary-casing','lu_road_trunk_primary-casing',
            'lu_road_pier','lu_road_path','lu_road_track','lu_road_minor','lu_road_major_motorway',
            'lu_road_secondary_tertiary','lu_road_trunk_primary','lu_tram','lu_tram-hatching','lu_railway_transit',
            'lu_railway','lu_railway-hatching','lu_bridge_railway-casing','lu_bridge_track-casing',
            'lu_bridge_path-casing','lu_bridge_minor-casing','lu_bridge_major_motorway-casing','lu_bridge_secondary_tertiary-casing',
            'lu_bridge_trunk_primary-casing','lu_bridge_railway','lu_bridge_path','lu_bridge_track','lu_bridge_minor',
            'lu_bridge_major_motorway','lu_bridge_secondary_tertiary','lu_bridge_trunk_primary','tunnel_track-casing',
            'tunnel_major_motorway-casing','tunnel_railway_transit','tunnel_railway_transit-hatching','tunnel_railway','tunnel_railway-hatching','tunnel_path',
            'tunnel_track','tunnel_minor','tunnel_major_motorway','tunnel_secondary_tertiary','tunnel_trunk_primary',
            'road_track-casing','road_minor-casing','road_major_motorway-casing','road_secondary_tertiary-casing',
            'road_trunk_primary-casing','road_pier','road_path','road_track','road_minor',
            'road_major_motorway','road_secondary_tertiary','road_trunk_primary','railway-transit',
            'railway-transit-hatching','railway','railway-hatching','bridge_railway-casing','bridge_path-casing',
            'bridge_track_casing','bridge_minor-casing','bridge_major_motorway-casing','bridge_secondary_tertiary-casing',
            'bridge_trunk_primary-casing','bridge_railway','bridge_path','bridge_track','bridge_minor','bridge_major_motorway',
            'bridge_secondary_tertiary','bridge_trunk_primary'],
    symbols: ['lu_road_major-label','lu_motorway-shield','lu_road-shield'],
    visible: true
  },{
    label: gettext('Vegetation'),
    fills: ['lu_landuse_stadium','lu_landuse_cemetery','lu_landuse_gras','lu_landuse_park','lu_landuse_park-outline','lu_landuse_vineyard','lu_landuse_orchard','lu_landuse_wood','landcover_grass','landcover_wood'],
    visible: true
  },{
    label: gettext('Electricity'),
    fills: ['lu_power_station','lu_power_pylone'],
    lines: ['lu_power_line','lu_power_station-outline'],
    symbols: ['lu_power_station-label','lu_eolienne'],
    visible: true
  },{
    label: gettext('Contours and Height Points'),
    lines: ['lu_contour-100','lu_contour-50','lu_contour-20','lu_contour-10','lu_contour'],
    symbols: ['lu_contour-label-100','lu_contour-label-20','lu_apex-label'],
    visible: true
  }, {
    label: gettext('Hillshade'),
    hillshades: ['lu_hillshade'],
    visible: true
  }
];
}

function getSimpleStylings() {
  const gettext = t => t;
  return [
// ['Roads primary','Roads secondary','Vegetation','Buildings','Water', 'Background']
// ['#bc1515', '#bcffdd','#bcffdd','#bc1133','#bc1133', '#f2f2f2'],
    {label: gettext('Light grey'), hillshade: false, colors: ['#ffffff', '#ffffff','#d6e0d7','#e1e1e1','#cccccc','#f2f2f2'], selected: false},
    {label: gettext('Dark grey'), hillshade: false, colors: ['#808080', '#808080','#494b4a','#505052','#232426','#454545'], selected: false},
    {label: gettext('Dark sand'), hillshade: false, colors: ['#9e9375', '#9e9375','#6b6249','#403928','#b8aa84','#1a1814'], selected: false},
    {label: gettext('Kids'), hillshade: false, colors: ['#f9c50d', '#ffffff','#839836','#d6d3ce','#2a5ba8','#eeeeee'], selected: false},
    {label: gettext('Light mauve'), hillshade: false, colors: ['#f3edf5', '#f3edf5','#9d7da8','#caa9d1','#613b5c','#e5d3e6'], selected: false},
    {label: gettext('Light Blue'), hillshade: false, colors: ['#dceaf5', '#dceaf5','#5598cf','#81b7e3','#3b576e','#b6cde0'], selected: false}
  ];
}

/**
 * @param {angular.Scope} $scope Scope.
 * @param {angular.Http} $http Http.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 * manager.
 * @param {ngeo.offline.ServiceManager} ngeoOfflineServiceManager offline service manager service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {app.ExclusionManager} appExclusionManager Exclusion manager service.
 * @param {app.LayerOpacityManager} appLayerOpacityManager Layer opacity.
 * @param {app.LayerPermalinkManager} appLayerPermalinkManager Permalink
 * service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.StateManager} appStateManager The state service.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.Theme} appTheme the current theme service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {Object.<string, string>} langUrls URLs to translation files.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {Array.<number>} defaultExtent Default geographical extent.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {app.Export} appExport The export GPX/KML service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {boolean} appOverviewMapShow Add or not the overview control.
 * @param {string} showCruesLink Enable the Crues link.
 * @param {boolean} showAnfLink Enable the ANF link.
 * @param {string} appOverviewMapBaseLayer The layer displayed in overview.
 * @param {app.Notify} appNotify Notify service.
 * @param {angular.$window} $window Window.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {angular.$locale} $locale The locale service.
 * @param {app.Routing} appRouting The routing service.
 * @param {Document} $document Document.
 * @param {string} cesiumURL The Cesium script URL.
 * @param {angular.Scope} $rootScope Angular root scope.
 * @param {ngeo.olcs.Service} ngeoOlcsService The service.
 * @param {Array<string>} tiles3dLayers 3D tiles layers.
 * @param {string} tiles3dUrl 3D tiles server url.
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo network status service.
 * @param {ngeo.offline.Mode} ngeoOfflineMode Offline mode manager.
 * @param {string} ageLayerIds ID of AGE layers.
 * @param {string} showAgeLink Enable the AGE link.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * catalog service.
 * @param {string} showCruesRoles Enable the Crues link only for these roles.
 * @param {string} ageCruesLayerIds ID of flashflood layers.
 * @param {app.MymapsOffline} appMymapsOffline Offline mymaps service.
 * @param {ngeo.download.service} ngeoDownload ngeo Download service.
 * @param {app.MvtStylingService} appMvtStylingService Mvt styling service.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeoDebounce service.
 * @param {string} geonetworkBaseUrl catalog base server url.
 * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank layer service.
 * @constructor
 * @export
 * @ngInject
 */
const MainController = function(
    $scope, $http, ngeoFeatureOverlayMgr, ngeoBackgroundLayerMgr, ngeoOfflineServiceManager,
    gettextCatalog, appExclusionManager, appLayerOpacityManager,
    appLayerPermalinkManager, appMymaps, appStateManager, appThemes, appTheme,
    appUserManager, appDrawnFeatures, langUrls, maxExtent, defaultExtent,
    ngeoLocation, appExport, appGetDevice,
    appOverviewMapShow, showCruesLink, showAnfLink, appOverviewMapBaseLayer, appNotify, $window,
  appSelectedFeatures, $locale, appRouting, $document, cesiumURL, ipv6Substitution,
    $rootScope, ngeoOlcsService, tiles3dLayers, tiles3dUrl, lidarProfileUrl, ngeoNetworkStatus,
    appOfflineBar, ngeoOfflineMode, ageLayerIds, showAgeLink, appGetLayerForCatalogNode,
    showCruesRoles, ageCruesLayerIds, appOfflineDownloader, appOfflineRestorer, appMymapsOffline,
    ngeoDownload, appMvtStylingService, ngeoDebounce, geonetworkBaseUrl, appBlankLayer,
    proxyWmsUrl,
    httpsProxyUrl,
    getvtpermalinkUrl, uploadvtpermalinkUrl, deletevtpermalinkUrl, vectortilesUrl) {
  /**
   * @type {app.backgroundlayer.BlankLayer}
   * @private
   */
  this.blankLayer_ = appBlankLayer;

  appUserManager.setOfflineMode(ngeoOfflineMode); // avoid circular dependency
  appMymaps.setOfflineMode(ngeoOfflineMode);
  appMymaps.setOfflineService(appMymapsOffline);

  // Lux lib, intialize proxyUrlHelper to create OL layers
  // enabling passing conf from v3 to lux lib v4
  proxyUrlHelper.init_v3(
    proxyWmsUrl,
    httpsProxyUrl
  )

  this.mediumStylingData = getDefaultMediumStyling();

  function applyStyleFromItem(mbMap, item, label) {
    try {
      doApplyStyleFromItem(mbMap, item, label);
    } catch {
      console.log(`style item ${item} not available in layer ${mbMap}`)
    }
  }

  function doApplyStyleFromItem(mbMap, item, label) {
    appMvtStylingService.isCustomStyle = appMvtStylingService.isCustomStyleSetter(label, true);
    (item.fills || []).forEach(path => {
      if (item.color) {
        mbMap.setPaintProperty(path, 'fill-color', item.color);
        mbMap.setPaintProperty(path, 'fill-opacity', 1);
      }
      mbMap.setLayoutProperty(path, 'visibility', item.visible ? 'visible' : 'none');
    });
    (item.lines || []).forEach(path => {
      if (item.color) {
        mbMap.setPaintProperty(path, 'line-color', item.color);
        mbMap.setPaintProperty(path, 'line-opacity', 1);
      }
      mbMap.setLayoutProperty(path, 'visibility', item.visible ? 'visible' : 'none');
    });
    (item.symbols || []).forEach(path => {
      mbMap.setLayoutProperty(path, 'visibility', item.visible ? 'visible' : 'none');
    });
    (item.fillExtrusions || []).forEach(path => {
      if (item.color) {
        mbMap.setPaintProperty(path, 'fill-extrusion-color', item.color);
        mbMap.setPaintProperty(path, 'fill-extrusion-opacity', 1);
      }
      mbMap.setLayoutProperty(path, 'visibility', item.visible ? 'visible' : 'none');
    });
    (item.backgrounds || []).forEach(path => {
      if (item.color) {
        mbMap.setPaintProperty(path, 'background-color', item.color);
        mbMap.setPaintProperty(path, 'background-opacity', 1);
      }
      mbMap.setLayoutProperty(path, 'visibility', item.visible ? 'visible' : 'none');
    });
    (item.hillshades || []).forEach(path => {
      mbMap.setLayoutProperty(path, 'visibility', item.visible ? 'visible' : 'none');
    });
  }

  this.debouncedSaveStyle_ = ngeoDebounce(() => {
    const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    const isPublished = false;
    const dataObject = {
      medium: this.mediumStylingData,
      background: bgLayer
    }

    appMvtStylingService.saveStyle(dataObject, isPublished)
    .then(() => {
      const config = JSON.stringify(this.mediumStylingData);
      this.ngeoLocation_.updateParams({
        'serial': config,
        'serialLayer': bgLayer.get('label')
      });
      this.appMvtStylingService.apply_mvt_config(config, bgLayer.get('label'));
      this.ngeoLocation_.refresh();
      this.resetLayerFor3d_();
    });
  }, 2000, false);

  this.resetLayerFor3d_ = () => {
    this.map_.getLayerGroup().getLayers().forEach((layer, index) => {
      if (layer.get('groupName') === 'background') {
        this.map_.getLayerGroup().getLayers().setAt(index, layer);
      }
    });
  };
  this.simpleStylingData = getSimpleStylings();
  this.resetSelectedSimpleData = () => {
    this.simpleStylingData.forEach(function(data) {data['selected'] = false;});
  };

  // Set the selected attribute on the simple style which matches the current medium style
  this.checkSelectedSimpleData = () => {
    this.simpleStylingData.forEach(simpleStyle => {
        simpleStyle['selected'] = false;
        const mediumColors = this.mediumStylingData.filter(m => 'color' in m);
        if (mediumColors.length > 0) {
          for (let i = 0; i < simpleStyle['colors'].length; ++i) {
            if (!mediumColors[i].visible || mediumColors[i].color !== simpleStyle['colors'][i]) {
              return;
            }
          }
        }
        const hillshadeMediumItem = this.mediumStylingData.find(m => 'hillshades' in m);
        if (!!hillshadeMediumItem) {
          if (simpleStyle['hillshade'] === hillshadeMediumItem.visible) {
            simpleStyle['selected'] = true;
          }
        }
    });
  };


  this.onSimpleStylingSelected = selectedItem => {
    // First we reset the selected 'style' items
    this.resetSelectedSimpleData();
    // Then we select this item
    selectedItem['selected'] = true;

    this.styleStore_.setSimpleStyle(selectedItem)
    // return

    ////////////////////////////////////////////////////////////////////////

    const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    const label = bgLayer.get('label');
    this.mediumStylingData = getDefaultMediumStyling(label); // start again from a fresh style
    const mediumStyles = this.mediumStylingData.filter(m => 'color' in m);
    const mbMap =  bgLayer.getMapLibreMap();
    for (let i = 0; i < selectedItem['colors'].length; ++i) {
      const item = mediumStyles[i];
      item.color = selectedItem['colors'][i];
      item.visible = true;
      applyStyleFromItem(mbMap, item, label);
    }

    const hillshadeItem = this.mediumStylingData.find(m => 'hillshades' in m);
    hillshadeItem.visible = false;
    applyStyleFromItem(mbMap, hillshadeItem, label)

    this.debouncedSaveStyle_();
    this.trackOpenVTEditor('VTSimpleEditor/' + selectedItem['label']);
  };

  this.onMediumStylingChanged = item => {
    styleService_.applyDefaultStyle(
      this.mapStore_.bgLayer,
      this.styleStore_.bgVectorBaseStyles,
      this.styleStore_.bgStyle
    )
    this.styleStore_.setStyle(item)
    return

    ////////////////////////////////////////////////////////////////////////

    // const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    // const mbMap =  bgLayer.getMapBoxMap();
    // applyStyleFromItem(mbMap, item, bgLayer.get('label'));
    // this.debouncedSaveStyle_();
    // this.checkSelectedSimpleData();
  };

  if (navigator.serviceWorker) {
    // Force online state on load since iOS/Safari does not support clientIds.
    navigator.serviceWorker.getRegistration().then(() => {
      fetch('/switch-lux-online');
    })
  }

  this.ngeoOlcsService_ = ngeoOlcsService;

  this.$rootScope_ = $rootScope

  /**
   * @type {string}
   * @export
   */
  this.geonetworkBaseUrl = geonetworkBaseUrl;
  /**
   * @type {string}
   * @private
   */
  this.ageCruesLayerIds_ = ageCruesLayerIds;

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  /**
   * @type {boolean}
   * @export
   */
  this.activeLayersComparator = false;

  /**
   * @type {boolean}
   * @export
   */
  this.showCruesLinkOrig = (showCruesLink === 'true');

  /**
   * @type {boolean}
   * @export
   */
  this.showCruesLink = false;

  /**
   * @type {string}
   * @export
   */
  this.showCruesRoles = showCruesRoles;

  /**
   * @type {boolean}
   * @export
   */
  this.showAnfLink = showAnfLink;

  /**
   * @type {boolean}
   * @export
   */
  this.showAgeLink = (showAgeLink === 'true');

  /**
   * @private
   */
  this.appOfflineRestorer_ = appOfflineRestorer;

  /**
   * @type {Document}
   * @private
   */
  this.$document_ = $document;

  /**
   * @type {app.Routing}
   * @export
   */
  this.appRouting_ = appRouting;

  /**
   * @type {angular.$locale}
   * @private
   */
  this.locale_ = $locale;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = $window;
  if (this.window_._paq === undefined) this.window_._paq = [];

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @private
   * @type {app.GetDevice}
   */
  this.appGetDevice_ = appGetDevice;

  /**
   * @type {app.Export}
   * @private
   */
  this.appExport_ = appExport;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;
  this.mapStore_ = useMapStore()
  this.styleStore_ = useStyleStore()
  styleUrlHelper.setRegisterUrl_v3({
    get: getvtpermalinkUrl,
    upload: uploadvtpermalinkUrl,
    delete: deletevtpermalinkUrl,
    vectortiles: vectortilesUrl
  })

  useMvtStyles().initBackgroundsConfigs()

  /**
   * @type {app.draw.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {angular.http}
   * @private
   */
  this.http_ = $http;

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {ngeo.offline.NetworkStatus}
   * @private
   */
  this.networkStatus_ = ngeoNetworkStatus;

  /**
  * @type {ngeo.offline.Mode}
  * @export
  */
  this.offlineBar = appOfflineBar;

  /**
   * @type {ngeo.offline.Mode}
   * @export
   */
  this.offlineMode = ngeoOfflineMode;

  /**
   * @private
   * @type {Array<string>}
   */
  this.tiles3dLayers_ = tiles3dLayers;

  /**
   * @private
   * @type {string}
   */
  this.tiles3dUrl_ = tiles3dUrl;

  /**
   * @private
   * @type {string}
   */
  this.lidarProfileUrl_ = lidarProfileUrl;

  /**
   * @type {ngeo.offline.NetworkStatus}
   * @export
   */
  this.ngeoNetworkStatus = ngeoNetworkStatus;

  /**
   * @type {ol.Extent}
   * @private
   */
  this.maxExtent_ =
      transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;

  /**
   * @type {Object.<string, string>}
   * @private
   */
  this.langUrls_ = langUrls;

  /**
   * @type {Array.<number>}
   * @private
   */
  this.defaultExtent_ = defaultExtent;

  /**
   * @type {boolean}
   */
  this['hasRoutingResult'] = false;

  /**
   * @type {boolean}
   */
  this['sidebarActive'] = false;

  /**
   * @type {boolean}
   */
  this['languageOpen'] = false;

  /**
   * @type {boolean}
   */
  this['drawOpen'] = false;

  /**
   * @type {boolean}
   */
  this['drawOpenMobile'] = false;

  /**
   * @type {boolean}
   */
  this['infosOpen'] = false;

  /**
   * @type {boolean}
   */
  this['feedbackOpen'] = false;

  /**
   * @type {boolean}
   */
  this['feedbackCruesOpen'] = false;

  /**
   * @type {boolean}
   */
  this['feedbackAnfOpen'] = false;

  /**
   * @type {boolean}
   */
  this['feedbackAgeOpen'] = false;

  /**
   * @type {boolean}
   */
  this.vectorEditorOpen = false;

  /**
   * @type {boolean}
   */
  this['legendsOpen'] = false;

  /**
   * @type {boolean}
   */
  this['routingOpen'] = false;

  /**
   * @type {boolean}
   */
   this['lidarOpen'] = false;

  /**
   * @type {boolean}
   */
  this['layersOpen'] = false;

  /**
   * @type {boolean}
   */
  this['measureOpen'] = false;

  /**
   * @type {boolean}
   */
  this['mymapsOpen'] = false;

  /**
   * @type {boolean}
   */
  this['printOpen'] = false;

  /**
   * @type {boolean}
   */
  this['shareOpen'] = false;

  /**
   * @type {boolean}
   */
  this['shareMymapsChecked'] = false;

  /**
   * @type {boolean}
   */
  this['shareShowLongUrl'] = false;

  /**
   * @type {boolean}
   */
  this['userOpen'] = false;

  /**
   * @type {boolean}
   */
  this['infosHiddenContent'] = false;

  /**
   * @type {boolean}
   */
  this['showRedirect'] = false;

  /**
   * @type {string|undefined}
   */
  this['infosAppSelector'] = undefined;

  /**
   * @type {Array}
   */
  this['selectedLayers'] = [];

  /**
   * @type {function}
   */
  this.selectedLayersLength = function() {
    return this.selectedLayers.filter(l => l.get('metadata') && !l.get('metadata').hidden).length
  }

  /**
   * @type {Array}
   */
  this['ageLayers'] = [];

  /**
   * Set to true to display the change icon in Mymaps.
   * @type {boolean}
   */
  this['layersChanged'] = false;

  const initial3dTilesVisibleValue = appStateManager.getInitialValue('3dtiles_visible');

  /**
   * @export
   */
  this.debugOffline = ngeoLocation.hasParam('debugOffline');

  /**
   * True if no initial state is defined.
   * @type {boolean}
   * @export
   */
  this.tiles3dVisible = initial3dTilesVisibleValue !== undefined ? initial3dTilesVisibleValue === 'true' : true;

  /**
   * @type{app.Mvtstyling}
   */
  this.appMvtStylingService = appMvtStylingService;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;
  this.appUserManager_.getUserInfo();

  /**
   * @type {boolean}
   */
  this.embedded = !!(new URL(window.location).searchParams.get('embedded'))

  /**
   * @const {!app.Map}
   * @private
   */
  this.map_ = this.createMap_();

  // Super hack because we do not have access to the offline button controller
  this.map_.superHackIsItOKToSaveOffline = () => {
    const isIOS = document.location.search.includes("localforage=ios") || document.location.search.includes("fakeios");
    if (isIOS) {
      const layer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
      return layer && !layer.getMapBoxMap;
    }
    return true;
  };

  /**
   * @type {string}
   */
  this.lastPanelOpened = undefined;

  /**
   * @type {boolean}
   */
  this.activeMvt;

  /**
   * @type {ngeo.download.service}
   */
  this.saveAs_ = ngeoDownload;

  /**
   * @type {boolean}
   */
  this.isColorVisible = true;

  /**
   * @const {?app.olcs.Lux3DManager}
   * @export
   */
  this.ol3dm_ = this.createCesiumManager_(cesiumURL, ipv6Substitution, $rootScope);

  this.ngeoOlcsService_.initialize(this.ol3dm_);

  this.initLanguage_();

  this.initMymaps_();

  this.manageSelectedLayers_($scope);

  appExclusionManager.init(this.map_, this.ol3dm_);
  appLayerOpacityManager.init(this.map_);
  ngeoFeatureOverlayMgr.init(this.map_);
  appLayerPermalinkManager.init($scope, this.map_, this['selectedLayers']);
  $scope.$watch(function() {
    return appLayerPermalinkManager.hasUnavailableLayers();
  }.bind(this), function(newVal, oldVal) {
    if (newVal !== null && oldVal !== null && newVal !== oldVal && newVal === true) {
      this['userOpen'] = true;
    }
  }.bind(this));

  this.updateStyleWidgetsForBgLayer = (newBgLayer, oldBgLayer) => {
    const previous = useOpenLayers().getLayerFromCache(oldBgLayer);
    const current = useOpenLayers().getLayerFromCache(newBgLayer) || this.blankLayer_.blankLayer_;

    // avoid if the layer is the same or first initialization
    if (current !== previous) {
      const label = current.get('label');

      // Set accordingly the editor UI
      if (label === 'basemap_2015_global') {
        this.isColorVisible = true;
        $('#editor-medium').collapse('hide');
      } else {
        this.isColorVisible = false;
        $('#editor-medium').collapse('show');
      }

      // Only if current is a vector tiles layer
      // Check if it is a function, otherwise it sould be "is not a function" error
      if (current.getMapBoxMap) {
        appMvtStylingService.isCustomStyle = appMvtStylingService.isCustomStyleGetter(label);
        this.mediumStylingData = getDefaultMediumStyling(label);
        let config = undefined;

        appMvtStylingService.getStyle(label).then((style) => {
          if (style !== undefined) {
            if (JSON.parse(style)['medium']) {
              Object.assign(this.mediumStylingData, JSON.parse(style)['medium']);
              this.checkSelectedSimpleData();
              config = JSON.stringify(this.mediumStylingData);
            } else {
              config = JSON.parse(style)['serial'];
            }
            this.ngeoLocation_.updateParams({
              'bgLayer': label,
              'serial': config,
              'serialLayer': label
            });
            this.appMvtStylingService.apply_mvt_config(config, label);
            this.ngeoLocation_.refresh();
            this.resetLayerFor3d_();
          }
        },(rejected) => {
          this.checkSelectedSimpleData();
          console.log(rejected);
        });
      }
    }
  };

  this.appExport_.init(this.map_);

  this.addLocationControl_(ngeoFeatureOverlayMgr);

  this.manageUserRoleChange_($scope);
  this.loadThemes_().then((themes) => {
    statePersistorStyleService.bootstrap()
    this.appThemes_.getBgLayers(this.map_).then(
          bgLayers => {
            if (appOverviewMapShow) {
              var layer = /** @type {ol.layer.Base} */
                (bgLayers.find(layer => {
                  return layer.get('label') === appOverviewMapBaseLayer;
                }));
              this.map_.addControl(
                new olControlOverviewMap(
                  {layers: [layer],
                    collapseLabel: '\u00BB',
                    label: '\u00AB'}));
            }
          });
    this['ageLayers'].splice(0, this['ageLayers'].length);
    this.appThemes_.get3D().then(
      struct3D => {
        this.ol3dm_.setTerrain(struct3D.terrain);
        this.initCesium3D_(this.cesiumURL, this.$rootScope_, $scope);

        this.ol3dm_.setTree(struct3D.tree);
        this.ol3dm_.load().then(
          () => {
            // appLayerPermalinkManager.initBgLayers_().then(
            //   () => 
                this.ol3dm_.init3dTilesFromLocation()
            // );
          }
        );
      }
    );
    this.appThemes_.getFlatCatalog().then(
      flatCatalogue => {
      flatCatalogue.forEach(catItem => {
        var layerIdsArray = ageLayerIds.split(',');
        if (layerIdsArray.indexOf('' + catItem.id) >= 0) {
          var layer = this.getLayerFunc_(catItem);
          if (this['ageLayers'].indexOf(layer) < 0) {
            this['ageLayers'].push (layer);
          }
        }
      });
    });

    this['feedbackAgeOpen'] = ('true' === this.ngeoLocation_.getParam('feedbackage'));
    this['feedbackAnfOpen'] = ('true' === this.ngeoLocation_.getParam('feedbackanf'));
    this['feedbackCruesOpen'] = ('true' === this.ngeoLocation_.getParam('feedbackcrues'));
    var urlLocationInfo = appStateManager.getInitialValue('crosshair');
    var infoOpen = urlLocationInfo !== undefined && urlLocationInfo !== null &&
      urlLocationInfo === 'true';
    this['layersOpen'] = (!this.appGetDevice_.testEnv('xs') &&
    !this['routingOpen'] &&
    this.ngeoLocation_.getParam('map_id') === undefined &&
    !infoOpen &&
    !this['feedbackCruesOpen'] &&
    !this['feedbackAnfOpen'] &&
    !this['feedbackAgeOpen'] &&
    this.stateManager_.getValueFromLocalStorage('layersOpen') !== 'false') &&
    !this.embedded;
    this['mymapsOpen'] = (!this.appGetDevice_.testEnv('xs') &&
        this.ngeoLocation_.getParam('map_id') !== undefined &&
        !this['feedbackCruesOpen'] &&
        !this['feedbackAnfOpen'] &&
        !this['feedbackAgeOpen'] &&
        !infoOpen && !this.embedded) ? true : false;
    $scope.$watch(() => {
      return this['layersOpen'];
    }, newVal => {
      if (newVal === false) {
        // $('app-catalog .themes-switcher').collapse('show');
        // $('app-themeswitcher #themes-content').collapse('hide');

        // close style editor when switching tools and sidebar stays open
        luxAppStore.closeStyleEditorPanel()
        luxAppStore.setThemeGridOpen(false)
      } else {
        this['lidarOpen'] = false;
      }
    });
    // listen to layersOpen changes in store (clicking close button on custom element)
    const { layersOpen, styleEditorOpen } = storeToRefs(luxAppStore)
    watch(
      layersOpen,
      layersOpen => {
        if(layersOpen === false) {
          this.closeSidebar()
          $scope.$apply()
        }
      },
      { immediate: true }
    )
    // listen to styleEditorOpen to open legacy vectorEditor
    watch(
      styleEditorOpen,
      styleEditorOpen => {
        if(styleEditorOpen === true) {
          this.vectorEditorOpen = true;
          this.trackOpenVTEditor('openVTEditor');
          $scope.$apply()
        }
      },
      { immediate: true }
    )
    // listen to theme changes in store
    const themeStore = useThemeStore()
    const { theme } = storeToRefs(themeStore)
    watch(
      theme,
      theme => {
        if (theme) {
          // set color for custom elements (which is currently not called, since in header of vue app)
          themeSelectorService.setCurrentThemeColors(theme.name);

          // set current theme for legacy components
          this.appTheme_.setCurrentTheme(theme.name);

          // set 'data-theme' attribute for legacy component colors
          document.getElementsByTagName('body')[0].setAttribute('data-theme', theme.name);

          // set max zooms (was previously done in CataloggController)
          this.appTheme_.setThemeZooms(theme);
          
          try {
            $scope.$digest(); // Force apply on theme switcher to update theme name
          } catch (e) {}
        }
      },
      { immediate: true }
    )
    const { bgLayer, layers } = storeToRefs(useMapStore())
    // monitor changes in layers to update state of mymaps
    watch(
      layers,
      (layers) => {
        this['selectedLayers'] = layers.map((l) => useOpenLayers().getLayerFromCache(l)).reverse();
        this.compareLayers_();
        $scope.$digest();
      }
    )
    // monitor change of BG layer to update state of mymaps
    // listen to changes of bgLayer to send piwik request formerly sent from BackgroundselectorController
    watch(
      bgLayer,
      (bgLayer, oldBgLayer) => {
        this.compareLayers_();
        $scope.$digest();
        const piwik = /** @type {Piwik} */ (this.window_['_paq']);
        if (piwik && bgLayer) {
          piwik.push(['setDocumentTitle', 'BackgroundAdded/' + bgLayer.name]);
          piwik.push(['trackPageView']);
        }
        this.updateStyleWidgetsForBgLayer(bgLayer, oldBgLayer);
      }
    )
    $scope.$watch(() => {
      return this['mymapsOpen'] || this['infosOpen'] ||
        this['legendsOpen'] || this['feedbackOpen'] || this['feedbackAnfOpen'] ||
        this['routingOpen'] || this['feedbackAgeOpen'] || this['feedbackCruesOpen'] ||
        this['vectorEditorOpen'];
    }, newVal => {
      if (newVal) {
        this['lidarOpen'] = false;
      }
    });
    $scope.$watch(() => {
      return this['lidarOpen'];
    }, newVal => {
      if (newVal) {
        var piwik = /** @type {Piwik} */ (this.window_['_paq']);
        if (piwik != undefined) {
          piwik.push(['setDocumentTitle', 'openLidarPanel']);
          piwik.push(['trackPageView']);
        }
        this['layersOpen'] = this['measureOpen'] = this['mymapsOpen'] = this['infosOpen'] = this['printOpen'] = this['shareOpen'] =
          this['legendsOpen'] = this['routingOpen'] = false;
      }
    });
    this.activeLayersComparator = (this.ngeoLocation_.getParam('lc') === 'true');

    $scope.$watch(() => {
      return this.sidebarOpen();
    }, newVal => {
      // setLayersOpen in store from legacy components
      luxAppStore.setLayersOpen(newVal)
      this.stateManager_.updateStorage({
        'layersOpen': newVal
      });
      if (this['mymapsOpen'] && this.appGetDevice_.testEnv('xs') &&
          this.selectedFeatures_.getLength() > 0) {
        var feature = this.selectedFeatures_.getArray()[0];
        feature.set('__refreshProfile__', true);
      }
    });

    this.appThemes_.getThemeObject(
      this.appTheme_.getCurrentTheme()).then(() => {
        var zoom = Number(appStateManager.getInitialValue('zoom'));
        if (zoom > 19) {
          this.map_.getView().setZoom(zoom);
        }
      });
  });
  var waypoints = appStateManager.getInitialValue('waypoints');
  if (waypoints !== undefined && waypoints !== null) {
    this['routingOpen'] = true;
    var criteria = parseInt(appStateManager.getInitialValue('criteria'), 10);
    var transportMode = parseInt(
      appStateManager.getInitialValue('transportMode'), 10);
    this.appRouting_.criteria = criteria;
    this.appRouting_.transportMode = transportMode;
    var coordinates = waypoints.split(',');
    var i = 0;
    var routeNumber = 1;
    this.appRouting_.routesOrder.splice(0, this.appRouting_.routesOrder.length);
    for (i = 0; i < coordinates.length; i = i + 2) {
      var position = [
        parseFloat(coordinates[i + 1]), parseFloat(coordinates[i])];
      var feature = new olFeature({
        geometry: new olGeomPoint((transform(position, 'EPSG:4326', 'EPSG:3857')))
      });
      feature.set('label', '' + routeNumber);
      this.appRouting_.insertFeatureAt(feature, routeNumber);
      this.appRouting_.routesOrder.push(routeNumber - 1);
      routeNumber++;
    }
    if (i > 1) {
      var labels = appStateManager.getInitialValue('labels');
      this.appRouting_.routes  = labels.split('||');
      this.appRouting_.getRoute();
    }
  }

  $scope.$watch(this.isDisconnectedOrOffline.bind(this), (offline) => {
    if (offline) {
      if (this.sidebarOpen() && !this['layersOpen'] && !this['mymapsOpen']) {
        this.closeSidebar();
        this['layersOpen'] = true;
      }
      this.showTab('a[href=\'#mylayers\']');
    }
  });

  /**
   * Listen on login to finish to reload the mvt style
   */
  $scope.$on('authenticated', () => {
    // If is to avoid 'undefined' error at page loading as the theme is not fully loaded yet
    const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    if (bgLayer && bgLayer.getMapBoxMap) {
      this.appMvtStylingService.getBgStyle().then(configs => {
        const config = configs.find(config => config.label === bgLayer.get('label'));
        if (config) {
          bgLayer.getMapBoxMap().setStyle(config.style);
        }
      });

      appMvtStylingService.getStyle(bgLayer.get('label')).then((style) => {
          Object.assign(this.mediumStylingData, JSON.parse(style)['medium']);
          this.checkSelectedSimpleData();
      }, (err) => {
        console.log(err);
      });
    }
  });

  $scope.$on('mvtPanelOpen', () => {
    this.vectorEditorOpen = true;
    this.trackOpenVTEditor('openVTEditor');
  });

  /**
   * Read a json file and store custom style to local storage
   */
  this.setCustomStyle = (event) => {
    const file = event.target.files[0];

    if (file.type !== 'application/json') {
      return;
    }

    this.readFile_(file, (e) => {
      const result = e.target.result;
      const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
      bgLayer.getMapBoxMap().setStyle(JSON.parse(result));
      const isPublished = true;

      const dataObject = {
        medium: undefined, // empty for the save function
        background: bgLayer
      }

      this.appMvtStylingService.saveStyle(dataObject, isPublished).then(id => {
        // If result is a serialized UUID
        if (isValidSerial(id)) {
          this.ngeoLocation_.updateParams({
            'serial': id,
            'serialLayer': bgLayer.get('label')
          });
          this.ngeoLocation_.refresh();
        }
      });

      // If undefined, medium style UI is empty (was undefined for saving purpose)
      this.mediumStylingData = getDefaultMediumStyling(bgLayer.get('label'));
    });

    // Reset form value
    event.target.value = null;
  };

  this.clearCustomStyle = () => {
    this.styleStore_.setStyle(null)
    return

    /////////////////////////////////////////////////////////////////////////

    // const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    // this.appMvtStylingService.removeStyles(bgLayer);
    // bgLayer.getMapBoxMap().setStyle(bgLayer.get('defaultMapBoxStyle'));
    // this.mediumStylingData = getDefaultMediumStyling(bgLayer.get('label'));
    // this.resetLayerFor3d_();
    // this.resetSelectedSimpleData();
    // this.checkSelectedSimpleData();
    // this.ngeoLocation_.deleteParam('serial');
    // this.ngeoLocation_.deleteParam('serialLayer');
  };

  /**
   * Read a file as text
   * @private
   */
  this.readFile_ = function(file, callback) {
    const reader = new FileReader();
    reader.onload = callback;
    reader.readAsText(file);
  };

  this.downloadCustomStyleFile = () => {
    const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    const content = JSON.stringify(bgLayer.getMapBoxMap().getStyle());
    const fileName = 'styles.json';
    if (!content) {
      console.log('No custom mvt to load');
      return;
    }
    return this.saveAs_(content, fileName);
  }


  ngeoOfflineServiceManager.setSaveService(appOfflineDownloader);
  ngeoOfflineServiceManager.setRestoreService(appOfflineRestorer);

  Sentry.init({
    dsn: 'https://afe219319897490e9ba927b06afdf934@sentry.geoportail.lu/3',
    integrations: [
      new Integrations.Angular(),
    ],
  });

  $('#editor-simple').on('show.bs.collapse', function(){
    this.trackOpenVTEditor('openVTSimpleEditor');
  }.bind(this));
  $('#editor-medium').on('show.bs.collapse', function(){
    this.trackOpenVTEditor('openVTMediumEditor');
  }.bind(this));
  $('#editor-expert').on('show.bs.collapse', function(){
    this.trackOpenVTEditor('openVTExpertEditor');
  }.bind(this));
};


/**
 * @return {string} The public url for sharing the vt style json file.
 * @export
 */
MainController.prototype.getUrlVtStyle = function() {
  const bgLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
  if (bgLayer !== null && bgLayer !== undefined) {
    return this.appMvtStylingService.getUrlVtStyle(bgLayer);
  }
  return "";
};

/**
 * @private
 * @param {boolean} active 3d state
 */
MainController.prototype.enable3dCallback_ = function(active) {
  if (!active) {
    this.appMvtStylingService.unpublishIfSerial(this.map_);
    return;
  }
  this.appMvtStylingService.publishIfSerial(this.map_);

  var piwik = /** @type {Piwik} */ (this.window_['_paq']);
  if (piwik != undefined) {
    piwik.push(['setDocumentTitle', 'enable3d']);
    piwik.push(['trackPageView']);
  }
  this['drawOpen'] = false;
  this['drawOpenMobile'] = false;
  this['measureOpen'] = false;
  this['printOpen'] = false;
};

/**
 * @param {ngeo.map.FeatureOverlayMgr} featureOverlayMgr Feature overlay manager.
 * @private
 */
MainController.prototype.addLocationControl_ = function(featureOverlayMgr) {
    var isActive = false;
    var activateGeoLocation = this.ngeoLocation_.getParam('tracking');
    if (activateGeoLocation && 'true' === activateGeoLocation) {
      isActive = true;
      this.ngeoLocation_.deleteParam('tracking');
    }
    var locationControl = new appLocationControl(/** @type {app.LocationControlOptions} */({
      label: '\ue800',
      featureOverlayMgr: featureOverlayMgr,
      notify: this.notify_,
      gettextCatalog: this.gettextCatalog_,
      scope: this.scope_,
      window: this.window_,
      target: document.querySelector("map-container") // since lib lux integration, force target to Custom Element <map-container>
    }));
    this.map_.addControl(locationControl);
    if (isActive) {
      // this.map_.once('change:view', (e) => {
      this.map_.once('postrender', (e) => { // since lib lux integration, force recenter on postrender
        locationControl.handleCenterToLocation();
      });
    }
  };


/**
 * @private
 * @return {!app.Map} The extended ol.Map.
 */
MainController.prototype.createMap_ = function() {
  var interactions = interactionDefaults({
    altShiftDragRotate: false,
    pinchRotate: true,
    constrainResolution: true
  });

  const rotate = new DragRotate({
    condition: platformModifierKeyOnly
  });

  let rotation = Number(this.ngeoLocation_.getParam('rotation')) || 0;

  var map = this['map'] = useMap().getOlMap();
  // var map = this['map'] = new appMap({
  //   logo: false,
  //   controls: [
  //     new olControlZoom({zoomInLabel: '\ue032', zoomOutLabel: '\ue033'}),
  //     // the zoom to extent control will be added later since it depends on ol3dm
  //     new olControlFullScreen({label: '\ue01c', labelActive: '\ue02c'}),
  //     new olControlAttribution({collapsible: false,
  //       collapsed: false, className: 'geoportailv3-attribution'}),
  //     new Rotate({})
  //   ],
  //   interactions: interactions.extend([rotate]),
  //   keyboardEventTarget: document,
  //   loadTilesWhileInteracting: true,
  //   loadTilesWhileAnimating: true,
  //   view: new olView({
  //     maxZoom: 19,
  //     minZoom: 8,
  //     enableRotation: true,
  //     extent: this.maxExtent_,
  //     constrainResolution: true,
  //     rotation,
  //   })
  // });

  // FIXME: this is a hack to make the map avaialble to the web components.
  // To be changed to use `ng-prop` when available (angular > 1.7).
  this.window_.map = map;

  map.on('moveend', e => {
    const rotation = map.getView().getRotation();
    this.ngeoLocation_.updateParams({
      rotation,
    });
  });

  return map;
};


/**
 * @private
 * @param {string} cesiumURL The Cesium URL
 * @param {angular.Scope} $rootScope The root scope
 * @return {!app.olcs.Lux3DManager} The created manager.
 */
MainController.prototype.createCesiumManager_ = function(cesiumURL, ipv6Substitution, $rootScope) {
  console.assert(this.map_ !== null && this.map_ !== undefined);
  return new appOlcsLux3DManager(cesiumURL, ipv6Substitution, this.map_, this.ngeoLocation_,
                                 $rootScope, this.tiles3dLayers_, this.tiles3dUrl_, this.blankLayer_,
                                 this.notify_, this.gettextCatalog_, this.appThemes_);
};


/**
 * @export
 * @return {boolean} Whether 3D is active.
 */
MainController.prototype.is3dEnabled = function() {
  return this.ol3dm_ && this.ol3dm_.is3dEnabled();
};


/**
 * Register a watcher on "roleId" to reload the themes when the role id
 * changes.
 * @param {angular.Scope} scope Scope.
 * @private
 */
MainController.prototype.manageUserRoleChange_ = function(scope) {
  scope.$watch(function() {
    return this.appUserManager_.roleId;
  }.bind(this), function(newVal, oldVal) {
    if (newVal === null && oldVal === null) {
      // This happens at init time. We don't want to reload the themes
      // at this point, as the constructor already loaded them.
      return;
    }
    this.showCruesLink = false;
    if (this.showCruesLinkOrig && newVal !== null) {
      var roles = this.showCruesRoles.split(',');
      var found = roles.find(function(element) {
        return element === ('' + newVal);
      }, this);
      this.showCruesLink = (found !== undefined);
    }
    this.loadThemes_();
    if (this.appMymaps_.isMymapsSelected()) {
      this.appMymaps_.loadMapInformation();
    }
  }.bind(this));
};


/**
 * @private
 * @return {?angular.$q.Promise} Promise.
 */
MainController.prototype.loadThemes_ = function() {
  return this.appThemes_.loadThemes(this.appUserManager_.roleId)
    .then((themes) => useThemeStore().setThemes(themes));
};


/**
 * @param {angular.Scope} scope Scope
 * @private
 */
MainController.prototype.manageSelectedLayers_ =
    function(scope) {
      ngeoMiscSyncArrays(
        this.map_.getLayers().getArray(),
        this['selectedLayers'], true, scope,
        function(layer) {
          if (!layer) {
            // to prevent strange behaviour where ngeoMiscSyncArrays tries to add undefined layers to the map
            return false;
          }
          if (layer instanceof olLayerVector && layer.get('altitudeMode') === 'clampToGround') {
            return false;
          }
          if (layer instanceof LayerGroup && layer.get('groupName') === 'background') {
            return false;
          }
          if (layer.get('queryable_id') === this.mapStore_.bgLayer?.id) return false
          if (layer instanceof MaskLayer) {
            return false;
          }
          if (this.mapStore_.bgLayer && (this.mapStore_.bgLayer.id === layer.get('id'))) {
            return false;
          }
          // Ignore layer for measurements
          if (layer.get('role') === "MeasureController") {
            return false;
          }

          return this.map_.getLayers().getArray().indexOf(layer) !== 0;
        }.bind(this)
      );
      scope.$watchCollection(function() {
        return this['selectedLayers'];
      }.bind(this), function(newSelectedLayers, oldSelectedLayers) {
        this.map_.render();
        this.compareLayers_();

        if (newSelectedLayers.length > oldSelectedLayers.length) {
          var nbLayersAdded =
             newSelectedLayers.length - oldSelectedLayers.length;
          for (var i = 0; i < nbLayersAdded; i++) {
            var layer = this['selectedLayers'][i];
            var piwik = /** @type {Piwik} */ (this.window_['_paq']);
            if (piwik != undefined) {
              piwik.push(['setDocumentTitle',
                'LayersAdded/' + layer.get('label')
              ]);
              piwik.push(['trackPageView']);
            }
          }
        }
      }.bind(this));
    };

/**
 * @export
 */
MainController.prototype.openFeedback = function() {
  if (this.sidebarOpen()) {
    this.closeSidebar();
    this['feedbackOpen'] = true;
  } else {
    this['feedbackOpen'] = true;
  }
};


/**
 * @export
 */
MainController.prototype.openFeedbackAnf = function() {
  this.appThemes_.getFlatCatalog().then(
    function(flatCatalogue) {
      var node = flatCatalogue.find(function(catItem) {
        return catItem.id == 1640;
      });
      if (node !== undefined && node !== null) {
        var layer = this.getLayerFunc_(node);
        var idx = this.map_.getLayers().getArray().indexOf(layer);
        if (idx === -1) {
          this.map_.addLayer(layer);
        }
      }
    }.bind(this));

  if (this.sidebarOpen()) {
    this.closeSidebar();
    this['feedbackAnfOpen'] = true;
  } else {
    this['feedbackAnfOpen'] = true;
  }
};


/**
 * @export
 */
MainController.prototype.openFeedbackAge = function() {
  if (this.sidebarOpen()) {
    this.closeSidebar();
    this['feedbackAgeOpen'] = true;
  } else {
    this['feedbackAgeOpen'] = true;
  }
};

/**
 * @export
 */
MainController.prototype.openFeedbackCrues = function() {
  this.appThemes_.getFlatCatalog().then(
    function(flatCatalogue) {
      var node = flatCatalogue.find(function(catItem) {
        return catItem.id == this.ageCruesLayerIds_;
      }.bind(this));
      if (node !== undefined && node !== null) {
        var layer = this.getLayerFunc_(node);
        var idx = this.map_.getLayers().getArray().indexOf(layer);
        if (idx === -1) {
          this.map_.addLayer(layer);
        }
      }
    }.bind(this));

  if (this.sidebarOpen()) {
    this.closeSidebar();
    this['feedbackCruesOpen'] = true;
  } else {
    this['feedbackCruesOpen'] = true;
  }
};

/**
 * @export
 */
MainController.prototype.closeSidebar = function() {
  this['mymapsOpen'] = this['layersOpen'] = this['infosOpen'] =
      this['feedbackOpen'] = this['legendsOpen'] = this['routingOpen'] =
      this['feedbackAnfOpen'] = this['feedbackAgeOpen'] =
      this['feedbackCruesOpen'] = this['vectorEditorOpen'] = this['lidarOpen'] = false;
  // close style editor when closing sidebar
  luxAppStore.closeStyleEditorPanel()
  luxAppStore.setLayersOpen(false) // For info, this also closes the themeGrid
  luxAppStore.setMyLayersTabOpen(false)
};


/**
 * @return {boolean} `true` if the sidebar should be open, otherwise `false`.
 * @export
 */
MainController.prototype.sidebarOpen = function() {
  return this['mymapsOpen'] || this['layersOpen'] || this['infosOpen'] ||
      this['legendsOpen'] || this['feedbackOpen'] || this['feedbackAnfOpen'] ||
      this['routingOpen'] || this['feedbackAgeOpen'] || this['feedbackCruesOpen'] ||
      this['vectorEditorOpen'] || this['lidarOpen'];
};


/**
 * Track Vector Tiles Editor.
 * @param {string} documentTitle The document title.

 * @export
 */
MainController.prototype.trackOpenVTEditor = function (documentTitle) {
  var piwik = /** @type {Piwik} */ (this.window_['_paq']);
  if (piwik != undefined) {
    piwik.push(['setDocumentTitle', documentTitle]);
    piwik.push(['trackPageView']);
  }
};


/**
 * @param {string} lang Language code.
 * @param {boolean=} track track page view
 * @export
 */
MainController.prototype.switchLanguage = function(lang, track) {
  if (typeof track !== 'boolean') {
    track = true;
  }
  console.assert(lang in this.langUrls_);
  this.gettextCatalog_.setCurrentLanguage(lang);
  this.gettextCatalog_.loadRemote(this.langUrls_[lang]);
  this.locale_.NUMBER_FORMATS.GROUP_SEP = ' ';
  this['lang'] = lang;

  //change lang for existing lit elements
  i18next.changeLanguage(lang);
  //change lang for integrated vue custom elements
  Luxi18next.changeLanguage(lang)

  var piwik = /** @type {Piwik} */ (this.window_['_paq']);
  if (piwik != undefined) {
    piwik.push(['setCustomVariable', 1, 'Language', this['lang']]);
    if (track) {
      piwik.push(['trackPageView']);
    }
  }
};


/**
 * @return {string} the current theme.
 * @export
 */
MainController.prototype.getCurrentTheme = function() {
  return this.appTheme_.getCurrentTheme();
};

/**
 * @return {string} the current theme.
 * @export
 */
MainController.prototype.getEncodedCurrentTheme = function() {
  return this.appTheme_.encodeThemeName(this.appTheme_.getCurrentTheme());
};

/**
 * @private
 */
MainController.prototype.initLanguage_ = function() {
  this.scope_.$watch(function() {
    return this['lang'];
  }.bind(this), function(newValue) {
    this.stateManager_.updateState({
      'lang': newValue
    });
  }.bind(this));

  var urlLanguage = /** @type {string|undefined} */
      (this.stateManager_.getInitialValue('lang'));

  if (urlLanguage !== undefined && urlLanguage in this.langUrls_) {
    this.switchLanguage(urlLanguage, false);
    return;
  } else {
    // if there is no information about language preference,
    // fallback to french
    this.switchLanguage('fr', false);
    return;
  }
};


/**
 * @private
 */
MainController.prototype.initMymaps_ = function() {
  var mapId = this.ngeoLocation_.getParam('map_id');

  this.appMymaps_.map = this.map_;
  this.appMymaps_.mapProjection = this.map_.getView().getProjection();
  if (mapId !== undefined) {
    this.appMymaps_.setCurrentMapId(mapId,
        this.drawnFeatures_.getCollection()).then(
          function(features) {
            var x = this.stateManager_.getInitialValue('X');
            var y = this.stateManager_.getInitialValue('Y');

            if (x === undefined && y === undefined &&
                this.drawnFeatures_.getCollection().getLength() > 0) {
              this.map_.getView().fit(this.drawnFeatures_.getExtent(), {
                size: /** @type {ol.Size} */ (this.map_.getSize())
              });
            }
            // var layer = this.drawnFeatures_.getLayer();
            // if (this.map_.getLayers().getArray().indexOf(layer) === -1) {
            //   this.map_.addLayer(layer);
            // }
          }.bind(this));
  } else {
    this.appMymaps_.clear();
  }
  this.appMymaps_.layersChanged = this['layersChanged'];
  this.map_.getLayerGroup().on('change', () => {
    if (!this.appOfflineRestorer_.restoring) {
      this.compareLayers_();
    }
  });
};

MainController.prototype.initCesium3D_ = function(cesiumURL, $rootScope, $scope) {
  $scope.$watch(() => this.is3dEnabled(), this.enable3dCallback_.bind(this));
  this.map_.set('ol3dm', this.ol3dm_);

  // Add the zoom to extent control in a second step since it depends on ol3dm.
  this.map_.addControl(new appOlcsZoomToExtent(this.defaultExtent_, this.ol3dm_));
};


/**
 * Compare the layers of mymaps with selected layers
 * and set layersChanged to true if there is a difference
 * between the displayed layers and the mymaps layers
 * @private
 */
MainController.prototype.compareLayers_ = function() {
  if (this.appMymaps_.isEditable()) {
    this['layersChanged'] = false;
    var backgroundLayer = useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer);
    if (this.appMymaps_.mapBgLayer !== (backgroundLayer?.get('label') || 'blank')) {
      this['layersChanged'] = true;
    } else {
      if (this['selectedLayers'].length !== this.appMymaps_.mapLayers.length) {
        this['layersChanged'] = true;
      } else {
        var selectedLabels = [];
        var selectedOpacities = [];
        this['selectedLayers'].forEach(function(item) {
          selectedLabels.push(item.get('label'));
          selectedOpacities.push('' + item.getOpacity());
        });
        selectedLabels.reverse();
        selectedOpacities.reverse();
        if (selectedLabels.join(',') !== this.appMymaps_.mapLayers.join(',')) {
          this['layersChanged'] = true;
        } else {
          if (selectedOpacities.join(',') !==
              this.appMymaps_.mapLayersVisibilities.map(
                (visible, i) => (visible === 'true')?this.appMymaps_.mapLayersOpacities[i]:0
              ).join(',')) {
            this['layersChanged'] = true;
          }
        }
      }
    }
  } else {
    this['layersChanged'] = false;
  }
};


/**
 * @param {string} selector JQuery selector for the tab link.
 * @export
 */
MainController.prototype.showTab = function(selector) {
  $(selector).tab('show');
};


/**
 * @export
 */
MainController.prototype.toggleThemeSelector = function() {
  const { layersOpen, myLayersTabOpen, themeGridOpen } = storeToRefs(luxAppStore)

  var layerTree = $('app-catalog .themes-switcher');
  var themesSwitcher = $('app-themeswitcher #themes-content');
  var themeTab = $('#catalog');

  if (this['layersOpen']) {
    if (themesSwitcher.hasClass('in') && themeTab.hasClass('active')) {
      this['layersOpen'] = false;
    } else {
      this.showTab('a[href=\'#catalog\']');
      themesSwitcher.collapse('show');
      layerTree.collapse('hide');
    }
  } else {
    this['layersOpen'] = true;
    this.showTab('a[href=\'#catalog\']');
    themesSwitcher.collapse('show');
    layerTree.collapse('hide');
  }

  if (!layersOpen.value) {
    luxAppStore.setLayersOpen(true)
    myLayersTabOpen.value && luxAppStore.setMyLayersTabOpen(false)
    luxAppStore.setThemeGridOpen(true)
  } else if (layersOpen.value) {
    if (themeGridOpen.value) {
      luxAppStore.setLayersOpen(false)
    } else {
      myLayersTabOpen.value && luxAppStore.setMyLayersTabOpen(false)
      luxAppStore.setThemeGridOpen(true)
    }
  }
};

/**
 * Check if disconnected or offline mode enabled.
 * @return {boolean} the state.
 * @export
 */
MainController.prototype.isDisconnectedOrOffline = function() {
  return this.offlineMode.isEnabled() || !!this.networkStatus_.isDisconnected();
};

appModule.controller('MainController', MainController);

bootstrapApp(appModule);

export default MainController;

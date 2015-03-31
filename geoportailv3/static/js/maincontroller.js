/**
 * @fileoverview This file defines the controller class for the application's
 * main controller (created using "ng-controller" in the page).
 *
 * In particular, this controller creates the OpenLayers map, and makes it
 * available in the controller for use from other parts (directives) of the
 * application. It also defines the behavior of elements of the HTML page (the
 * management of the sidebar for example).
 */
goog.provide('app.MainController');

goog.require('app');
goog.require('app.ExclusionManager');
goog.require('app.LocationControl');
goog.require('ngeo.SyncArrays');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.control.FullScreen');
goog.require('ol.control.ZoomToExtent');
goog.require('ol.layer.Tile');
goog.require('ol.proj');
goog.require('ol.source.OSM');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');



/**
 * @param {angular.Scope} $scope Scope.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {app.ExclusionManager} appExclusionManager Exclusion manager service.
 * @param {Object.<string, string>} langUrls URLs to translation files.
 * @param {Array.<number>} defaultExtent Default geographical extent.
 * @param {ngeo.SyncArrays} ngeoSyncArrays
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function($scope, gettextCatalog, appExclusionManager,
    langUrls, defaultExtent, ngeoSyncArrays) {

  /**
   * @type {Array.<Object>}
   */
  this['profileData'] = [{'y': 0, 'values': {'dhm': 0}, 'dist': 0, 'x': 0}];

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
  this['languageOpen'] = false;

  /**
   * @type {boolean}
   */
  this['drawOpen'] = false;

  /**
   * @type {boolean}
   */
  this['infosOpen'] = false;

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
  this['userOpen'] = false;

  /**
   * @type {boolean}
   */
  this['profileOpen'] = false;

  /**
   * @type {Array}
   */
  this['selectedLayers'] = [];

  /**
   * @type {string}
   */
  this['currentTheme'] = 'main';

  this.setMap_();

  this.switchLanguage('fr');
  this.manageSelectedLayers_($scope, ngeoSyncArrays);
  appExclusionManager.init(this.map_);
};


/**
 * @private
 */
app.MainController.prototype.setMap_ = function() {

  /** @type {ol.Map} */
  this.map_ = this['map'] = new ol.Map({
    controls: [
      new ol.control.Zoom({zoomInLabel: '\ue031', zoomOutLabel: '\ue025'}),
      new ol.control.ZoomToExtent({label: '\ue01b',
        extent: this.defaultExtent_}),
      new ol.control.FullScreen({label: '\ue01c', labelActive: '\ue02b'}),
      new app.LocationControl({label: '\ue800'})
    ],
    view: new ol.View({
      maxZoom: 19,
      minZoom: 8,
      extent: ol.extent.boundingExtent([
        ol.proj.transform([2.6, 47.7], 'EPSG:4326', 'EPSG:3857'),
        ol.proj.transform([8.6, 51], 'EPSG:4326', 'EPSG:3857')
      ])
    })
  });
};


/**
 * @param {angular.Scope} scope Scope
 * @param {ngeo.SyncArrays} ngeoSyncArrays
 * @private
 */
app.MainController.prototype.manageSelectedLayers_ =
    function(scope, ngeoSyncArrays) {
  ngeoSyncArrays(this.map_.getLayers().getArray(),
      this['selectedLayers'], true, scope,
      goog.bind(function(layer) {
        return goog.array.indexOf(
            this.map_.getLayers().getArray(), layer) !== 0;
      }, this)
  );
  scope.$watchCollection(goog.bind(function() {
    return this['selectedLayers'];
  }, this), goog.bind(function() {
    this.map_.render();
  }, this));
};


/**
 * @export
 */
app.MainController.prototype.closeSidebar = function() {
  this['mymapsOpen'] = this['layersOpen'] = this['infosOpen'] = false;
};


/**
 * @return {boolean} `true` if the sidebar should be open, otherwise `false`.
 * @export
 */
app.MainController.prototype.sidebarOpen = function() {
  return this['mymapsOpen'] || this['layersOpen'] || this['infosOpen'];
};


/**
 * @param {string} lang Language code.
 * @export
 */
app.MainController.prototype.switchLanguage = function(lang) {
  goog.asserts.assert(lang in this.langUrls_);
  this.gettextCatalog_.setCurrentLanguage(lang);
  this.gettextCatalog_.loadRemote(this.langUrls_[lang]);
  this['lang'] = lang;
};


/**
 * @param {string} selector JQuery selector for the tab link.
 * @export
 */
app.MainController.prototype.showTab = function(selector) {
  $(selector).tab('show');
};

app.module.controller('MainController', app.MainController);

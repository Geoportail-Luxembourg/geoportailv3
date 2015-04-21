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
goog.require('app.LayerOpacityManager');
goog.require('app.LocationControl');
goog.require('app.Themes');
goog.require('ngeo.SyncArrays');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.control.FullScreen');
goog.require('ol.control.Zoom');
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
 * @param {app.LayerOpacityManager} appLayerOpacityManager Layer opacity
 *     manager.
 * @param {app.Themes} appThemes Themes service.
 * @param {Object.<string, string>} langUrls URLs to translation files.
 * @param {Array.<number>} defaultExtent Default geographical extent.
 * @param {ngeo.SyncArrays} ngeoSyncArrays
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function($scope, gettextCatalog, appExclusionManager,
    appLayerOpacityManager, appThemes, langUrls, defaultExtent,
    ngeoSyncArrays) {

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

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
   * @type {Array}
   */
  this['selectedLayers'] = [];

  /**
   * @type {string}
   */
  this['currentTheme'] = 'main';

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = null;

  /**
   * The role id of the authenticated user, or `undefined` if the user
   * is anonymous, or if we don't yet kno if the user is authenticated.
   * @type {number|undefined}
   */
  this['roleId'] = undefined;

  this.setMap_();

  this.switchLanguage('fr');

  this.manageSelectedLayers_($scope, ngeoSyncArrays);

  appExclusionManager.init(this.map_);
  appLayerOpacityManager.init(this.map_);

  this.manageUserRoleChange_($scope);

  this.loadThemes_();
};


/**
 * @private
 */
app.MainController.prototype.setMap_ = function() {

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
 * Register a watcher on "roleId" to reload the themes when the role id
 * changes.
 * @param {angular.Scope} scope Scope.
 * @private
 */
app.MainController.prototype.manageUserRoleChange_ = function(scope) {
  scope.$watch(goog.bind(function() {
    return this['roleId'];
  }, this), goog.bind(function(newVal, oldVal) {
    if (!goog.isDef(oldVal) && !goog.isDef(newVal)) {
      // This happens at init time. We don't want to reload the themes
      // at this point, as the constructor already loaded them.
      return;
    }
    this.loadThemes_();
  }, this));
};


/**
 * @private
 */
app.MainController.prototype.loadThemes_ = function() {
  this.appThemes_.loadThemes(this['roleId']);
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

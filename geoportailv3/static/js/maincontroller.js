goog.provide('app.MainController');

goog.require('app');
goog.require('app.GetWmtsLayer');
goog.require('ngeo.mapDirective');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.proj');
goog.require('ol.source.OSM');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');



/**
 * @param {angular.Scope} $scope Scope.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {string} langUrlTemplate Language URL template.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function($scope, gettextCatalog, langUrlTemplate,
    appGetWmtsLayer) {

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;

  /**
   * @type {string}
   * @private
   */
  this.langUrlTemplate_ = langUrlTemplate;

  /**
   * @type {app.GetWmtsLayer}
   * @private
   */
  this.getWmtsLayer_ = appGetWmtsLayer;

  /**
   * @type {Boolean}
   */
  this['sidebarOpen'] = false;

  /**
   * @type {Boolean}
   */
  this['mymapsOpen'] = false;

  /**
   * @type {Boolean}
   */
  this['layersOpen'] = false;

  /**
   * @type {Boolean}
   */
  this['infosOpen'] = false;

  /**
   * @type {Array}
   */
  this['selectedLayers'] = [];

  this.setMap_();
  this.switchLanguage('fr');
  this.manageSidebar_($scope);

  $scope.$watchCollection(goog.bind(function() {
    return this['map'].getLayers().getArray();
  }, this), goog.bind(this.updateSelectedLayers_, this));
};


/**
 * @private
 */
app.MainController.prototype.setMap_ = function() {

  /** @type {ol.Map} */
  this['map'] = new ol.Map({
    layers: [this.getWmtsLayer_('basemap_global')],
    view: new ol.View({
      center: ol.proj.transform([6, 49.7], 'EPSG:4326', 'EPSG:3857'),
      zoom: 8
    })
  });
};


/**
 * @private
 */
app.MainController.prototype.updateSelectedLayers_ = function() {
  // empty the selectedLayers array
  this['selectedLayers'].length = 0;

  var layers = this['map'].getLayers().getArray();
  // create a reversed shallow copy
  layers = layers.slice().reverse();
  // Exclude the current background layer
  for (i = layers.length - 1; i >= 1; i--) {
    this['selectedLayers'].push(layers[i]);
  }
};


/**
 * @param {string} lang Language code.
 * @export
 */
app.MainController.prototype.switchLanguage = function(lang) {
  this.gettextCatalog_.setCurrentLanguage(lang);
  this.gettextCatalog_.loadRemote(
      this.langUrlTemplate_.replace('__lang__', lang));
  this['lang'] = lang;
};


/**
 * @param {angular.Scope} scope Scope.
 * @private
 */
app.MainController.prototype.manageSidebar_ = function(scope) {

  var toggleSidebar = goog.bind(function(newVal, oldVal) {
    this['sidebarOpen'] = this['mymapsOpen'] || this['layersOpen'] ||
        this['infosOpen'];
  }, this);

  scope.$watch(goog.bind(function() {
    return this['mymapsOpen'];
  }, this), toggleSidebar);

  scope.$watch(goog.bind(function() {
    return this['layersOpen'];
  }, this), toggleSidebar);

  scope.$watch(goog.bind(function() {
    return this['infosOpen'];
  }, this), toggleSidebar);

  scope.$watch(goog.bind(function() {
    return this['sidebarOpen'];
  }, this), goog.bind(function(newVal, oldVal) {
    if (!newVal) {
      this['mymapsOpen'] = false;
      this['layersOpen'] = false;
      this['infosOpen'] = false;
    }
  }, this));
};


/**
 * @param {string} selector JQuery selector for the tab link.
 * @export
 */
app.MainController.prototype.showTab = function(selector) {
  $(selector).tab('show');
};


app.module.controller('MainController', app.MainController);

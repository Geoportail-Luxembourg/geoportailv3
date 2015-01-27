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
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function($scope, gettextCatalog, langUrlTemplate) {

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
  this['sidebarOpen'] = false;

  /**
   * @type {Array}
   */
  this['selectedLayers'] = [];

  this.setMap_();
  this.switchLanguage('fr');
  this.manageSidebar_($scope);
  this.manageSelectedLayers_($scope);
};


/**
 * @private
 */
app.MainController.prototype.setMap_ = function() {

  /** @type {ol.Map} */
  this['map'] = new ol.Map({
    view: new ol.View({
      center: ol.proj.transform([6, 49.7], 'EPSG:4326', 'EPSG:3857'),
      zoom: 8
    })
  });
};


/**
 * @param {angular.Scope} scope Scope.
 * @private
 */
app.MainController.prototype.manageSelectedLayers_ = function(scope) {

  function updateSelectedLayers_() {
    // empty the selectedLayers array
    this['selectedLayers'].length = 0;

    var i;
    var layers = this['map'].getLayers().getArray();
    var len = layers.length;
    // Current background layer is excluded
    for (i = len - 1; i >= 1; i--) {
      this['selectedLayers'].push(layers[i]);
    }
  }

  scope.$watchCollection(goog.bind(function() {
    return this['map'].getLayers().getArray();
  }, this), goog.bind(updateSelectedLayers_, this));
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

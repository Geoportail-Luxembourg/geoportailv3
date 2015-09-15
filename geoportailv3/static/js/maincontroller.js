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
goog.require('app.FeaturePopup');
goog.require('app.LayerOpacityManager');
goog.require('app.LayerPermalinkManager');
goog.require('app.LocationControl');
goog.require('app.StateManager');
goog.require('app.Themes');
goog.require('goog.object');
goog.require('ngeo.FeatureOverlay');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.GetBrowserLanguage');
goog.require('ngeo.SyncArrays');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.control.FullScreen');
goog.require('ol.control.Zoom');
goog.require('ol.control.ZoomToExtent');
goog.require('ol.interaction.Select');
goog.require('ol.layer.Tile');
goog.require('ol.proj');
goog.require('ol.source.OSM');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');



/**
 * @param {angular.Scope} $scope Scope.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {ngeo.GetBrowserLanguage} ngeoGetBrowserLanguage
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {app.ExclusionManager} appExclusionManager Exclusion manager service.
 * @param {app.LayerOpacityManager} appLayerOpacityManager Layer opacity
 * @param {app.LayerPermalinkManager} appLayerPermalinkManager
 * @param {app.StateManager} appStateManager
 * @param {app.Themes} appThemes Themes service.
 * @param {app.FeaturePopup} appFeaturePopup Feature info service.
 * @param {Object.<string, string>} langUrls URLs to translation files.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {Array.<number>} defaultExtent Default geographical extent.
 * @param {ngeo.SyncArrays} ngeoSyncArrays
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function(
    $scope, ngeoFeatureOverlayMgr, ngeoGetBrowserLanguage, gettextCatalog,
    appExclusionManager, appLayerOpacityManager, appLayerPermalinkManager,
    appStateManager, appThemes, appFeaturePopup, langUrls, maxExtent,
    defaultExtent, ngeoSyncArrays) {

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {ngeo.GetBrowserLanguage}
   * @private
   */
  this.getBrowserLanguage_ = ngeoGetBrowserLanguage;

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
   * @type {ol.Extent}
   * @private
   */
  this.maxExtent_ =
      ol.proj.transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

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
  this['queryActive'] = true;

  /**
   * @type {string|undefined}
   */
  this['infosAppSelector'] = undefined;

  /**
   * @type {Array}
   */
  this['selectedLayers'] = [];

  /**
   * @type {string|undefined}
   */
  this['currentTheme'] = undefined;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = null;

  /**
   * The list of features that were drawn (either using the drawing tools or by
   * loading a mymap map).
   * @type {ol.Collection.<ol.Feature>}
   * @export
   */
  this.drawnFeatures = new ol.Collection();

  /**
   * The role id of the authenticated user, or `undefined` if the user
   * is anonymous, or if we don't yet kno if the user is authenticated.
   * @type {number|undefined}
   */
  this['roleId'] = undefined;

  this.setMap_();

  this.initLanguage_();

  this.manageSelectedLayers_($scope, ngeoSyncArrays);

  appExclusionManager.init(this.map_);
  appLayerOpacityManager.init(this.map_);
  ngeoFeatureOverlayMgr.init(this.map_);
  appLayerPermalinkManager.init($scope, this.map_, this['selectedLayers']);

  this.addLocationControl_(ngeoFeatureOverlayMgr);

  this.manageUserRoleChange_($scope);

  this.loadThemes_();

  $scope.$watch(goog.bind(function() {
    return this['layersOpen'];
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      $('app-catalog .themes-switcher').collapse('show');
      $('app-themeswitcher #themes-content').collapse('hide');
    }
  }, this));

  var selectInteraction = new ol.interaction.Select({
    filter: goog.bind(function(feature, layer) {
      return this.drawnFeatures.getArray().indexOf(feature) != -1;
    }, this)
  });
  goog.events.listen(selectInteraction, ol.interaction.SelectEventType.SELECT,
      function() {$scope.$apply();});
  this.map_.addInteraction(selectInteraction);

  /**
   * @type {ol.interaction.Select}
   * @export
   */
  this.selectInteraction = selectInteraction;

  /**
   * The selected features.
   * @type {ol.Collection.<ol.Feature>}
   * @export
   */
  this.selectedFeatures = selectInteraction.getFeatures();

  var drawOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();
  drawOverlay.setFeatures(this.drawnFeatures);

  appFeaturePopup.init(this.map_);
};


/**
 * @param {ngeo.FeatureOverlayMgr} featureOverlayMgr Feature overlay manager.
 * @private
 */
app.MainController.prototype.addLocationControl_ =
    function(featureOverlayMgr) {
  this.map_.addControl(
      new app.LocationControl({
        label: '\ue800',
        featureOverlayMgr: featureOverlayMgr
      }));
};


/**
 * @private
 */
app.MainController.prototype.setMap_ = function() {

  this.map_ = this['map'] = new ol.Map({
    controls: [
      new ol.control.Zoom({zoomInLabel: '\ue032', zoomOutLabel: '\ue033'}),
      new ol.control.ZoomToExtent({label: '\ue01b',
        extent: this.defaultExtent_}),
      new ol.control.FullScreen({label: '\ue01c', labelActive: '\ue02c'})
    ],
    view: new ol.View({
      maxZoom: 19,
      minZoom: 8,
      extent: this.maxExtent_
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
 * @private
 */
app.MainController.prototype.initLanguage_ = function() {
  this.scope_.$watch(goog.bind(function() {
    return this['lang'];
  }, this), goog.bind(function(newValue) {
    this.stateManager_.updateState({
      'lang': newValue
    });
  }, this));

  var browserLanguage = /** @type {string|undefined} */
      (this.getBrowserLanguage_(goog.object.getKeys(this.langUrls_)));
  var urlLanguage = /** @type {string|undefined} */
      (this.stateManager_.getInitialValue('lang'));

  if (goog.isDef(urlLanguage) &&
      goog.object.containsKey(this.langUrls_, urlLanguage)) {
    this.switchLanguage(urlLanguage);
    return;
  } else if (goog.isDef(browserLanguage) &&
      goog.object.containsKey(this.langUrls_, browserLanguage)) {
    this.switchLanguage(browserLanguage);
    return;
  } else {
    // if there is no information about language preference,
    // fallback to french
    this.switchLanguage('fr');
    return;
  }
};


/**
 * @param {string} selector JQuery selector for the tab link.
 * @export
 */
app.MainController.prototype.showTab = function(selector) {
  $(selector).tab('show');
};


/**
 * @export
 */
app.MainController.prototype.toggleThemeSelector = function() {
  var layerTree = $('app-catalog .themes-switcher');
  var themesSwitcher = $('app-themeswitcher #themes-content');
  var themeTab = $('#catalog');
  if (this['layersOpen']) {
    if (themesSwitcher.hasClass('in') && themeTab.hasClass('active')) {
      this['layersOpen'] = false;
    } else {
      this.showTab('a[href=#catalog]');
      themesSwitcher.collapse('show');
      layerTree.collapse('hide');
    }
  } else {
    this['layersOpen'] = true;
    this.showTab('a[href=#catalog]');
    themesSwitcher.collapse('show');
    layerTree.collapse('hide');
  }
};

app.module.controller('MainController', app.MainController);

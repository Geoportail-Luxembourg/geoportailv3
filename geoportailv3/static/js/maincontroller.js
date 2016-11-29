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
goog.require('app.Export');
goog.require('app.FeaturePopup');
goog.require('app.LayerOpacityManager');
goog.require('app.LayerPermalinkManager');
goog.require('app.LocationControl');
goog.require('app.Mymaps');
goog.require('app.StateManager');
goog.require('app.Themes');
goog.require('app.UserManager');
goog.require('goog.object');
goog.require('ngeo.BackgroundLayerMgr');
goog.require('ngeo.FeatureOverlay');
goog.require('ngeo.FeatureOverlayMgr');
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
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 * manager.
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
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {Object.<string, string>} langUrls URLs to translation files.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {Array.<number>} defaultExtent Default geographical extent.
 * @param {ngeo.SyncArrays} ngeoSyncArrays The array synchronizer service.
 * @param {ngeo.Location} ngeoLocation ngeo location service.
 * @param {app.Export} appExport The export GPX/KML service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function(
    $scope, ngeoFeatureOverlayMgr, ngeoBackgroundLayerMgr,
    gettextCatalog, appExclusionManager, appLayerOpacityManager,
    appLayerPermalinkManager, appMymaps, appStateManager, appThemes, appTheme,
    appUserManager, appDrawnFeatures, langUrls, maxExtent, defaultExtent,
    ngeoSyncArrays, ngeoLocation, appExport, appGetDevice) {

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
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {ngeo.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.DrawnFeatures}
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
  this['infosOpen'] = false;

  /**
   * @type {boolean}
   */
  this['feedbackOpen'] = false;

  /**
   * @type {boolean}
   */
  this['legendsOpen'] = false;

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
   * @type {string|undefined}
   */
  this['infosAppSelector'] = undefined;

  /**
   * @type {Array}
   */
  this['selectedLayers'] = [];

  /**
   * Set to true to display the change icon in Mymaps.
   * @type {boolean}
   */
  this['layersChanged'] = false;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = null;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  this.appUserManager_.getUserInfo();

  this.setMap_();

  this.initLanguage_();

  this.initMymaps_();

  this.manageSelectedLayers_($scope, ngeoSyncArrays);

  appExclusionManager.init(this.map_);
  appLayerOpacityManager.init(this.map_);
  ngeoFeatureOverlayMgr.init(this.map_);
  appLayerPermalinkManager.init($scope, this.map_, this['selectedLayers']);
  this.appExport_.init(this.map_);

  this.addLocationControl_(ngeoFeatureOverlayMgr);

  this.manageUserRoleChange_($scope);

  this.loadThemes_().then(function() {
    var urlLocationInfo = appStateManager.getInitialValue('crosshair');
    var infoOpen = goog.isDefAndNotNull(urlLocationInfo) &&
      urlLocationInfo === 'true';
    this['layersOpen'] = (this.appGetDevice_() !== 'xs' &&
    !goog.isDef(this.ngeoLocation_.getParam('map_id')) &&
    !infoOpen &&
    this.stateManager_.getValueFromLocalStorage('layersOpen') !== 'false') ?
    true : false;
    this['mymapsOpen'] = (this.appGetDevice_() !== 'xs' &&
        goog.isDef(this.ngeoLocation_.getParam('map_id')) &&
        !infoOpen) ? true : false;
    $scope.$watch(goog.bind(function() {
      return this['layersOpen'];
    }, this), goog.bind(function(newVal) {
      if (newVal === false) {
        $('app-catalog .themes-switcher').collapse('show');
        $('app-themeswitcher #themes-content').collapse('hide');
      }
    }, this));

    $scope.$watch(function() {
      return this.sidebarOpen();
    }.bind(this), function(newVal) {
      this.stateManager_.updateStorage({
        'layersOpen': newVal
      });
    }.bind(this));
  }.bind(this));

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
  var interactions = ol.interaction.defaults(
      {altShiftDragRotate:false, pinchRotate:false});
  this.map_ = this['map'] = new ol.Map({
    logo: false,
    controls: [
      new ol.control.Zoom({zoomInLabel: '\ue032', zoomOutLabel: '\ue033'}),
      new ol.control.ZoomToExtent({label: '\ue01b',
        extent: this.defaultExtent_}),
      new ol.control.FullScreen({label: '\ue01c', labelActive: '\ue02c'}),
      new ol.control.Attribution({collapsible: false,
        collapsed: false, className: 'geoportailv3-attribution'})
    ],
    interactions: interactions,
    loadTilesWhileInteracting: true,
    loadTilesWhileAnimating: true,
    view: new ol.View({
      maxZoom: 19,
      minZoom: 8,
      enableRotation: false,
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
    return this.appUserManager_.roleId;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal === null && oldVal === null) {
      // This happens at init time. We don't want to reload the themes
      // at this point, as the constructor already loaded them.
      return;
    }
    this.loadThemes_();
    if (this.appMymaps_.isMymapsSelected()) {
      this.appMymaps_.loadMapInformation();
    }
  }, this));
};


/**
 * @private
 * @return {?angular.$q.Promise} Promise.
 */
app.MainController.prototype.loadThemes_ = function() {
  return this.appThemes_.loadThemes(this.appUserManager_.roleId);
};


/**
 * @param {angular.Scope} scope Scope
 * @param {ngeo.SyncArrays} ngeoSyncArrays The array synchroniser service.
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
        this.compareLayers_();
      }, this));
    };

/**
 * @export
 */
app.MainController.prototype.openFeedback = function() {
  if (this.sidebarOpen) {
    this.closeSidebar();
    this['feedbackOpen'] = true;
  } else {
    this['feedbackOpen'] = true;
  }
};

/**
 * @export
 */
app.MainController.prototype.closeSidebar = function() {
  this['mymapsOpen'] = this['layersOpen'] = this['infosOpen'] =
      this['feedbackOpen'] = this['legendsOpen'] = false;
};


/**
 * @return {boolean} `true` if the sidebar should be open, otherwise `false`.
 * @export
 */
app.MainController.prototype.sidebarOpen = function() {
  return this['mymapsOpen'] || this['layersOpen'] || this['infosOpen'] ||
      this['legendsOpen'] || this['feedbackOpen'];
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
 * @return {string} the current theme.
 * @export
 */
app.MainController.prototype.getCurrentTheme = function() {
  return this.appTheme_.getCurrentTheme();
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

  var urlLanguage = /** @type {string|undefined} */
      (this.stateManager_.getInitialValue('lang'));

  if (goog.isDef(urlLanguage) &&
      goog.object.containsKey(this.langUrls_, urlLanguage)) {
    this.switchLanguage(urlLanguage);
    return;
  } else {
    // if there is no information about language preference,
    // fallback to french
    this.switchLanguage('fr');
    return;
  }
};


/**
 * @private
 */
app.MainController.prototype.initMymaps_ = function() {
  var mapId = this.ngeoLocation_.getParam('map_id');

  this.appMymaps_.mapProjection = this.map_.getView().getProjection();
  if (goog.isDef(mapId)) {
    this.appMymaps_.setCurrentMapId(mapId,
        this.drawnFeatures_.getCollection()).then(
          function(features) {
            var x = this.stateManager_.getInitialValue('X');
            var y = this.stateManager_.getInitialValue('Y');

            if (!goog.isDef(x) && !goog.isDef(y) &&
                this.drawnFeatures_.getCollection().getLength() > 0) {
              var viewSize = /** @type {ol.Size} */ (this.map_.getSize());
              this.map_.getView().fit(
                  this.drawnFeatures_.getExtent(),
                  viewSize
              );
            }
          }.bind(this));
  } else {
    this.appMymaps_.clear();
  }
  this.appMymaps_.map = this.map_;
  this.appMymaps_.layersChanged = this['layersChanged'];
  ol.events.listen(this.map_.getLayerGroup(), 'change',
      goog.bind(function() {
        this.compareLayers_();
      },this), this);
};


/**
 * Compare the layers of mymaps with selected layers
 * and set layersChanged to true if there there is a difference
 * between the displayed layers and the mymaps layers
 * @private
 */
app.MainController.prototype.compareLayers_ = function() {
  if (this.appMymaps_.isEditable()) {
    this['layersChanged'] = false;
    var backgroundLayer = this.backgroundLayerMgr_.get(this.map_);
    if (backgroundLayer &&
        this.appMymaps_.mapBgLayer !== backgroundLayer.get('label')) {
      this['layersChanged'] = true;
    } else {
      if (this['selectedLayers'].length !== this.appMymaps_.mapLayers.length) {
        this['layersChanged'] = true;
      } else {
        var selectedLabels = [];
        var selectedOpacities = [];
        goog.array.forEach(this['selectedLayers'], function(item) {
          selectedLabels.push(item.get('label'));
          selectedOpacities.push('' + item.getOpacity());
        });
        selectedLabels.reverse();
        selectedOpacities.reverse();
        if (selectedLabels.join(',') !== this.appMymaps_.mapLayers.join(',')) {
          this['layersChanged'] = true;
        } else {
          if (selectedOpacities.join(',') !==
              this.appMymaps_.mapLayersOpacities.join(',')) {
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
};

app.module.controller('MainController', app.MainController);

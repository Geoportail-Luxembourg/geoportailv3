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
goog.require('app.Notify');
goog.require('app.OfflineDownloader');
goog.require('app.Routing');
goog.require('app.StateManager');
goog.require('app.Themes');
goog.require('app.UserManager');
goog.require('goog.asserts');
goog.require('goog.array');
goog.require('goog.object');
goog.require('ngeo.draw.module');
goog.require('ngeo.map.BackgroundLayerMgr');
goog.require('ngeo.map.FeatureOverlayMgr');
goog.require('ngeo.message.popupComponent');
goog.require('ngeo.message.Popup');
goog.require('ngeo.misc.syncArrays');
goog.require('ngeo.offline.module');
goog.require('ngeo.search.module');
goog.require('ngeo.statemanager.module');
goog.require('ol.events');
goog.require('ol.Map');
goog.require('ol.Object');
goog.require('ol.View');
goog.require('ol.control.Attribution');
goog.require('ol.control.FullScreen');
goog.require('ol.control.OverviewMap');
goog.require('ol.control.Zoom');
goog.require('ol.control.ZoomToExtent');
goog.require('ol.proj');


/**
 * @param {angular.Scope} $scope Scope.
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
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {Object.<string, string>} langUrls URLs to translation files.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {Array.<number>} defaultExtent Default geographical extent.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {app.Export} appExport The export GPX/KML service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {boolean} appOverviewMapShow Add or not the overview control.
 * @param {string} appOverviewMapBaseLayer The layer displayed in overview.
 * @param {app.Notify} appNotify Notify service.
 * @param {angular.$window} $window Window.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {angular.$locale} $locale The locale service.
 * @param {app.Routing} appRouting The routing service.
 * @param {Document} $document Document.
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo network status service.
 * @constructor
 * @export
 * @ngInject
 */
app.MainController = function(
    $scope, ngeoFeatureOverlayMgr, ngeoBackgroundLayerMgr, ngeoOfflineServiceManager,
    gettextCatalog, appExclusionManager, appLayerOpacityManager,
    appLayerPermalinkManager, appMymaps, appStateManager, appThemes, appTheme,
    appUserManager, appDrawnFeatures, langUrls, maxExtent, defaultExtent,
    ngeoLocation, appExport, appGetDevice,
    appOverviewMapShow, appOverviewMapBaseLayer, appNotify, $window,
    appSelectedFeatures, $locale, appRouting, $document, ngeoNetworkStatus) {
  /**
   * @type {boolean}
   * @export
   */
  this.activeLayersComparator = false;

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
   * @type {ngeo.offline.NetworkStatus}
   * @export
   */
  this.ngeoNetworkStatus = ngeoNetworkStatus;

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
   * Save a square of 10 km sideways (Map's unit is the meter).
   * @type {number}
   * @export
   */
  this.offlineExtentSize = 10000;

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
  this['legendsOpen'] = false;

  /**
   * @type {boolean}
   */
  this['routingOpen'] = false;

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
   * Set to true to display the change icon in Mymaps.
   * @type {boolean}
   */
  this['layersChanged'] = false;

  /**
   * @export
   */
  this.debugOffline = ngeoLocation.hasParam('debugOffline');

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

  this.manageSelectedLayers_($scope);

  appExclusionManager.init(this.map_);
  appLayerOpacityManager.init(this.map_);
  ngeoFeatureOverlayMgr.init(this.map_);
  appLayerPermalinkManager.init($scope, this.map_, this['selectedLayers']);
  this.appExport_.init(this.map_);

  this.addLocationControl_(ngeoFeatureOverlayMgr);

  this.manageUserRoleChange_($scope);
  this.loadThemes_().then(function() {
    this.appThemes_.getBgLayers().then(
          function(bgLayers) {
            if (appOverviewMapShow) {
              var layer = /** @type {ol.layer.Base} */
                (goog.array.find(bgLayers, function(layer) {
                  return layer.get('label') === appOverviewMapBaseLayer;
                }));
              this.map_.addControl(
                new ol.control.OverviewMap(
                  {layers: [layer],
                    collapseLabel: '\u00BB',
                    label: '\u00AB'}));
            }
          }.bind(this));
    var urlLocationInfo = appStateManager.getInitialValue('crosshair');
    var infoOpen = goog.isDefAndNotNull(urlLocationInfo) &&
      urlLocationInfo === 'true';
    this['layersOpen'] = (!this.appGetDevice_.testEnv('xs') &&
    !this['routingOpen'] &&
    !goog.isDef(this.ngeoLocation_.getParam('map_id')) &&
    !infoOpen &&
    this.stateManager_.getValueFromLocalStorage('layersOpen') !== 'false') ?
    true : false;
    this['mymapsOpen'] = (!this.appGetDevice_.testEnv('xs') &&
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
    this.activeLayersComparator = (this.ngeoLocation_.getParam('lc') === 'true');

    $scope.$watch(function() {
      return this.sidebarOpen();
    }.bind(this), function(newVal) {
      this.stateManager_.updateStorage({
        'layersOpen': newVal
      });
      if (this['mymapsOpen'] && this.appGetDevice_.testEnv('xs') &&
          this.selectedFeatures_.getLength() > 0) {
        var feature = this.selectedFeatures_.getArray()[0];
        feature.set('__refreshProfile__', true);
      }
    }.bind(this));

    this.appThemes_.getThemeObject(
      this.appTheme_.getCurrentTheme()).then(function() {
        var zoom = Number(appStateManager.getInitialValue('zoom'));
        if (zoom > 19) {
          this.map_.getView().setZoom(zoom);
        }
      }.bind(this));
  }.bind(this));
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
      var feature = new ol.Feature({
        geometry: new ol.geom.Point((ol.proj.transform(position,
          'EPSG:4326', 'EPSG:3857')))
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

  ngeoOfflineServiceManager.setSaveService('appOfflineDownloader');
};


/**
 * @param {ngeo.map.FeatureOverlayMgr} featureOverlayMgr Feature overlay manager.
 * @private
 */
app.MainController.prototype.addLocationControl_ =
    function(featureOverlayMgr) {
      var isActive = false;
      var activateGeoLocation = this.ngeoLocation_.getParam('tracking');
      if (activateGeoLocation && 'true' === activateGeoLocation) {
        isActive = true;
        this.ngeoLocation_.deleteParam('tracking');
      }
      var locationControl = new app.LocationControl({
        label: '\ue800',
        featureOverlayMgr: featureOverlayMgr,
        notify: this.notify_,
        gettextCatalog: this.gettextCatalog_,
        scope: this.scope_,
        window: this.window_
      });
      this.map_.addControl(locationControl);
      if (isActive) {
        ol.events.listenOnce(this.map_,
          ol.Object.getChangeEventType(ol.MapProperty.VIEW), function(e) {
            locationControl.handleCenterToLocation();
          }.bind(this));
      }
    };


/**
 * @private
 */
app.MainController.prototype.setMap_ = function() {
  var interactions = ol.interaction.defaults({
    altShiftDragRotate: false,
    pinchRotate: false,
    constrainResolution: true
  });
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
    keyboardEventTarget: document,
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
 * @private
 */
app.MainController.prototype.manageSelectedLayers_ =
    function(scope) {
      ngeo.misc.syncArrays(this.map_.getLayers().getArray(),
      this['selectedLayers'], true, scope,
      goog.bind(function(layer) {
        return goog.array.indexOf(
            this.map_.getLayers().getArray(), layer) !== 0;
      }, this)
  );
      scope.$watchCollection(goog.bind(function() {
        return this['selectedLayers'];
      }, this), goog.bind(function(newSelectedLayers, oldSelectedLayers) {
        this.map_.render();
        this.compareLayers_();

        if (newSelectedLayers.length > oldSelectedLayers.length) {
          var nbLayersAdded =
             newSelectedLayers.length - oldSelectedLayers.length;
          for (var i = 0; i < nbLayersAdded; i++) {
            var layer = this['selectedLayers'][i];
            var piwik = /** @type {Piwik} */ (this.window_['_paq']);
            piwik.push(['setDocumentTitle',
              'LayersAdded/' + layer.get('label')
            ]);
            piwik.push(['trackPageView']);
          }
        }
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
      this['feedbackOpen'] = this['legendsOpen'] = this['routingOpen'] = false;
};


/**
 * @return {boolean} `true` if the sidebar should be open, otherwise `false`.
 * @export
 */
app.MainController.prototype.sidebarOpen = function() {
  return this['mymapsOpen'] || this['layersOpen'] || this['infosOpen'] ||
      this['legendsOpen'] || this['feedbackOpen'] || this['routingOpen'];
};


/**
 * @param {string} lang Language code.
 * @param {boolean=} track track page view
 * @export
 */
app.MainController.prototype.switchLanguage = function(lang, track) {
  if (!goog.isBoolean(track)) {
    track = true;
  }
  goog.asserts.assert(lang in this.langUrls_);
  this.gettextCatalog_.setCurrentLanguage(lang);
  this.gettextCatalog_.loadRemote(this.langUrls_[lang]);
  this.locale_.NUMBER_FORMATS.GROUP_SEP = ' ';
  this['lang'] = lang;

  var piwik = /** @type {Piwik} */ (this.window_['_paq']);
  piwik.push(['setCustomVariable', 1, 'Language', this['lang']]);
  if (track) {
    piwik.push(['trackPageView']);
  }
};


/**
 * @return {string} the current theme.
 * @export
 */
app.MainController.prototype.getCurrentTheme = function() {
  return this.appTheme_.getCurrentTheme();
};

/**
 * @return {string} the current theme.
 * @export
 */
app.MainController.prototype.getEncodedCurrentTheme = function() {
  return this.appTheme_.encodeThemeName(this.appTheme_.getCurrentTheme());
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
              this.map_.getView().fit(this.drawnFeatures_.getExtent(), {
                size: /** @type {ol.Size} */ (this.map_.getSize())
              });
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
      }, this), this);
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

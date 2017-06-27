/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */
goog.provide('app.MymapsDirectiveController');
goog.provide('app.mymapsDirective');

goog.require('app');
goog.require('app.FeaturePopup');
goog.require('app.Mymaps');
goog.require('app.Notify');
goog.require('app.SelectedFeatures');
goog.require('app.Theme');
goog.require('app.UserManager');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('ngeo.filereaderDirective');
goog.require('ngeo.modalDirective');
goog.require('ol.extent');
goog.require('ol.format.GPX');
goog.require('ol.format.KML');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appMymapsTemplateUrl The template url.
 * @ngInject
 */
app.mymapsDirective = function(appMymapsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'useropen': '=appMymapsUseropen',
      'drawopen': '=appMymapsDrawopen',
      'shareopen': '=appMymapsShareopen',
      'shareMymapsChecked': '=appMymapsShareMymapsChecked',
      'shareShowLongUrl': '=appMymapsShareShowLongUrl',
      'layersChanged': '=appMymapsLayersChanged',
      'map': '=appMymapsMap',
      'selectedLayers': '=appMymapsSelectedLayers'
    },
    controller: 'AppMymapsController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMymapsTemplateUrl
  };
};


app.module.directive('appMymaps', app.mymapsDirective);


/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.$compile} $compile The compile provider.
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Theme} appTheme the current theme service.
 * @param {app.UserManager} appUserManager
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {Document} $document Document.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @param {app.Export} appExport The export service.
 * @constructor
 * @export
 * @ngInject
 */

app.MymapsDirectiveController = function($scope, $compile, $sce,
    gettextCatalog, ngeoBackgroundLayerMgr, appMymaps, appNotify,
    appFeaturePopup, appSelectedFeatures, appTheme, appUserManager,
    appDrawnFeatures, $document, exportgpxkmlUrl, appExport) {
  /**
   * @type {angular.$sce}
   * @private
   */
  this.sce_ = $sce;

  /**
   * @type {app.FeaturePopup}
   * @private
   */
  this.appFeaturePopup_ = appFeaturePopup;

  /**
   * @type {app.Export}
   * @private
   */
  this.appExport_ = appExport;

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {Array}
   * @private
   */
  this.selectedLayers_ = this['selectedLayers'];

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {ngeo.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @private
   * @type {string}
   */
  this.exportgpxkmlUrl_ = exportgpxkmlUrl;

  /**
   * @export
   * @type {boolean}
   */
  this.fileReaderSupported = true;

  /**
   * @export
   * @type {string}
   */
  this.gpxFileContent = '';

  /**
   * @export
   * @type {string}
   */
  this.kmlFileContent = '';

  /**
   * @export
   * @type {string}
   */
  this.kmzFileContent = '';

  /**
   * @private
   * @type {Document}
   */
  this.$document_ = $document;

  /**
   * @private
   * @type {ol.format.KML}
   */
  this.kmlFormat_ = new ol.format.KML();

  /**
   * @private
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new ol.format.GPX();

  /**
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.featuresList = appDrawnFeatures.getArray();

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
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * If modal is open and what type it is
   * @type {string|undefined}
   * @export
   */
  this.modal = undefined;

  /**
   * Tells whether the 'choosing a map' modal window is open or not.
   * @type {boolean}
   * @export
   */
  this.choosing = false;

  /**
   * List of Mymaps
   * @type {app.MapsResponse}
   * @export
   */
  this.maps = [];

  /**
   * List of Users with his categories having maps.
   * @type {app.MapsResponse}
   * @export
   */
  this.usersCategories = [];

  /**
   * String to be used in the title field in the modifying window.
   * Helps canceling modifications.
   * @type {string}
   * @export
   */
  this.newTitle = '';

  /**
   * String to be used in the description field in the modifying window.
   * Helps canceling modifications.
   * @type {string}
   * @export
   */
  this.newDescription = '';

  /**
   * ID to be used in the category field in the modifying window.
   * Helps canceling modifications.
   * @type {?number}
   * @export
   */
  this.newCategoryId = null;

  /**
   * ID of the category to filter with.
   * @type {?number}
   * @export
   */
  this.filterCategoryId = null;

  /**
   * Login of the map's owner to filter with.
   * @type {?string}
   * @export
   */
  this.filterMapOwner = null;

  /**
   * Is Map public?
   * @type {boolean}
   * @export
   */
  this.newIsPublic = false;

  /**
   * Open or Close the confirmation dialog box.
   * @type {boolean}
   * @export
   */
  this.confirmDelete = false;

  /**
   * Open or Close the confirmation dialog box.
   * @type {boolean}
   * @export
   */
  this.confirmDeleteObjects = false;

  /**
   * Open or Close the confirmation dialog box.
   * @type {boolean}
   * @export
   */
  this.confirmDeleteMap = false;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {Array.<ol.Feature>?}
   * @export
   */
  this.selectedFeaturesList = this.selectedFeatures_.getArray();

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = this.appMymaps_.createStyleFunction(this.map);

  $scope.$watch(goog.bind(function() {
    return this.filterMapOwner;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal !== oldVal) {
      this.appMymaps_.getMaps(this.filterMapOwner, this.filterCategoryId).then(goog.bind(function(mymaps) {
        this.choosing = true;
        this.maps = mymaps;
      }, this));
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.filterCategoryId;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal !== oldVal) {
      this.appMymaps_.getMaps(this.filterMapOwner, this.filterCategoryId).then(goog.bind(function(mymaps) {
        this.choosing = true;
        this.maps = mymaps;
        this.filterMapOwner = null;
      }, this));
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.appUserManager_.getRoleId();
  }, this), goog.bind(function(newVal, oldVal) {
    if (goog.isDefAndNotNull(newVal)) {
      this.appMymaps_.loadCategories();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.kmlFileContent;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal) {
      this.importKml();
      $('#dropdown-mymaps').removeClass('open');
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.kmzFileContent;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal) {
      this.importKmz();
      $('#dropdown-mymaps').removeClass('open');
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.gpxFileContent;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal) {
      this.importGpx();
      $('#dropdown-mymaps').removeClass('open');
    }
  }, this));

};


/**
 * Reset the layers & bglayer with the one of Mymaps.
 * @export
 */
app.MymapsDirectiveController.prototype.resetLayers = function() {
  goog.array.clear(this.selectedLayers_);
  this.appMymaps_.updateLayers();
};


/**
 * returns a trusted html content
 * @param {string} content content to be trusted
 * @return {*} the trusted content.
 * @export
 */
app.MymapsDirectiveController.prototype.trustAsHtml = function(content) {
  return this.sce_.trustAsHtml('' + content);
};


/**
 * Save the current layers definition into Mymaps.
 * @return {angular.$q.Promise} Promise.
 * @export
 */
app.MymapsDirectiveController.prototype.saveLayers = function() {
  var bgLayer = /** @type {string} */
      (this.backgroundLayerMgr_.get(this.map_).get('label'));
  var bgOpacity = '1';
  var layersLabels = [];
  var layersOpacities = [];
  var layersVisibilities = [];
  var layersIndices = [];
  goog.array.forEach(this.selectedLayers_, function(item, index) {
    layersLabels.push(item.get('label'));
    layersOpacities.push('' + item.getOpacity());
    if (item.getOpacity() === 0) {
      layersVisibilities.push('false');
    } else {
      layersVisibilities.push('true');
    }
    layersIndices.push('' + index);
  });
  var promise = this.appMymaps_.updateMapEnv(bgLayer, bgOpacity,
      layersLabels.join(','), layersOpacities.join(','),
      layersVisibilities.join(','), layersIndices.join(','),
      this.appTheme_.getCurrentTheme())
  .then(goog.bind(function() {
    this.appMymaps_.loadMapInformation();
  }, this));
  this['layersChanged'] = false;
  return promise;
};


/**
 * @param {boolean|undefined} value The value.
 * @return {boolean|undefined} false or true.
 * @export
 */
app.MymapsDirectiveController.prototype.modalShownHidden = function(value) {
  if (goog.isDef(value) && value === false) {
    this.modal = undefined;
    return false;
  } else if (goog.isDef(this.modal)) {
    return true;
  }
};


/**
 * Copy the map.
 * @export
 */
app.MymapsDirectiveController.prototype.openCopyMapModal = function() {
  this.newTitle = this.appMymaps_.mapTitle;
  this.newDescription = this.appMymaps_.mapDescription;
  this.modal = 'COPYING';
  this.newCategoryId = null;
  this.newIsPublic = false;
};


/**
 * Copy the map.
 * @export
 */
app.MymapsDirectiveController.prototype.copyMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.copyMap(
        this.newTitle,
        this.newDescription,
        this.newCategoryId,
        this.newIsPublic
    ).then(goog.bind(function(resp) {
      if (goog.isNull(resp)) {
        this.askToConnect();
      } else {
        var mapId = resp['uuid'];
        if (goog.isDef(mapId)) {
          var map = {'uuid': mapId};
          this.onChosen(map, false);
          var msg = this.gettextCatalog.getString('Carte copiée');
          this.notify_(msg, app.NotifyNotificationType.INFO);
          this.modal = undefined;
        }
      }
    }, this));
  }
};


/**
 * Export a Gpx file.
 * @param {boolean} isTrack True if gpx should export tracks instead of routes.
 * @export
 */
app.MymapsDirectiveController.prototype.exportGpx = function(isTrack) {

  var features = this.drawnFeatures_.getCollection();
  var mymapsFeatures = features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });
  this.appExport_.exportGpx(mymapsFeatures, this.appMymaps_.mapTitle, isTrack);
};


/**
 * Import a GPX file.
 * @export
 */
app.MymapsDirectiveController.prototype.importGpx = function() {
  var gpxFeatures = (this.gpxFormat_.readFeatures(this.gpxFileContent, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  }));
  this.gpxFileContent = '';
  var mapId = this.appMymaps_.getMapId();
  var featuresToSave = [];
  var noNameElemCnt = 0;
  var gpxExtent;
  goog.array.forEach(gpxFeatures, function(feature) {
    this.sanitizeFeature_(feature);
    feature.set('__map_id__', mapId);

    if (!goog.isDef(feature.get('name'))) {
      feature.set('name', 'Element ' + noNameElemCnt);
      noNameElemCnt++;
    }
    var curGeometry = feature.getGeometry();
    if (curGeometry.getType() === ol.geom.GeometryType.MULTI_LINE_STRING) {
      var lines = /** @type {ol.geom.MultiLineString} */
          (curGeometry).getLineStrings();
      goog.array.forEach(lines, function(line) {
        var clonedFeature = feature.clone();
        clonedFeature.setGeometry(line);
        featuresToSave.push(clonedFeature);
      });
    } else {
      featuresToSave.push(feature);
    }
    if (gpxExtent) {
      ol.extent.extend(gpxExtent, curGeometry.getExtent());
    } else {
      gpxExtent = curGeometry.getExtent();
    }
    feature.setStyle(this.featureStyleFunction_);
  }, this);

  if (gpxExtent) {
    this.fit(gpxExtent);
  }

  this.appMymaps_.saveFeatures(featuresToSave).then(
      goog.bind(function() {
        var map = {'uuid': mapId};
        this.onChosen(map, false);
      }, this)
  );
};


/**
 * Export a KML file.
 * @export
 */
app.MymapsDirectiveController.prototype.exportKml = function() {
  var features = this.drawnFeatures_.getCollection();
  var mymapsFeatures = features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });
  var kml = this.kmlFormat_.writeFeatures(mymapsFeatures, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      app.sanitizeFilename(this.appMymaps_.mapTitle));
};


/**
 * Import a KML file.
 * @param {string=} kml The kml as text.
 * @export
 */
app.MymapsDirectiveController.prototype.importKml = function(kml) {
  if (kml === undefined) {
    kml = this.kmlFileContent;
  }
  var kmlFeatures = (this.kmlFormat_.readFeatures(kml, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  }));
  this.kmlFileContent = '';
  var noNameElemCnt = 0;
  var kmlExtent;
  var mapId = this.appMymaps_.getMapId();
  goog.array.forEach(kmlFeatures, function(feature) {
    this.sanitizeFeature_(feature);
    feature.set('__map_id__', mapId);
    if (!goog.isDef(feature.get('name'))) {
      feature.set('name', 'Element ' + noNameElemCnt);
      noNameElemCnt++;
    }
    var curGeometry = feature.getGeometry();
    if (kmlExtent) {
      ol.extent.extend(kmlExtent, curGeometry.getExtent());
    } else {
      kmlExtent = curGeometry.getExtent();
    }
  }, this);

  if (kmlExtent) {
    this.fit(kmlExtent);
  }

  this.appMymaps_.saveFeatures(kmlFeatures).then(
      goog.bind(function() {
        var map = {'uuid': mapId};
        this.onChosen(map, false);
      }, this)
  );
};


/**
 * Verify each feature property type and value.
 * Remove unwanted properties.
 * @param {ol.Feature} feature The feature.
 * @private
 */
app.MymapsDirectiveController.prototype.sanitizeFeature_ = function(feature) {
  if (feature.getId()) {
    feature.setId(undefined);
  }
  if (feature.get('fid') !== undefined) {
    feature.set('fid', undefined, true);
  }
  if (feature.get('__editable__') !== undefined) {
    feature.set('__editable__', undefined, true);
  }
  if (feature.get('__map_id__') !== undefined) {
    feature.set('__map_id__', undefined, true);
  }
  if (feature.get('__refreshProfile__') !== undefined) {
    feature.set('__refreshProfile__', undefined, true);
  }
  if (feature.get('__saving__') !== undefined) {
    feature.set('__saving__', undefined, true);
  }
  if (feature.get('__selected__') !== undefined) {
    feature.set('__selected__', undefined, true);
  }
  if (feature.get('__selected__') !== undefined) {
    feature.set('__selected__', undefined, true);
  }

  var opacity = /** @type {string} */ (feature.get('opacity'));
  if (!goog.isDef(opacity)) {
    opacity = 0;
  }

  feature.set('opacity', +opacity);
  var stroke = /** @type {string} */ (feature.get('stroke'));
  if (isNaN(stroke)) {
    stroke = 2;
  }
  feature.set('stroke', +stroke);
  var size = /** @type {string} */ (feature.get('size'));
  if (isNaN(size)) {
    size = 10;
  }
  feature.set('size', +size);

  var angle = /** @type {string} */ (feature.get('angle'));
  if (isNaN(angle)) {
    angle = 0;
  }
  feature.set('angle', +angle);
  var isLabel = /** @type {string} */ (feature.get('isLabel'));
  feature.set('isLabel', isLabel === 'true');
  var isCircle = /** @type {string} */ (feature.get('isCircle'));
  feature.set('isCircle', isCircle === 'true');
  var showOrientation = /** @type {string} */
      (feature.get('showOrientation'));
  feature.set('showOrientation', showOrientation === 'true');
};

/**
 * Import a KMZ file.
 * @export
 */
app.MymapsDirectiveController.prototype.importKmz = function() {
  var zip = new JSZip();
  zip.loadAsync(this.kmzFileContent).then(function(pZip) {
    pZip.forEach(function(relativePath, file) {
      if (file.name.endsWith('.kml')) {
        file.async('string').then(function(data) {
          this.importKml(data);
          this.kmzFileContent = '';
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
};

/**
 * Close the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.closeMap = function() {
  this.drawnFeatures_.clearMymapsFeatures();
  this.selectedFeatures_.clear();
  this['layersChanged'] = false;
  this.appFeaturePopup_.hide();
};


/**
 * Open the confirmation dialog box.
 * @export
 */
app.MymapsDirectiveController.prototype.openConfirmDelete = function() {
  this.confirmDelete = true;
};


/**
 * Open the confirmation dialog box.
 * @export
 */
app.MymapsDirectiveController.prototype.openConfirmDeleteObjects = function() {
  this.confirmDeleteObjects = true;
};


/**
 * Open the delete map confirmation dialog box.
 * @export
 */
app.MymapsDirectiveController.prototype.openConfirmDeleteMap = function() {
  this.confirmDeleteMap = true;
};


/**
 * Closes the current anonymous drawing.
 * @export
 */
app.MymapsDirectiveController.prototype.closeAnonymous = function() {
  this.drawnFeatures_.clearAnonymousFeatures();
  this.selectedFeatures_.clear();
  if (this.isDocked()) {
    this.appFeaturePopup_.hide();
  }
};


/**
 * Open the dialog to create a new new map from an anoymous drawing.
 * @export
 */
app.MymapsDirectiveController.prototype.openNewMapFromAnonymous = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.modal = 'CREATE_FROM_ANONYMOUS';
    this.newTitle = this.gettextCatalog.getString('Map without Title');
    this.newDescription = '';
    this.newCategoryId = null;
    this.newIsPublic = false;
  }
};


/**
 * Add the anonymous drawing into the current map
 * @export
 */
app.MymapsDirectiveController.prototype.addInMymaps = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    if (this.isMymapsSelected()) {
      this.drawnFeatures_.moveAnonymousFeaturesToMymaps().then(
          goog.bind(function(mapinformation) {
            var mapId = this.appMymaps_.getMapId();
            var map = {'uuid': mapId};
            this.onChosen(map, false);
          }, this));
    }
  }
};


/**
 * Create a map from an anonymous drawing.
 * @export
 */
app.MymapsDirectiveController.prototype.createMapFromAnonymous = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.createMap(this.newTitle, this.newDescription,
        this.newCategoryId, this.newIsPublic)
        .then(goog.bind(function(resp) {
          if (goog.isNull(resp)) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (goog.isDef(mapId)) {
              this['drawopen'] = true;
              this.appMymaps_.setMapId(mapId);
              return this.saveLayers();
            }
          }
        }, this))
        .then(goog.bind(function(mapinformation) {
          return this.drawnFeatures_.moveAnonymousFeaturesToMymaps();
        }, this))
        .then(goog.bind(function(mapinformation) {
          var map = {'uuid': this.appMymaps_.getMapId()};
          this.onChosen(map, false);
          var msg = this.gettextCatalog.getString('Carte créée');
          this.notify_(msg, app.NotifyNotificationType.INFO);
          this.modal = undefined;
        }, this));
  }
};


/**
 * Returns if a mymaps is selected or not.
 * @return {boolean} Returns true if a mymaps is selected.
 * @export
 */
app.MymapsDirectiveController.prototype.isMymapsSelected = function() {
  return this.appMymaps_.isMymapsSelected();
};


/**
 * @return {string} Returns the description.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapDescription = function() {
  return this.appMymaps_.mapDescription;
};


/**
 * @return {string} Returns the title.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapTitle = function() {
  return this.appMymaps_.mapTitle;
};


/**
 * @return {string} Returns the map owner.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapOwner = function() {
  return this.appMymaps_.mapOwner;
};


/**
 * @param {?string} username The username.
 * @return {string} The category name.
 * @export
 */
app.MymapsDirectiveController.prototype.getUserCategDesc = function(username) {
  if (goog.isDefAndNotNull(username) && username.length > 0) {
    return username;
  } else {
    return this.gettextCatalog.getString('Filter results by username');
  }
};

/**
 * @param {?number} id The id.
 * @return {Object} The category name.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapCategoryFilter = function(id) {
  var category = this.appMymaps_.getCategory(id);
  if (goog.isDefAndNotNull(category)) {
    return category;
  } else {
    return {
      'id': null,
      'name': 'Filter results by category'
    };
  }
};


/**
 * @param {?number} id The id.
 * @return {Object} The category name.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapCategory = function(id) {
  var category = this.appMymaps_.getCategory(id);
  if (goog.isDefAndNotNull(category)) {
    return category;
  } else {
    return {
      'id': null,
      'name': this.gettextCatalog.getString('Please select a Category')
    };
  }
};


/**
 * @return {Object} The categories object.
 * @export
 */
app.MymapsDirectiveController.prototype.getCategories = function() {
  return this.appMymaps_.categories;
};


/**
 * @return {Object} The the filtered categories object.
 * @export
 */
app.MymapsDirectiveController.prototype.getFilteredCategories = function() {
  var categories = [];
  if (!goog.isDefAndNotNull(this.filterMapOwner)) {
    //All the categories of all user with at least one map
    categories = this.usersCategories;
  } else {
    var userCateg = goog.array.find(this.usersCategories, function(item, i) {
      if (item['username'] === this.filterMapOwner) {
        return true;
      }
      return false;
    }, this);
    if (userCateg) {
      // The categories of the current user having at least one map
      categories = [userCateg];
    }
  }
  if (this.appMymaps_.allcategories !== null) {
    return goog.array.filter(this.appMymaps_.allcategories, function(category, i) {
      var elem = goog.array.find(categories, function(userCategory, i) {
        if (userCategory['categories'].indexOf(category['id']) >= 0) {
          return true;
        }
        return false;
      }, this);
      if (elem) {
        return true;
      }
      return false;
    }, this);
  }
  return [];
};


/**
 * @return {Object} The user_categories object.
 * @export
 */
app.MymapsDirectiveController.prototype.getUsersCategories = function() {
  return this.usersCategories;
};


/**
 * @return {Object} The user_categories object.
 * @export
 */
app.MymapsDirectiveController.prototype.getFilteredUsersCategories = function() {
  if (this.filterCategoryId === null) {
    return this.usersCategories;
  }
  return goog.array.filter(this.usersCategories, function(item, i) {
    if (item['categories'].indexOf(this.filterCategoryId) >= 0) {
      return true;
    }
    return false;
  }, this);
};


/**
 * Open a map. Actually opens the map selector.
 * @export
 */
app.MymapsDirectiveController.prototype.openChooseMapModal = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.filterMapOwner = null;
    this.filterCategoryId = null;
    if (this.appUserManager_.getMymapsRole() === 1 &&
        this.appUserManager_.getMymapsAdmin()) {
      this.filterMapOwner = this.appUserManager_.getUsername();
    }

    this.appMymaps_.getUsersCategories().then(function(usersCategories) {
      this.usersCategories = usersCategories;
      this.appMymaps_.getMaps(this.filterMapOwner, this.filterCategoryId)
        .then(function(mymaps) {
          if (goog.isNull(mymaps)) {
            this.askToConnect();
          } else if (!goog.array.isEmpty(mymaps) || this.appUserManager_.getMymapsAdmin()) {
            this.choosing = true;
            this.maps = mymaps;
          } else {
            this.notify_(this.gettextCatalog.getString(
                'You have no existing Maps, please create a New Map'
                ), app.NotifyNotificationType.WARNING);
          }
        }.bind(this));
    }.bind(this));
  }
};


/**
 * Opens Create Map Dialog
 * @export
 */
app.MymapsDirectiveController.prototype.openCreateMapModal = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.modal = 'CREATE';
    this.newTitle = this.gettextCatalog.getString('Map without Title');
    this.newDescription = '';
    this.newCategoryId = null;
    this.newIsPublic = false;
  }
};


/**
 *  Open the modification modal
 * @export
 */
app.MymapsDirectiveController.prototype.openModifyMapModal = function() {
  if (this.appMymaps_.isEditable()) {
    this.newTitle = this.appMymaps_.mapTitle;
    this.newDescription = this.appMymaps_.mapDescription;
    this.newCategoryId = this.appMymaps_.mapCategoryId;
    this.newIsPublic = this.appMymaps_.mapIsPublic;
    this.modal = 'MODIFY';
  }
};


/**
 * @return {boolean} Returns whether the map is public or not.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapIsPublic = function() {
  return this.appMymaps_.mapIsPublic;
};


/**
 * Creates and load a new map.
 * @export
 */
app.MymapsDirectiveController.prototype.createMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.createMap(
        this.newTitle,
        this.newDescription,
        this.newCategoryId,
        this.newIsPublic
    )
      .then(goog.bind(function(resp) {
        this.modal = 'CREATE';
        if (goog.isNull(resp)) {
          this.askToConnect();
        } else {
          var mapId = resp['uuid'];
          if (goog.isDef(mapId)) {
            var map = {'uuid': mapId};
            this.appMymaps_.setMapId(mapId);
            this.saveLayers();
            this.onChosen(map, false);
            var msg = this.gettextCatalog.getString('Nouvelle carte créée');
            this.notify_(msg, app.NotifyNotificationType.INFO);
            this.modal = undefined;
          }
        }
      }, this));
  }
};


/**
 * Delete a map.
 * @param {string} mapId The map id to delete.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteAMap = function(mapId) {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    if (this.appMymaps_.getMapId() === mapId) {
      this.closeMap();
    }
    this.appMymaps_.deleteAMap(mapId).then(goog.bind(function(resp) {
      if (goog.isNull(resp)) {
        this.askToConnect();
      } else {
        goog.array.remove(this.maps,
            goog.array.find(this.maps, goog.bind(function(item) {
              if (item['uuid'] === mapId) {
                return true;
              }
            }, this)));
      }
    }, this));
  }
};


/**
 * Delete the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteMap = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    } else {
      this.appMymaps_.deleteMap().then(goog.bind(function(resp) {
        if (goog.isNull(resp)) {
          this.askToConnect();
        } else {
          this.closeMap();
        }
      }, this));
    }
  }
};


/**
 * Delete the objetcs belonging to the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteMymapsObjects = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    } else {
      this.appMymaps_.deleteMapFeatures().then(goog.bind(function(resp) {
        if (goog.isNull(resp)) {
          this.askToConnect();
        } else {
          this.drawnFeatures_.removeMymapsFeatures();
          this.selectedFeatures_.clear();
        }
      }, this));
    }
  }
};


/**
 * Notify the user he has to connect
 * @export
 */
app.MymapsDirectiveController.prototype.askToConnect = function() {
  var msg = this.gettextCatalog.getString(
      'Veuillez vous identifier afin d\'accéder à vos cartes'
      );
  this.notify_(msg, app.NotifyNotificationType.INFO);
  this['useropen'] = true;
};


/**
 * Called when a map is choosen.
 * @param {Object} map The selected map.
 * @param {boolean} clear It removes the alreay selected layers.
 * @return {angular.$q.Promise} Promise.
 * @export
 */
app.MymapsDirectiveController.prototype.onChosen = function(map, clear) {
  this.closeMap();
  if (clear) {
    this.map_.getLayers().clear();
  }
  var promise = this.appMymaps_.setCurrentMapId(map['uuid'],
      this.drawnFeatures_.getCollection());
  this['drawopen'] = true;
  this.choosing = false;
  return promise;
};


/**
 * Called when a map is choosen.
 * @param {Object} map The selected map.
 * @export
 */
app.MymapsDirectiveController.prototype.selectMymaps = function(map) {
  this.onChosen(map, true).then(function() {
    var extent = undefined;
    this.drawnFeatures_.getCollection().forEach(function(feature) {
      if (feature.get('__map_id__')) {
        if (goog.isDef(extent)) {
          extent = ol.extent.extend(extent, feature.getGeometry().getExtent());
        } else {
          extent = feature.getGeometry().getExtent();
        }
      }
    }, this);
    if (goog.isDef(extent)) {
      var viewSize = /** {ol.Size} **/ (this.map_.getSize());
      goog.asserts.assert(goog.isDef(viewSize));
      this.map_.getView().fit(extent, {
        size: viewSize
      });
    }
  }.bind(this));
};


/**
 * Is the map editable.
 * @return {boolean} True if the map is editable.
 * @export
 */
app.MymapsDirectiveController.prototype.isEditable = function() {
  return this.appMymaps_.isEditable();
};


/**
 * Saves the modifications made using the modification modal.
 * @export
 */
app.MymapsDirectiveController.prototype.saveModifications = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    } else {
      this.appMymaps_.updateMap(
          this.newTitle,
          this.newDescription,
          this.newCategoryId,
          this.newIsPublic
      )
        .then(
          goog.bind(function(mymaps) {
            if (goog.isNull(mymaps)) {
              this.askToConnect();
            } else {
              this.modal = undefined;
            }
          }, this));
    }
  }
};


/**
 * Return feature type as a string
 * @param {ol.Feature} feature The feature.
 * @return {string} The type as a string.
 * @export
 */
app.MymapsDirectiveController.prototype.getFeatureType = function(feature) {
  return feature.getGeometry().getType();
};


/**
 * Get a features Array with the Mymaps features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
app.MymapsDirectiveController.prototype.getMymapsFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return !!feature.get('__map_id__');
  });
};


/**
 * Get a features Array with the anonymous features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
app.MymapsDirectiveController.prototype.getAnonymousFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return !feature.get('__map_id__');
  });
};


/**
 * Selects feature.
 * @param {ol.Feature} feature The Feature.
 * @export
 */
app.MymapsDirectiveController.prototype.toggleFeatureSelection = function(feature) {
  if (this.selectedFeaturesList.indexOf(feature) === -1) {
    this.selectedFeatures_.clear();
    this.selectedFeatures_.push(feature);
    if (!this.isDocked()) {
      this.appFeaturePopup_.show(feature, this.map_);
    }
  } else {
    this.selectedFeatures_.clear();
  }
};


/**
 * @param {string} doc The document to export/download.
 * @param {string} format The document format.
 * @param {string} filename File name for the exported document.
 * @private
 */
app.MymapsDirectiveController.prototype.exportFeatures_ = function(doc, format,
  filename) {
  var formatInput = $('<input>').attr({
    type: 'hidden',
    name: 'format',
    value: format
  });
  var nameInput = $('<input>').attr({
    type: 'hidden',
    name: 'name',
    value: filename
  });
  var docInput = $('<input>').attr({
    type: 'hidden',
    name: 'doc',
    value: doc
  });
  var form = $('<form>').attr({
    method: 'POST',
    action: this.exportgpxkmlUrl_
  });
  form.append(formatInput, nameInput, docInput);
  angular.element(this.$document_[0].body).append(form);
  form[0].submit();
  form.remove();
};


/**
 * Open the share link.
 * @export
 */
app.MymapsDirectiveController.prototype.shareMymapsLink = function() {
  this['shareMymapsChecked'] = true;
  this['shareShowLongUrl'] = true;
  this['shareopen'] = true;
};


/**
 * @return {boolean} True if the popup is docked.
 * @export
 */
app.MymapsDirectiveController.prototype.isDocked = function() {
  return this.appFeaturePopup_.isDocked;
};


/**
 * @param {ol.Extent} extent The extent to fit to.
 */
app.MymapsDirectiveController.prototype.fit = function(extent) {
  var viewSize = /** {ol.Size} **/ (this.map_.getSize());
  goog.asserts.assert(goog.isDef(viewSize));
  this.map_.getView().fit(extent, {
    size: viewSize
  });
};


/**
 * Update the map and save the new feature order.
 * @param {angular.JQLite} feature The feature.
 * @param {Array} array The array.
 * @export
 */
app.MymapsDirectiveController.prototype.afterReorder = function(feature, array) {
  this.drawnFeatures_.computeOrder();
};

app.module.controller('AppMymapsController', app.MymapsDirectiveController);

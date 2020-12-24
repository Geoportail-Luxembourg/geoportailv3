/**
 * @module app.mymaps.MymapsController
 */
/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */


import appModule from '../module.js';
import appMiscFile from '../misc/file.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';
import {extend} from 'ol/extent.js';
import olFormatGPX from 'ol/format/GPX.js';
import olFormatKML from 'ol/format/KML.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomLineString from 'ol/geom/LineString.js';
import * as olExtent from 'ol/extent.js';

/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.$compile} $compile The compile provider.
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.draw.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Theme} appTheme the current theme service.
 * @param {app.UserManager} appUserManager
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {Document} $document Document.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @param {app.Export} appExport The export service.
 * @param {ngeo.offline.Mode} ngeoOfflineMode The offline mode.
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo network status service.
 * @constructor
 * @export
 * @ngInject
 */

const exports = function($scope, $compile, $sce,
    gettextCatalog, ngeoBackgroundLayerMgr, appMymaps, appNotify,
    appFeaturePopup, appSelectedFeatures, appTheme, appUserManager,
    appDrawnFeatures, $document, exportgpxkmlUrl, appExport, ngeoOfflineMode,
    ngeoNetworkStatus) {

  /**
   * @export
   * @type {ngeo.offline.Mode}
   */
  this.ngeoOfflineMode = ngeoOfflineMode;

  /**
   * @export
   * @type {ngeo.offline.NetworkStatus}
   */
  this.ngeoNetworkStatus = ngeoNetworkStatus;

  /**
   * @export
   * @type {Array<ol.Feature>}
   */
  this.selectedLineString = [];

  /**
   * @export
   * @type {string}
   */
  this.newLineName = '';

  /**
   * @export
   * @type {string}
   */
  this.newLineDesc = '';

  /**
   * @type {angular.$sce}
   * @private
   */
  this.sce_ = $sce;

  /**
   * @type {app.draw.FeaturePopup}
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
   * @type {ngeo.map.BackgroundLayerMgr}
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
  this.kmlFormat_ = new olFormatKML();

  /**
   * @private
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new olFormatGPX();

  /**
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.featuresList = appDrawnFeatures.getArray();
  this.map.addLayer(appDrawnFeatures.getLayer());

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
   * Tells whether the 'mergin lines' modal window is open or not.
   * @type {boolean}
   * @export
   */
  this.mergingLines = false;

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
   * Open or Close the confirmation dialog box.
   * @type {boolean}
   * @export
   */
  this.confirmDeleteSelectedMap = false;

  /**
   * Id of the map to delete.
   * @type {string | undefined}
   * @export
   */
  this.requestedMapIdToDelete = undefined;

  /**
   * Title of the map to delete
   * @type {string | undefined}
   * @export
   */
  this.requestedMapTitle = undefined;

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

  $scope.$watch(function() {
    return this.filterMapOwner;
  }.bind(this), function(newVal, oldVal) {
    if (newVal !== oldVal) {
      this.appMymaps_.getMaps(this.filterMapOwner, this.filterCategoryId).then(function(mymaps) {
        this.choosing = true;
        this.maps = mymaps;
        this.setDragHandler();
      }.bind(this));
    }
  }.bind(this));

  $scope.$watch(function() {
    return this.filterCategoryId;
  }.bind(this), function(newVal, oldVal) {
    if (newVal !== oldVal) {
      this.appMymaps_.getMaps(this.filterMapOwner, this.filterCategoryId).then(function(mymaps) {
        this.choosing = true;
        this.maps = mymaps;
        this.filterMapOwner = null;
        this.setDragHandler();
      }.bind(this));
    }
  }.bind(this));

  $scope.$watch(function() {
    return this.appUserManager_.getRoleId();
  }.bind(this), function(newVal, oldVal) {
    if (newVal !== undefined && newVal !== null) {
      this.appMymaps_.loadCategories();
    }
  }.bind(this));

  $scope.$watch(function() {
    return this.kmlFileContent;
  }.bind(this), function(newVal, oldVal) {
    if (newVal) {
      this.importKml();
      $('#dropdown-mymaps').removeClass('open');
    }
  }.bind(this));

  $scope.$watch(function() {
    return this.kmzFileContent;
  }.bind(this), function(newVal, oldVal) {
    if (newVal) {
      this.importKmz();
      $('#dropdown-mymaps').removeClass('open');
    }
  }.bind(this));

  $scope.$watch(function() {
    return this.gpxFileContent;
  }.bind(this), function(newVal, oldVal) {
    if (newVal) {
      this.importGpx();
      $('#dropdown-mymaps').removeClass('open');
    }
  }.bind(this));

  // Reopen active map when going offline
  $scope.$watch(
    () => ngeoOfflineMode.isEnabled(),
    (newVal, oldVal) => {
      if (newVal && this.appMymaps_.getMapId()) {
        this.onChosen_({
          'uuid': this.appMymaps_.getMapId()
        });
      }
    }
  );
};


/**
 * Returns if the map is in the clip line mode.
 * @return {boolean} Returns true if clip line mode.
 * @export
 */
exports.prototype.isClipLineMode = function() {
  return this.drawnFeatures_.clipLineInteraction.getActive();
};


/**
 * @export
 */
exports.prototype.toggleClippingLineMode = function() {
  var clippingLineMode = !this.drawnFeatures_.clipLineInteraction.getActive();
  this.drawnFeatures_.clipLineInteraction.setActive(clippingLineMode);
  if (clippingLineMode) {
    var msg = this.gettextCatalog.getString('Vous êtes en mode découpage.<br> Veuillez cliquer sur une ligne pour la couper en deux.');
    this.notify_(msg, appNotifyNotificationType.INFO);
    this.drawnFeatures_.clipLineInteraction.setActive(true);
    this.drawnFeatures_.selectInteraction.setActive(false);
    this.selectedFeatures_.clear();
  } else {
    this.drawnFeatures_.clipLineInteraction.setActive(false);
    this.drawnFeatures_.selectInteraction.setActive(true);
  }
  this.drawnFeatures_.clearEditMode();
  this.drawnFeatures_.modifyInteraction.setActive(false);
  this.drawnFeatures_.modifyCircleInteraction.setActive(false);
  this.drawnFeatures_.translateInteraction.setActive(false);
};


/**
 * Reset the layers & bglayer with the one of Mymaps.
 * @export
 */
exports.prototype.resetLayers = function() {
  this.selectedLayers_.length = 0;
  this.appMymaps_.updateLayers();
};


/**
 * returns a trusted html content
 * @param {string} content content to be trusted
 * @return {*} the trusted content.
 * @export
 */
exports.prototype.trustAsHtml = function(content) {
  return this.sce_.trustAsHtml('' + content);
};


/**
 * Save the current layers definition into Mymaps.
 * @return {angular.$q.Promise} Promise.
 * @export
 */
exports.prototype.saveLayers = function() {
  var bgLayer = /** @type {string} */
      (this.backgroundLayerMgr_.get(this.map_).get('label'));
  var bgOpacity = '1';
  var layersLabels = [];
  var layersOpacities = [];
  var layersVisibilities = [];
  var layersIndices = [];
  this.selectedLayers_.forEach(function(item, index) {
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
  .then(function() {
    this.appMymaps_.loadMapInformation();
  }.bind(this));
  this['layersChanged'] = false;
  return promise;
};


/**
 * @param {boolean|undefined} value The value.
 * @return {boolean|undefined} false or true.
 * @export
 */
exports.prototype.modalShownHidden = function(value) {
  if (value !== undefined && value === false) {
    this.modal = undefined;
    return false;
  } else if (this.modal !== undefined) {
    this.setDragHandler();
    return true;
  }
};


/**
 * Copy the map.
 * @export
 */
exports.prototype.openCopyMapModal = function() {
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
exports.prototype.copyMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.copyMap(
        this.newTitle,
        this.newDescription,
        this.newCategoryId,
        this.newIsPublic
    ).then(function(resp) {
      if (resp === null) {
        this.askToConnect();
      } else {
        var mapId = resp['uuid'];
        if (mapId !== undefined) {
          var map = {'uuid': mapId};
          this.onChosen_(map);
          var msg = this.gettextCatalog.getString('Carte copiée');
          this.notify_(msg, appNotifyNotificationType.INFO);
          this.modal = undefined;
        }
      }
    }.bind(this));
  }
};


/**
 * Export a Gpx file.
 * @param {boolean} isTrack True if gpx should export tracks instead of routes.
 * @export
 */
exports.prototype.exportGpx = function(isTrack) {

  var features = this.drawnFeatures_.getCollection();
  var mymapsFeatures = features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });
  this.appExport_.exportGpx(mymapsFeatures, this.appMymaps_.mapTitle, isTrack);
};

/**
 * Import the features into mymaps.
 * @param {Array} features The features to import.
 * @private
 */
exports.prototype.importFeatures_ = function(features) {
  var mapId = this.appMymaps_.getMapId();
  var featuresToSave = [];
  var badfeatures = [];
  var noNameElemCnt = 0;
  var curExtent;
  features.forEach(function(feature) {
    this.sanitizeFeature_(feature);
    feature.set('__map_id__', mapId);

    if (feature.get('name') === undefined) {
      feature.set('name', 'Element ' + noNameElemCnt);
      noNameElemCnt++;
    }
    var curGeometry = feature.getGeometry();
    if (curGeometry !== null) {
      feature.setStyle(this.featureStyleFunction_);
      if (curGeometry.getType() === olGeomGeometryType.MULTI_POLYGON) {
        var polygones = /** @type {ol.geom.MultiPolygon} */
          (curGeometry).getPolygons();
        polygones.forEach(function(polygon) {
          var clonedFeature = feature.clone();
          clonedFeature.setGeometry(polygon);
          featuresToSave.push(clonedFeature);
        });
      } else if (curGeometry.getType() === olGeomGeometryType.MULTI_LINE_STRING) {
        var lines = /** @type {ol.geom.MultiLineString} */
          (curGeometry).getLineStrings();
        lines.forEach(function(line) {
          var clonedFeature = feature.clone();
          clonedFeature.setGeometry(line);
          featuresToSave.push(clonedFeature);
        });
      } else {
        featuresToSave.push(feature);
      }
      if (curExtent) {
        olExtent.extend(curExtent, curGeometry.getExtent());
      } else {
        curExtent = curGeometry.getExtent();
      }
    } else {
      badfeatures.push(feature);
    }
  }, this);
  badfeatures.forEach(function(feature) {
    var index = features.indexOf(feature);
    if (index > -1) {
      features.splice(index, 1);
    }
  }, this);

    if (curExtent) {
      this.fit(curExtent);
    }

  this.appMymaps_.saveFeatures(featuresToSave).then(
      function() {
        var map = {'uuid': mapId};
        this.onChosen_(map);
      }.bind(this)
  );
};

/**
 * Import a GPX file.
 * @export
 */
exports.prototype.importGpx = function() {
  var gpxFeatures = (this.gpxFormat_.readFeatures(this.gpxFileContent, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  }));
  this.gpxFileContent = '';
  this.importFeatures_(gpxFeatures);
};

/**
 * Export a KML file.
 * @export
 */
exports.prototype.exportKml = function() {
  var features = this.drawnFeatures_.getCollection();
  var mymapsFeatures = features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });
  var kml = this.kmlFormat_.writeFeatures(mymapsFeatures, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      appMiscFile.sanitizeFilename(this.appMymaps_.mapTitle));
};


/**
 * Import a KML file.
 * @param {string=} kml The kml as text.
 * @export
 */
exports.prototype.importKml = function(kml) {
  if (kml === undefined) {
    kml = this.kmlFileContent;
  }
  var kmlFeatures = (this.kmlFormat_.readFeatures(kml, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  }));
  this.kmlFileContent = '';
  this.importFeatures_(kmlFeatures);
};


/**
 * Verify each feature property type and value.
 * Remove unwanted properties.
 * @param {ol.Feature} feature The feature.
 * @private
 */
exports.prototype.sanitizeFeature_ = function(feature) {

  if (feature.getId()) {
    feature.setId(undefined);
  }
  if (feature.get('fid') !== undefined) {
    feature.unset('fid', true);
  }
  if (feature.get('__editable__') !== undefined) {
    feature.unset('__editable__', true);
  }
  if (feature.get('__map_id__') !== undefined) {
    feature.unset('__map_id__', true);
  }
  if (feature.get('__refreshProfile__') !== undefined) {
    feature.unset('__refreshProfile__', true);
  }
  if (feature.get('__saving__') !== undefined) {
    feature.unset('__saving__', true);
  }
  if (feature.get('__selected__') !== undefined) {
    feature.unset('__selected__', true);
  }
  if (feature.get('__selected__') !== undefined) {
    feature.unset('__selected__', true);
  }

  var color = /** @type {string} */ (feature.get('color'));
  if (color === undefined) {
    feature.set('color', '#FF0000');
  }
  var opacity = /** @type {string} */ (feature.get('opacity'));
  if (opacity === undefined) {
    opacity = 0.2;
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
exports.prototype.importKmz = function() {
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
exports.prototype.closeMap = function() {
  this.drawnFeatures_.clearMymapsFeatures();
  this.selectedFeatures_.clear();
  this['layersChanged'] = false;
  this.appFeaturePopup_.hide();
};


/**
 * Open the confirmation dialog box.
 * @export
 */
exports.prototype.openConfirmDelete = function() {
  this.setDragHandler();
  this.confirmDelete = true;
};


/**
 * Open the confirmation dialog box.
 * @export
 */
exports.prototype.openConfirmDeleteObjects = function() {
  this.setDragHandler();
  this.confirmDeleteObjects = true;
};


/**
 * Open the delete map confirmation dialog box.
 * @export
 */
exports.prototype.openConfirmDeleteMap = function() {
  this.confirmDeleteMap = true;
};

/**
 * Open the "delete a map" confirmation dialog box.
 * @param {string} mapId The map id to ask for deleting.
 * @param {string} mapTitle The map title to ask for deleting.
 * @export
 */
exports.prototype.openConfirmDeleteAMap = function(mapId, mapTitle) {
  this.confirmDeleteSelectedMap = true;
  this.requestedMapIdToDelete = mapId;
  this.requestedMapTitle = mapTitle;
  this.choosing = false;
  this.setDragHandler();
};

/**
 * Call the map synchronisation when in offline state.
 * @param {Object} map The selected map.
 * @export
 */
exports.prototype.syncOfflineMaps = function(map) {
  this.appMymaps_.syncOfflineMaps(map);
};

/**
 * Closes the current anonymous drawing.
 * @export
 */
exports.prototype.closeAnonymous = function() {
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
exports.prototype.openNewMapFromAnonymous = function() {
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
exports.prototype.addInMymaps = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    if (this.isMymapsSelected()) {
      this.drawnFeatures_.moveAnonymousFeaturesToMymaps().then(
          function(mapinformation) {
            var mapId = this.appMymaps_.getMapId();
            var map = {'uuid': mapId};
            this.onChosen_(map);
          }.bind(this));
    }
  }
};


/**
 * Create a map from an anonymous drawing.
 * @export
 */
exports.prototype.createMapFromAnonymous = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.createMap(this.newTitle, this.newDescription,
        this.newCategoryId, this.newIsPublic)
        .then(function(resp) {
          if (resp === null) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (mapId !== undefined) {
              this['drawopen'] = true;
              this.appMymaps_.setMapId(mapId);
              return this.saveLayers();
            }
          }
        }.bind(this))
        .then(function(mapinformation) {
          return this.drawnFeatures_.moveAnonymousFeaturesToMymaps();
        }.bind(this))
        .then(function(mapinformation) {
          var map = {'uuid': this.appMymaps_.getMapId()};
          this.onChosen_(map);
          var msg = this.gettextCatalog.getString('Carte créée');
          this.notify_(msg, appNotifyNotificationType.INFO);
          this.modal = undefined;
        }.bind(this));
  }
};


/**
 * Returns if a mymaps is selected or not.
 * @return {boolean} Returns true if a mymaps is selected.
 * @export
 */
exports.prototype.isMymapsSelected = function() {
  return this.appMymaps_.isMymapsSelected();
};


/**
 * @return {string} Returns the description.
 * @export
 */
exports.prototype.getMapDescription = function() {
  return this.appMymaps_.mapDescription;
};


/**
 * @return {string} Returns the title.
 * @export
 */
exports.prototype.getMapTitle = function() {
  return this.appMymaps_.mapTitle;
};


/**
 * @return {string} Returns the map owner.
 * @export
 */
exports.prototype.getMapOwner = function() {
  return this.appMymaps_.mapOwner;
};


/**
 * @param {?string} username The username.
 * @return {string} The category name.
 * @export
 */
exports.prototype.getUserCategDesc = function(username) {
  if (username !== undefined && username !== null && username.length > 0) {
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
exports.prototype.getMapCategoryFilter = function(id) {
  var category = this.appMymaps_.getCategory(id);
  if (category !== undefined && category !== null) {
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
exports.prototype.getMapCategory = function(id) {
  var category = this.appMymaps_.getCategory(id);
  if (category !== undefined && category !== null) {
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
exports.prototype.getCategories = function() {
  return this.appMymaps_.categories;
};


/**
 * @return {Object} The the filtered categories object.
 * @export
 */
exports.prototype.getFilteredCategories = function() {
  var categories = [];
  if (!(this.filterMapOwner !== undefined && this.filterMapOwner !== null)) {
    //All the categories of all user with at least one map
    categories = this.usersCategories;
  } else {
    var userCateg = this.usersCategories.find(function(item, i) {
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
    return this.appMymaps_.allcategories.filter(function(category, i) {
      var elem = categories.find(function(userCategory, i) {
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
exports.prototype.getUsersCategories = function() {
  return this.usersCategories;
};


/**
 * @return {Object} The user_categories object.
 * @export
 */
exports.prototype.getFilteredUsersCategories = function() {
  if (this.filterCategoryId === null) {
    return this.usersCategories;
  }
  return this.usersCategories.filter(function(item, i) {
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
exports.prototype.openChooseMapModal = function() {
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
          if (mymaps === null) {
            this.askToConnect();
          } else if (mymaps.length !== 0 || this.appUserManager_.getMymapsAdmin()) {
            this.choosing = true;
            this.maps = mymaps;
            this.setDragHandler();
          } else {
            this.notify_(this.gettextCatalog.getString(
                'You have no existing Maps, please create a New Map'
                ), appNotifyNotificationType.WARNING);
          }
        }.bind(this));
    }.bind(this));
  }
};


/**
 * Opens Create Map Dialog
 * @export
 */
exports.prototype.openCreateMapModal = function() {
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
 * Open the merge lines modal panel.
 * @export
 */
exports.prototype.openMergeLinesModal = function() {
  if (this.getMymapsLinestringFeatures().length > 1) {
    this.selectedLineString.length = 0;
    this.newLineName = this.gettextCatalog.getString('Nouvelle ligne');

    this.newLineDesc = '';
    this.mergingLines = true;
    this.drawnFeatures_.clearEditMode();
  } else {
    var msg = this.gettextCatalog.getString('Il faut au moins 2 lignes disponibles pour pouvoir les fusionner.');
    this.notify_(msg, appNotifyNotificationType.INFO);
  }
  this.setDragHandler();
};


/**
 *  Open the modification modal
 * @export
 */
exports.prototype.openModifyMapModal = function() {
  if (this.map_.get('ol3dm').is3dEnabled()) {
    return;
  }
  if (this.appMymaps_.isEditable()) {
    this.newTitle = this.appMymaps_.mapTitle;
    this.newDescription = this.appMymaps_.mapDescription;
    this.newCategoryId = this.appMymaps_.mapCategoryId;
    this.newIsPublic = this.appMymaps_.mapIsPublic;
    this.modal = 'MODIFY';
  }
  this.setDragHandler();
};


/**
 * @return {boolean} Returns whether the map is public or not.
 * @export
 */
exports.prototype.getMapIsPublic = function() {
  return this.appMymaps_.mapIsPublic;
};


/**
 * Creates and load a new map.
 * @export
 */
exports.prototype.createMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.createMap(
        this.newTitle,
        this.newDescription,
        this.newCategoryId,
        this.newIsPublic
    )
      .then(function(resp) {
        this.modal = 'CREATE';
        if (resp === null) {
          this.askToConnect();
        } else {
          var mapId = resp['uuid'];
          if (mapId !== undefined) {
            var map = {'uuid': mapId};
            this.appMymaps_.setMapId(mapId);
            this.saveLayers();
            this.onChosen_(map);
            var msg = this.gettextCatalog.getString('Nouvelle carte créée');
            this.notify_(msg, appNotifyNotificationType.INFO);
            this.modal = undefined;
          }
        }
      }.bind(this));
  }
};


/**
 * Delete a map.
 * @param {string} mapId The map id to delete.
 * @export
 */
exports.prototype.deleteAMap = function(mapId) {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    if (this.appMymaps_.getMapId() === mapId) {
      this.closeMap();
    }
    this.appMymaps_.deleteAMap(mapId).then(function(resp) {
      if (resp === null) {
        this.askToConnect();
      } else {
        this.choosing = true;
        this.setDragHandler();
        this.requestedMapTitle = undefined;
        this.requestedMapIdToDelete = undefined;
        if (!this.ngeoOfflineMode.isEnabled()) {
          var curElem = this.maps.find(function(item) {
            if (item['uuid'] === mapId) {
              return true;
            }
          }.bind(this));
          if (curElem !== undefined) {
            this.maps.splice(this.maps.indexOf(curElem), 1);
          }
        }
      }
    }.bind(this));
  }
};


/**
 * Delete the current map.
 * @export
 */
exports.prototype.deleteMap = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    } else {
      this.appMymaps_.deleteMap().then(function(resp) {
        if (resp === null) {
          this.askToConnect();
        } else {
          this.closeMap();
        }
      }.bind(this));
    }
  }
};


/**
 * Delete the objetcs belonging to the current map.
 * @export
 */
exports.prototype.deleteMymapsObjects = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    } else {
      this.appMymaps_.deleteMapFeatures().then(function(resp) {
        if (resp === null) {
          this.askToConnect();
        } else {
          this.drawnFeatures_.removeMymapsFeatures();
          this.selectedFeatures_.clear();
        }
      }.bind(this));
    }
  }
};


/**
 * Notify the user he has to connect
 * @export
 */
exports.prototype.askToConnect = function() {
  var msg = this.gettextCatalog.getString(
      'Veuillez vous identifier afin d\'accéder à vos cartes'
      );
  this.notify_(msg, appNotifyNotificationType.INFO);
  this['useropen'] = true;
};


/**
 * Called when a map is choosen.
 * @param {Object} map The selected map.
 * @return {angular.$q.Promise} Promise.
 * @private
 */
exports.prototype.onChosen_ = function(map) {
  this.closeMap();
  var promise = this.appMymaps_.setCurrentMapId(map['uuid'],
      this.drawnFeatures_.getCollection()).then(function() {
        var layer = this.drawnFeatures_.getLayer();
        if (this.map_.getLayers().getArray().indexOf(layer) === -1) {
          this.map_.addLayer(layer);
        }
      }.bind(this));
  this['drawopen'] = true;
  this.choosing = false;
  return promise;
};


/**
 * Called when a map is choosen.
 * @param {Object} map The selected map.
 * @export
 */
exports.prototype.selectMymaps = function(map) {
  if (map['deletedWhileOffline']) {
    return;
  }
  this.onChosen_(map).then(function() {
    var extent = undefined;
    var layer = this.drawnFeatures_.getLayer();
    if (this.map_.getLayers().getArray().indexOf(layer) === -1) {
      this.map_.addLayer(layer);
    }
    this.drawnFeatures_.getCollection().forEach(function(feature) {
      if (feature.get('__map_id__')) {
        if (extent !== undefined) {
          extent = extend(extent, feature.getGeometry().getExtent());
        } else {
          extent = feature.getGeometry().getExtent();
        }
      }
    }, this);
    if (extent !== undefined) {
      var viewSize = /** {ol.Size} **/ (this.map_.getSize());
      console.assert(viewSize !== undefined);
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
exports.prototype.isEditable = function() {
  return this.appMymaps_.isEditable();
};


/**
 * Saves the modifications made using the modification modal.
 * @export
 */
exports.prototype.saveModifications = function() {
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
        .then(function(mymaps) {
          if (mymaps === null) {
            this.askToConnect();
          } else {
            this.modal = undefined;
          }
        }.bind(this));
    }
  }
};


/**
 * Return feature type as a string
 * @param {ol.Feature} feature The feature.
 * @return {string} The type as a string.
 * @export
 */
exports.prototype.getFeatureType = function(feature) {
  return feature.getGeometry().getType();
};


/**
 * Get a features Array with the Mymaps features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
exports.prototype.getMymapsFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return !!feature.get('__map_id__');
  });
};

/**
 * Get a features Array with the Mymaps linestring features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
exports.prototype.getMymapsLinestringFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return (feature.getGeometry().getType() === 'LineString');
  });
};


/**
 * Get a features Array with the anonymous features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
exports.prototype.getAnonymousFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return !feature.get('__map_id__');
  });
};

/**
 * Selects feature.
 * @param {ol.Feature} feature The Feature.
 * @export
 */
exports.prototype.toggleLinestring = function(feature) {
  var position = this.selectedLineString.indexOf(feature);
  if (position === -1) {
    this.selectedLineString.push(feature);
  } else {
    this.selectedLineString.splice(position, 1);
  }
};

/**
 * Merge the selected features.
 * @export
 */
exports.prototype.mergesSelectedLineString = function() {
  if (this.selectedLineString.length > 0) {
    var firstFeature = this.selectedLineString[0];
    this.selectedLineString.splice(0, 1);
    var builtGeom =  /** @type {ol.geom.LineString} */(firstFeature.getGeometry());

    while (this.selectedLineString.length > 0) {
      var firstCoordFirstGeom = builtGeom.getFirstCoordinate();
      var lastCoordFirstGeom = builtGeom.getLastCoordinate();
      var prevLength = undefined;
      var idxCanditate = -1;
      var exchange = false;
      var reverseLine = false;
      for (var i = 0; i < this.selectedLineString.length; i++) {
        var curFeature = this.selectedLineString[i];
        var curGeom =  /** @type {ol.geom.LineString} */(curFeature.getGeometry());
        var firstCoordCurGeom = curGeom.getFirstCoordinate();
        var lastCoordCurGeom = curGeom.getLastCoordinate();
        var line1 = new olGeomLineString([firstCoordFirstGeom, firstCoordCurGeom]);
        var line4 = new olGeomLineString([lastCoordFirstGeom, lastCoordCurGeom]);

        var line2 = new olGeomLineString([lastCoordFirstGeom, firstCoordCurGeom]);
        var line3 = new olGeomLineString([firstCoordFirstGeom, lastCoordCurGeom]);

        var lengthLine1 = line1.getLength();
        var lengthLine2 = line2.getLength();
        var lengthLine3 = line3.getLength();
        var lengthLine4 = line4.getLength();

        if (lengthLine1 < lengthLine2 &&
            lengthLine1 < lengthLine3 &&
            lengthLine1 < lengthLine4) {
          if (prevLength === undefined || lengthLine1 < prevLength) {
            prevLength = lengthLine1;
            idxCanditate = i;
            exchange = true;
            reverseLine = true;
          }
        } else if (lengthLine4 < lengthLine1 &&
            lengthLine4 < lengthLine2 &&
            lengthLine4 < lengthLine3) {
          if (prevLength === undefined || lengthLine4 < prevLength) {
            prevLength = lengthLine4;
            idxCanditate = i;
            exchange = false;
            reverseLine = true;
          }
        } else if (lengthLine2 < lengthLine1 &&
            lengthLine2 < lengthLine3 &&
            lengthLine2 < lengthLine4) {
          if (prevLength === undefined || lengthLine2 < prevLength) {
            prevLength = lengthLine2;
            idxCanditate = i;
            exchange = false;
            reverseLine = false;
          }
        } else {
          if (prevLength === undefined || lengthLine3 < prevLength) {
            prevLength = lengthLine3;
            idxCanditate = i;
            exchange = true;
            reverseLine = false;
          }
        }
      }
      var candidateFeature = this.selectedLineString[idxCanditate];
      this.drawnFeatures_.remove(candidateFeature);
      this.selectedLineString.splice(idxCanditate, 1);
      var candidateGeom = /** @type {ol.geom.LineString} */(candidateFeature.getGeometry());
      if (reverseLine) {
        candidateGeom = new olGeomLineString(candidateGeom.getCoordinates().reverse());
      }
      if (exchange) {
        builtGeom.setCoordinates(candidateGeom.getCoordinates().concat(/** @type {ol.geom.LineString} */(builtGeom).getCoordinates()));
      } else {
        builtGeom.setCoordinates(builtGeom.getCoordinates().concat(/** @type {ol.geom.LineString} */(candidateGeom).getCoordinates()));
      }
    }

    firstFeature.set('name', this.newLineName);
    firstFeature.set('description', this.newLineDesc);
    this.selectedFeatures_.clear();
    this.drawnFeatures_.saveFeature(firstFeature);
    this.selectedFeatures_.push(firstFeature);
  }
};


/**
 * Selects feature.
 * @param {ol.Feature} feature The Feature.
 * @export
 */
exports.prototype.toggleFeatureSelection = function(feature) {
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
exports.prototype.exportFeatures_ = function(doc, format,
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
exports.prototype.shareMymapsLink = function() {
  this['shareMymapsChecked'] = true;
  this['shareShowLongUrl'] = true;
  this['shareopen'] = true;
};


/**
 * @return {boolean} True if the popup is docked.
 * @export
 */
exports.prototype.isDocked = function() {
  return this.appFeaturePopup_.isDocked;
};


/**
 * @param {ol.Extent} extent The extent to fit to.
 */
exports.prototype.fit = function(extent) {
  var viewSize = /** {ol.Size} **/ (this.map_.getSize());
  console.assert(viewSize !== undefined);
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
exports.prototype.afterReorder = function(feature, array) {
  this.drawnFeatures_.computeOrder();
};


/**
 * Set the drag handle on element H4.
 * @export
 */
exports.prototype.setDragHandler = function() {
  $('.modal-dialog').draggable('option', 'handle', 'h4');
};

appModule.controller('AppMymapsController', exports);


export default exports;

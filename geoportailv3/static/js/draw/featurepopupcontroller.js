/**
 * @fileoverview Provides a feature popup directive.
 */
goog.module('app.draw.FeaturePopupController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const appMiscFile = goog.require('app.misc.file');
const olEvents = goog.require('ol.events');
const olExtent = goog.require('ol.extent');
const olProj = goog.require('ol.proj');
const olFormatKML = goog.require('ol.format.KML');
const olGeomCircle = goog.require('ol.geom.Circle');
const olGeomPoint = goog.require('ol.geom.Point');
const olGeomPolygon = goog.require('ol.geom.Polygon');
const olGeomLineString = goog.require('ol.geom.LineString');
const olGeomGeometryType = goog.require('ol.geom.GeometryType');
const olInteraction = goog.require('ol.interaction');
const ngeoInteractionMeasure = goog.require('ngeo.interaction.Measure');


/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {app.draw.FeaturePopup} appFeaturePopup The feature popup service.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo Network Status.
 * @param {string} mymapsImageUrl URL to "mymaps" Feature service.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @param {Document} $document Document.
 * @param {app.Export} appExport The export service.
 * @export
 * @ngInject
 */
exports = function($scope, $sce, appFeaturePopup,
    appDrawnFeatures, appMymaps, appSelectedFeatures, appUserManager,
    ngeoNetworkStatus, mymapsImageUrl, exportgpxkmlUrl, $document, appExport) {

  /**
   * @type {ngeo.offline.NetworkStatus}
   * @private
   */
  this.ngeoNetworkStatus_ = ngeoNetworkStatus;

  /**
   * @type {app.Export}
   * @private
   */
  this.appExport_ = appExport;

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
   * @type {string}
   */
  this.exportgpxkmlUrl_ = exportgpxkmlUrl;

  /**
   * @type {string}
   * @private
   */
  this.mymapsImageUrl_ = mymapsImageUrl;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;
  /**
   * @type {Object}
   * @export
   */
  this.image;

  /**
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ol.Feature}
   * @export
   */
  this.feature;

  /**
   * @type {!string|undefined}
   * @export
   */
  this.featureElevation = undefined;

  /**
   * @type {!Array<Object>|undefined}
   * @export
   */
  this.featureProfile = undefined;

  /**
   * Need object to make the profile directive work here
   * @type {{active: boolean}}
   * @export
   */
  this.showFeatureProfile = {active: false};

  /**
   * @type {angular.$sce}
   * @private
   */
  this.sce_ = $sce;

  /**
   * @type {boolean}
   * @export
   */
  this.editingAttributes = false;

  /**
   * @type {boolean}
   * @export
   */
  this.editCircleRadius = false;

  /**
   * @type {boolean}
   * @export
   */
  this.editingStyle = false;

  /**
   * @type {boolean}
   * @export
   */
  this.deletingFeature = false;

  /**
   * @type {boolean}
   * @export
   */
  this.askRadius = false;

  /**
   * @type {string}
   * @export
   */
  this.tempName = '';

  /**
   * @type {string}
   * @export
   */
  this.tempDesc = '';

  /**
   * @type {string}
   * @export
   */
  this.tempThumbnail = '';

  /**
   * @type {number}
   * @export
   */
  this.tempCircleRadius = 0;

  /**
   * @type {app.draw.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  this.appFeaturePopup_ = appFeaturePopup;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {ol.Map}
   * @export
   */
  this.map = this['map'] || this.appFeaturePopup_.map;

  this.unwatch1_ = $scope.$watch(function() {
    return this.editingAttributes;
  }.bind(this), function(newVal) {
    if (newVal) {
      this.initForm_();
    }
  }.bind(this));


  this.unwatch2_ = $scope.$watch(function() {
    return this.feature;
  }.bind(this), function(newVal, oldVal) {
    this.editingAttributes = false;
    this.editingStyle = false;
    this.deletingFeature = false;
    this.updateFeature_();
  }.bind(this));


  this.unwatch3_ = $scope.$watch(function() {
    return this.editingStyle;
  }.bind(this), function(newVal, oldVal) {
    if (this.feature !== undefined) {
      if (newVal) {
        this.feature.set('__selected__', false);
      } else {
        this.feature.set('__selected__', true);
      }
    }
    if (oldVal && !newVal) {
      this.updateFeature_();
    }
  }.bind(this));

  /**
   * @type {ol.EventsKey}
   * @private
   */
  this.event_ = olEvents.listen(this.drawnFeatures_.modifyInteraction,
      olInteraction.ModifyEventType.MODIFYEND, this.updateFeature_, this);

  this.unwatch4_ = $scope.$watch(function() {
    return this.image;
  }.bind(this), function() {
    if (this.image === undefined) {
      return;
    }
    this.tempThumbnail = this.image['thumbnail'];
    this.tempImage = this.image['image'];
  }.bind(this));

  this.unwatch5_ = $scope.$watch(function() {
    if (this.feature) {
      return this.feature.get('__refreshProfile__');
    }
    return false;
  }.bind(this), function(newVal, oldVal) {
    if (this.feature) {
      this.feature.set('__refreshProfile__', false);
      if (newVal) {
        this.updateFeature_();
      }
    }
  }.bind(this));

  $scope.$on('$destroy', function() {
    olEvents.unlistenByKey(this.event_);
    this.unwatch1_();
    this.unwatch2_();
    this.unwatch3_();
    this.unwatch4_();
    this.unwatch5_();
  }.bind(this));

};


/**
 * @param {number} radius The circle radius in meter.
 * @return {*} The radius.
 * @export
 */
exports.prototype.getSetCircleRadius = function(radius) {
  if (this.feature !== undefined &&
      this.feature.getGeometry().getType() === olGeomGeometryType.POLYGON &&
      this.isCircle()) {
    if (arguments.length === 0) {
      return this.getCircleRadius();
    } else {
      this.setCircleRadius(radius);
    }
  }
};


/**
 * Return not formatted radius.
 * @return {number} The radius.
 * @export
 */
exports.prototype.getCircleRadius = function() {
  if (this.feature !== undefined &&
      this.feature.getGeometry().getType() === olGeomGeometryType.POLYGON &&
      this.isCircle()) {
    var geom = /** @type {ol.geom.Polygon} **/ (this.feature.getGeometry());
    var center = olExtent.getCenter(geom.getExtent());
    var projection = this.map.getView().getProjection();
    var p1 = olProj.transform(center, projection, 'EPSG:4326');
    var p2 = olProj.transform(geom.getLastCoordinate(), projection, 'EPSG:4326');
    return Math.round(ngeoInteractionMeasure.SPHERE_WGS84.haversineDistance(p1, p2));
  }
  return 0;
};


/**
 * @param {number} radius The circle radius in meter.
 * @export
 */
exports.prototype.setCircleRadius = function(radius) {
  this.setFeatureCircleRadius(this.feature, radius);
  this.drawnFeatures_.saveFeature(this.feature);
};


/**
 * @param {ol.Feature} feature The feature.
 * @param {number} radius The circle radius in meter.
 * @export
 */
exports.prototype.setFeatureCircleRadius = function(feature, radius) {
  if (this.feature !== undefined &&
      feature.getGeometry().getType() === olGeomGeometryType.POLYGON &&
      this.isCircle()) {
    var geom = /** @type {ol.geom.Polygon} **/ (feature.getGeometry());
    var center = olExtent.getCenter(geom.getExtent());
    var projection = this.map.getView().getProjection();
    var resolution = this.map.getView().getResolution();
    var pointResolution = olProj.getPointResolution(projection, /** @type {number} */ (resolution), center);
    var resolutionFactor = resolution / pointResolution;
    radius = (radius / olProj.METERS_PER_UNIT.m) * resolutionFactor;
    var featureGeom = new olGeomCircle(center, radius);
    feature.setGeometry(
        olGeomPolygon.fromCircle(featureGeom, 64)
    );
  }
};

/**
 * @param {number} radius The circle radius in meter.
 * Creates a new circle from this one.
 * @export
 */
exports.prototype.createNewCircle = function(radius) {
  this.askRadius = false;
  this.appFeaturePopup_.hide();
  var newCircle = this.feature.clone();
  newCircle.set('__selected__', false);
  newCircle.set('fid', undefined);
  this.setFeatureCircleRadius(newCircle, radius);
  this.drawnFeatures_.getCollection().push(newCircle);
  this.drawnFeatures_.saveFeature(newCircle);
  this.drawnFeatures_.activateModifyIfNeeded(newCircle);
  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(newCircle);
  this.feature = newCircle;
  this.modifySelectedFeature();
};


/**
 * Export a KML file.
 * @export
 */
exports.prototype.exportKml = function() {
  var kml = this.kmlFormat_.writeFeatures([this.feature], {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      appMiscFile.sanitizeFilename(/** @type {string} */(this.feature.get('name'))));
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * Export a Gpx file.
 * @param {boolean} isTrack True if gpx should export tracks instead of routes.
 * @export
 */
exports.prototype.exportGpx = function(isTrack) {
  this.appExport_.exportGpx([this.feature],
      /** @type {string} */(this.feature.get('name')), isTrack);

  this.appFeaturePopup_.toggleDropdown();
};


/**
 * @param {string} doc The document to export/download.
 * @param {string} format The document format.
 * @param {string} filename File name for the exported document.
 * @private
 */
exports.prototype.exportFeatures_ =
    function(doc, format, filename) {
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
 * Update Elevation and Profile after feature geometry change.
 * @private
 */
exports.prototype.updateFeature_ = function() {
  this.updateElevation();
  this.updateProfile();
};


/**
 * @export
 */
exports.prototype.removeImage = function() {
  this.tempThumbnail = '';
  this.tempImage = '';
};


/**
 * @export
 */
exports.prototype.close = function() {
  this.dock();
};


/**
 * @export
 */
exports.prototype.fitFeature = function() {
  this.appFeaturePopup_.fit(this.feature);
};


/**
 * @return {string} The area.
 * @export
 */
exports.prototype.getArea = function() {
  if (this.feature !== undefined &&
      this.feature.getGeometry().getType() === olGeomGeometryType.POLYGON) {
    var geom = /** @type {ol.geom.Polygon} */ (this.feature.getGeometry());
    console.assert(geom !== null && geom !== undefined);
    return this.appFeaturePopup_.formatArea(/** @type {!ol.geom.Polygon} */(geom));
  } else {
    return '';
  }
};


/**
 * @return {string} The radius.
 * @export
 */
exports.prototype.getRadius = function() {
  if (this.feature !== undefined &&
      this.feature.getGeometry().getType() === olGeomGeometryType.POLYGON &&
      this.isCircle()) {
    var geom = /** @type {ol.geom.Polygon} **/ (this.feature.getGeometry());
    console.assert(geom !== null && geom !== undefined);
    var center = olExtent.getCenter(geom.getExtent());
    var line = new olGeomLineString([center, geom.getLastCoordinate()]);
    return this.appFeaturePopup_.formatRadius(line);
  } else {
    return '';
  }
};


/**
 * @return {string} The length.
 * @export
 */
exports.prototype.getLength = function() {
  if (this.feature !== undefined &&
      (this.feature.getGeometry().getType() === olGeomGeometryType.POLYGON ||
      this.feature.getGeometry().getType() === olGeomGeometryType.LINE_STRING)
  ) {
    var geom = /** @type {(ol.geom.LineString|ol.geom.Polygon)} **/
        (this.feature.getGeometry());
    console.assert(geom !== null && geom !== undefined);
    return this.appFeaturePopup_.formatLength(/** @type {!(ol.geom.LineString|ol.geom.Polygon)} **/(geom));
  } else {
    return '';
  }
};


/**
 * @export
 */
exports.prototype.updateElevation = function() {
  if (this.feature !== undefined &&
      this.feature.getGeometry().getType() === olGeomGeometryType.POINT &&
      !this.feature.get('isLabel') &&
      !this.ngeoNetworkStatus_.isDisconnected()) {
    var geom = /** @type {ol.geom.Point} */ (this.feature.getGeometry());
    console.assert(geom !== null && geom !== undefined);
    this.appFeaturePopup_.getElevation(/** @type {!ol.geom.Point} */ (geom)).then(
        function(elevation) {
          this.featureElevation = elevation['formattedElevation'];
        }.bind(this));
  } else {
    this.featureElevation = undefined;
  }
};


/**
 * @export
 */
exports.prototype.updateProfile = function() {
  if (this.feature !== undefined &&
      this.feature.getGeometry().getType() === olGeomGeometryType.LINE_STRING &&
      !this.ngeoNetworkStatus_.isDisconnected()) {
    this.showFeatureProfile.active = true;
    var geom = /** @type {ol.geom.LineString} */ (this.feature.getGeometry());
    console.assert(geom !== null && geom !== undefined);
    this.appFeaturePopup_.getProfile(/** @type {!ol.geom.LineString} */ (geom)).then(function(profile) {
      this.featureProfile = profile;
    }.bind(this));
  } else {
    this.featureProfile = undefined;
    this.showFeatureProfile.active = false;
  }
};


/**
 * @return {boolean} return true if is editable by the user.
 * @export
 */
exports.prototype.isEditable = function() {
  if (this.feature !== undefined &&
      !!this.feature.get('__map_id__')) {
    return this.appMymaps_.isEditable();
  }
  return true;
};


/**
 * Inits the attributes form (ie. gets the name and description from feature).
 * @private
 */
exports.prototype.initForm_ = function() {
  this.tempName = /** @type {string} */ (this.feature.get('name'));
  this.tempDesc = /** @type {string} */ (this.feature.get('description'));
  this.tempThumbnail = /** @type {string} */ (this.feature.get('thumbnail'));
  this.tempImage = /** @type {string} */ (this.feature.get('image'));
};


/**
 * Puts the temporary edited name and description back to the feature.
 * @export
 */
exports.prototype.validateModifications = function() {
  this.feature.set('name', this.tempName);
  this.feature.set('description', this.tempDesc);
  this.feature.set('thumbnail', this.tempThumbnail);
  this.feature.set('image', this.tempImage);

  this.drawnFeatures_.saveFeature(this.feature);
  this.editingAttributes = false;
};


/**
 * @param {?string | undefined} resource The resource.
 * @return {string} The path to the mymaps resource.
 * @export
 */
exports.prototype.getMymapsPath = function(resource) {
  if (resource) {
    return this.mymapsImageUrl_ + resource;
  }
  return '';
};


/**
 * Puts the temporary edited name and description back to the feature.
 * @export
 */
exports.prototype.deleteFeature = function() {
  this.appFeaturePopup_.hide();
  this.selectedFeatures_.remove(this.feature);
  this.drawnFeatures_.remove(this.feature);
  this.deletingFeature = false;
};


/**
 * Returns a trusted html content.
 * @param {?string|undefined} content Content to be trusted.
 * @return {*} The trusted content.
 * @export
 */
exports.prototype.trustAsHtml = function(content) {
  if (!(content !== undefined && content !== null)) {
    content = '';
  }
  return this.sce_.trustAsHtml(content);
};


/**
 * @return {boolean} True if is authenticated.
 * @export
 */
exports.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @export
 */
exports.prototype.modifySelectedFeature = function() {
  if (this.feature) {
    this.drawnFeatures_.activateModifyIfNeeded(this.feature);
    if (this.isCircle() && this.isEditable()) {
      this.editCircleRadius = true;
      this.tempCircleRadius = this.getCircleRadius();
    }
  }
};


/**
 * @export
 */
exports.prototype.endModifySelectedFeature = function() {
  this.feature.set('__editable__', false);
  this.drawnFeatures_.modifyInteraction.setActive(false);
  this.drawnFeatures_.modifyCircleInteraction.setActive(false);
  this.drawnFeatures_.translateInteraction.setActive(false);
  if (this.isCircle() && this.isEditable()) {
    this.editCircleRadius = false;
  }
};


/**
 * @export
 */
exports.prototype.continueLine = function() {
  if (this.feature) {
    var lastCoordinate = /** @type {ol.geom.LineString}*/
        (this.feature.getGeometry()).getLastCoordinate();
    var viewSize = /** {ol.Size} **/ (this.map.getSize());
    console.assert(viewSize !== undefined);
    this.map.getView().fit(new olGeomPoint(lastCoordinate), {
      size: viewSize
    });

    this.drawnFeatures_.modifyInteraction.setActive(false);
    this.drawnFeatures_.modifyCircleInteraction.setActive(false);
    this.drawnFeatures_.translateInteraction.setActive(false);
    this.drawnFeatures_.drawLineInteraction.setActive(true);
    this.drawnFeatures_.drawLineInteraction.extend(this.feature);
    this.drawnFeatures_.continuingLine = true;
  }
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * @export
 */
exports.prototype.reverseLine = function() {
  if (this.feature) {
    var coordinates = /** @type {ol.geom.LineString}*/
        (this.feature.getGeometry()).getCoordinates().reverse();
    this.feature.setGeometry(new olGeomLineString(coordinates));
    this.drawnFeatures_.saveFeature(this.feature);
  }
  this.updateProfile();
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * @export
 */
exports.prototype.modifyCircle = function() {
  if (this.feature) {
    this.drawnFeatures_.activateModifyIfNeeded(this.feature);
  }
  this.appFeaturePopup_.toggleDropdown();
};

/**
 * @return {boolean} True if is line.
 * @export
 */
exports.prototype.isLineString = function() {
  if (this.feature) {
    return this.feature.getGeometry().getType() ===
        olGeomGeometryType.LINE_STRING;
  }
  return false;
};


/**
 * @return {boolean} True if circle.
 * @export
 */
exports.prototype.isCircle = function() {
  if (this.feature) {
    return !!this.feature.get('isCircle');
  }
  return false;
};


/**
 * Dock the popup to the left panel.
 * @export
 */
exports.prototype.dock = function() {
  this.appFeaturePopup_.isDocked = true;
  this.appFeaturePopup_.hide();
};


/**
 * Undock the popup and display it into the map.
 * @export
 */
exports.prototype.undock = function() {
  this.appFeaturePopup_.isDocked = false;
  this.appFeaturePopup_.show(this.feature, this.map);
};


/**
 * @return {boolean} True if the popup is docked.
 * @export
 */
exports.prototype.isDocked = function() {
  return this.appFeaturePopup_.isDocked;
};

appModule.controller('AppFeaturePopupController', exports);

/**
 * @fileoverview Provides a feature popup directive.
 */
goog.provide('app.FeaturePopupController');
goog.provide('app.featurePopupDirective');

goog.require('app.module');
goog.require('goog.asserts');
goog.require('ol.events');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.format.KML');
goog.require('ol.geom.Circle');
goog.require('ol.geom.Point');
goog.require('ol.geom.Polygon');
goog.require('ol.geom.LineString');
goog.require('ol.geom.GeometryType');
goog.require('ol.interaction');
goog.require('ngeo.interaction.Measure');


/**
 * @param {string} appFeaturePopupTemplateUrl URL to the directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.featurePopupDirective = function(appFeaturePopupTemplateUrl) {
  return {
    restrict: 'A',
    scope: {
      'feature': '=appFeaturePopupFeature',
      'map': '=appFeaturePopupMap'
    },
    controller: 'AppFeaturePopupController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeaturePopupTemplateUrl
  };
};

app.module.directive('appFeaturePopup', app.featurePopupDirective);


/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {app.FeaturePopup} appFeaturePopup The feature popup service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo Network Status.
 * @param {string} mymapsImageUrl URL to "mymaps" Feature service.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @param {Document} $document Document.
 * @param {app.Export} appExport The export service.
 * @export
 * @ngInject
 */
app.FeaturePopupController = function($scope, $sce, appFeaturePopup,
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
  this.kmlFormat_ = new ol.format.KML();

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
   * @type {app.DrawnFeatures}
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
    if (goog.isDef(this.feature)) {
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
  this.event_ = ol.events.listen(this.drawnFeatures_.modifyInteraction,
      ol.interaction.ModifyEventType.MODIFYEND, this.updateFeature_, this);

  this.unwatch4_ = $scope.$watch(function() {
    return this.image;
  }.bind(this), function() {
    if (!goog.isDef(this.image)) {
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
    ol.events.unlistenByKey(this.event_);
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
app.FeaturePopupController.prototype.getSetCircleRadius = function(radius) {
  if (goog.isDef(this.feature) &&
      this.feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON &&
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
app.FeaturePopupController.prototype.getCircleRadius = function() {
  if (goog.isDef(this.feature) &&
      this.feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON &&
      this.isCircle()) {
    var geom = /** @type {ol.geom.Polygon} **/ (this.feature.getGeometry());
    var center = ol.extent.getCenter(geom.getExtent());
    var projection = this.map.getView().getProjection();
    var p1 = ol.proj.transform(center, projection, 'EPSG:4326');
    var p2 = ol.proj.transform(geom.getLastCoordinate(), projection, 'EPSG:4326');
    return Math.round(ngeo.interaction.Measure.SPHERE_WGS84.haversineDistance(p1, p2));
  }
  return 0;
};


/**
 * @param {number} radius The circle radius in meter.
 * @export
 */
app.FeaturePopupController.prototype.setCircleRadius = function(radius) {
  this.setFeatureCircleRadius(this.feature, radius);
  this.drawnFeatures_.saveFeature(this.feature);
};


/**
 * @param {ol.Feature} feature The feature.
 * @param {number} radius The circle radius in meter.
 * @export
 */
app.FeaturePopupController.prototype.setFeatureCircleRadius = function(feature, radius) {
  if (goog.isDef(feature) &&
      feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON &&
      this.isCircle()) {
    var geom = /** @type {ol.geom.Polygon} **/ (feature.getGeometry());
    var center = ol.extent.getCenter(geom.getExtent());
    var projection = this.map.getView().getProjection();
    var resolution = this.map.getView().getResolution();
    var pointResolution = ol.proj.getPointResolution(projection, /** @type {number} */ (resolution), center);
    var resolutionFactor = resolution / pointResolution;
    radius = (radius / ol.proj.METERS_PER_UNIT.m) * resolutionFactor;
    var featureGeom = new ol.geom.Circle(center, radius);
    feature.setGeometry(
        ol.geom.Polygon.fromCircle(featureGeom, 64)
    );
  }
};

/**
 * @param {number} radius The circle radius in meter.
 * Creates a new circle from this one.
 * @export
 */
app.FeaturePopupController.prototype.createNewCircle = function(radius) {
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
app.FeaturePopupController.prototype.exportKml = function() {
  var kml = this.kmlFormat_.writeFeatures([this.feature], {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      app.sanitizeFilename(/** @type {string} */(this.feature.get('name'))));
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * Export a Gpx file.
 * @param {boolean} isTrack True if gpx should export tracks instead of routes.
 * @export
 */
app.FeaturePopupController.prototype.exportGpx = function(isTrack) {
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
app.FeaturePopupController.prototype.exportFeatures_ =
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
app.FeaturePopupController.prototype.updateFeature_ = function() {
  this.updateElevation();
  this.updateProfile();
};


/**
 * @export
 */
app.FeaturePopupController.prototype.removeImage = function() {
  this.tempThumbnail = '';
  this.tempImage = '';
};


/**
 * @export
 */
app.FeaturePopupController.prototype.close = function() {
  this.dock();
};


/**
 * @export
 */
app.FeaturePopupController.prototype.fitFeature = function() {
  this.appFeaturePopup_.fit(this.feature);
};


/**
 * @return {string} The area.
 * @export
 */
app.FeaturePopupController.prototype.getArea = function() {
  if (goog.isDef(this.feature) &&
      this.feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON) {
    var geom = /** @type {ol.geom.Polygon} **/ (this.feature.getGeometry());
    goog.asserts.assert(geom);
    return this.appFeaturePopup_.formatArea(geom);
  } else {
    return '';
  }
};


/**
 * @return {string} The radius.
 * @export
 */
app.FeaturePopupController.prototype.getRadius = function() {
  if (goog.isDef(this.feature) &&
      this.feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON &&
      this.isCircle()) {
    var geom = /** @type {ol.geom.Polygon} **/ (this.feature.getGeometry());
    goog.asserts.assert(geom);
    var center = ol.extent.getCenter(geom.getExtent());
    var line = new ol.geom.LineString([center, geom.getLastCoordinate()]);
    return this.appFeaturePopup_.formatRadius(line);
  } else {
    return '';
  }
};


/**
 * @return {string} The length.
 * @export
 */
app.FeaturePopupController.prototype.getLength = function() {
  if (goog.isDef(this.feature) &&
      (this.feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON ||
      this.feature.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING)
  ) {
    var geom = /** @type {(ol.geom.LineString|ol.geom.Polygon)} **/
        (this.feature.getGeometry());
    goog.asserts.assert(geom);
    return this.appFeaturePopup_.formatLength(geom);
  } else {
    return '';
  }
};


/**
 * @export
 */
app.FeaturePopupController.prototype.updateElevation = function() {
  if (goog.isDef(this.feature) &&
      this.feature.getGeometry().getType() === ol.geom.GeometryType.POINT &&
      !this.feature.get('isLabel') &&
      !this.ngeoNetworkStatus_.isDisconnected()) {
    var geom = /** @type {ol.geom.Point} */ (this.feature.getGeometry());
    goog.asserts.assert(geom);
    this.appFeaturePopup_.getElevation(geom).then(
        goog.bind(function(elevation) {
          this.featureElevation = elevation['formattedElevation'];
        }, this));
  } else {
    this.featureElevation = undefined;
  }
};


/**
 * @export
 */
app.FeaturePopupController.prototype.updateProfile = function() {
  if (goog.isDef(this.feature) &&
      this.feature.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING &&
      !this.ngeoNetworkStatus_.isDisconnected()) {
    this.showFeatureProfile.active = true;
    var geom = /** @type {ol.geom.LineString} */ (this.feature.getGeometry());
    goog.asserts.assert(geom);
    this.appFeaturePopup_.getProfile(geom).then(goog.bind(function(profile) {
      this.featureProfile = profile;
    }, this));
  } else {
    this.featureProfile = undefined;
    this.showFeatureProfile.active = false;
  }
};


/**
 * @return {boolean} return true if is editable by the user.
 * @export
 */
app.FeaturePopupController.prototype.isEditable = function() {
  if (goog.isDef(this.feature) &&
      !!this.feature.get('__map_id__')) {
    return this.appMymaps_.isEditable();
  }
  return true;
};


/**
 * Inits the attributes form (ie. gets the name and description from feature).
 * @private
 */
app.FeaturePopupController.prototype.initForm_ = function() {
  this.tempName = /** @type {string} */ (this.feature.get('name'));
  this.tempDesc = /** @type {string} */ (this.feature.get('description'));
  this.tempThumbnail = /** @type {string} */ (this.feature.get('thumbnail'));
  this.tempImage = /** @type {string} */ (this.feature.get('image'));
};


/**
 * Puts the temporary edited name and description back to the feature.
 * @export
 */
app.FeaturePopupController.prototype.validateModifications = function() {
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
app.FeaturePopupController.prototype.getMymapsPath = function(resource) {
  if (resource) {
    return this.mymapsImageUrl_ + resource;
  }
  return '';
};


/**
 * Puts the temporary edited name and description back to the feature.
 * @export
 */
app.FeaturePopupController.prototype.deleteFeature = function() {
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
app.FeaturePopupController.prototype.trustAsHtml = function(content) {
  if (!goog.isDefAndNotNull(content)) {
    content = '';
  }
  return this.sce_.trustAsHtml(content);
};


/**
 * @return {boolean} True if is authenticated.
 * @export
 */
app.FeaturePopupController.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @export
 */
app.FeaturePopupController.prototype.modifySelectedFeature = function() {
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
app.FeaturePopupController.prototype.endModifySelectedFeature = function() {
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
app.FeaturePopupController.prototype.continueLine = function() {
  if (this.feature) {
    var lastCoordinate = /** @type {ol.geom.LineString}*/
        (this.feature.getGeometry()).getLastCoordinate();
    var viewSize = /** {ol.Size} **/ (this.map.getSize());
    goog.asserts.assert(goog.isDef(viewSize));
    this.map.getView().fit(new ol.geom.Point(lastCoordinate), {
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
app.FeaturePopupController.prototype.reverseLine = function() {
  if (this.feature) {
    var coordinates = /** @type {ol.geom.LineString}*/
        (this.feature.getGeometry()).getCoordinates().reverse();
    this.feature.setGeometry(new ol.geom.LineString(coordinates));
    this.drawnFeatures_.saveFeature(this.feature);
  }
  this.updateProfile();
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * @export
 */
app.FeaturePopupController.prototype.modifyCircle = function() {
  if (this.feature) {
    this.drawnFeatures_.activateModifyIfNeeded(this.feature);
  }
  this.appFeaturePopup_.toggleDropdown();
};

/**
 * @return {boolean} True if is line.
 * @export
 */
app.FeaturePopupController.prototype.isLineString = function() {
  if (this.feature) {
    return this.feature.getGeometry().getType() ===
        ol.geom.GeometryType.LINE_STRING;
  }
  return false;
};


/**
 * @return {boolean} True if circle.
 * @export
 */
app.FeaturePopupController.prototype.isCircle = function() {
  if (this.feature) {
    return !!this.feature.get('isCircle');
  }
  return false;
};


/**
 * Dock the popup to the left panel.
 * @export
 */
app.FeaturePopupController.prototype.dock = function() {
  this.appFeaturePopup_.isDocked = true;
  this.appFeaturePopup_.hide();
};


/**
 * Undock the popup and display it into the map.
 * @export
 */
app.FeaturePopupController.prototype.undock = function() {
  this.appFeaturePopup_.isDocked = false;
  this.appFeaturePopup_.show(this.feature, this.map);
};


/**
 * @return {boolean} True if the popup is docked.
 * @export
 */
app.FeaturePopupController.prototype.isDocked = function() {
  return this.appFeaturePopup_.isDocked;
};

app.module.controller('AppFeaturePopupController', app.FeaturePopupController);

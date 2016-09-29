/**
 * @fileoverview Provides a feature popup directive.
 */
goog.provide('app.FeaturePopupController');
goog.provide('app.featurePopupDirective');

goog.require('app');
goog.require('app.Mymaps');
goog.require('app.profileDirective');
goog.require('ngeo');
goog.require('ol.events');
goog.require('ol.format.GPX');
goog.require('ol.format.GeoJSON');
goog.require('ol.format.KML');


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
 * @param {string} mymapsImageUrl URL to "mymaps" Feature service.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @param {Document} $document Document.
 * @param {app.Export} appExport The export service.
 * @export
 * @ngInject
 */
app.FeaturePopupController = function($scope, $sce, appFeaturePopup,
    appDrawnFeatures, appMymaps, appSelectedFeatures, appUserManager,
    mymapsImageUrl, exportgpxkmlUrl, $document, appExport) {

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
  this.editingStyle = false;

  /**
   * @type {boolean}
   * @export
   */
  this.deletingFeature = false;

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
   * @type {app.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  this.appFeaturePopup_ = appFeaturePopup;

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
   * @type {ol.events.Key}
   * @private
   */
  this.event_ = ol.events.listen(this.drawnFeatures_.modifyInteraction,
      ol.ModifyEventType.MODIFYEND, this.updateFeature_, this);

  this.unwatch4_ = $scope.$watch(function() {
    return this.image;
  }.bind(this), function() {
    if (!goog.isDef(this.image)) {
      return;
    }
    this.tempThumbnail = this.image['thumbnail'];
    this.tempImage = this.image['image'];
  }.bind(this));

  $scope.$on('$destroy', function() {
    ol.events.unlistenByKey(this.event_);
    this.unwatch1_();
    this.unwatch2_();
    this.unwatch3_();
    this.unwatch4_();
  }.bind(this));

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
      !this.feature.get('isLabel')) {
    var geom = /** @type {ol.geom.Point} */ (this.feature.getGeometry());
    this.appFeaturePopup_.getElevation(geom).then(
        goog.bind(function(elevation) {
          this.featureElevation = elevation;
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
      this.feature.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING) {
    this.showFeatureProfile.active = true;
    var geom = /** @type {ol.geom.LineString} */ (this.feature.getGeometry());
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
    this.map.getView().fit(
        new ol.geom.Point(lastCoordinate),
        viewSize
    );

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

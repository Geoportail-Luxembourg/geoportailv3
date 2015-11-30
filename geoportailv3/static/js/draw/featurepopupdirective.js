/**
 * @fileoverview Provides a feature popup directive.
 */
goog.provide('app.FeaturePopupController');
goog.provide('app.featurePopupDirective');

goog.require('app');
goog.require('app.Mymaps');
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
 * @param {app.UserManager} appUserManager
 * @param {string} mymapsImageUrl URL to "mymaps" Feature service.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @param {Document} $document Document.
 * @export
 * @ngInject
 */
app.FeaturePopupController = function($scope, $sce, appFeaturePopup,
    appDrawnFeatures, appMymaps, appSelectedFeatures, appUserManager,
    mymapsImageUrl, exportgpxkmlUrl, $document) {

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
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new ol.format.GPX();

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

  $scope.$watch(goog.bind(function() {
    return this.editingAttributes;
  }, this), goog.bind(function(newVal) {
    if (newVal) {
      this.initForm_();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.feature;
  }, this), goog.bind(function(newVal) {
    this.editingAttributes = false;
    this.editingStyle = false;
    this.deletingFeature = false;
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.image;
  }, this), goog.bind(function() {
    if (!goog.isDef(this.image)) {
      return;
    }
    this.tempThumbnail = this.image['thumbnail'];
    this.tempImage = this.image['image'];
  }, this));
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
      this.sanitizeFilename_(/** @type {string} */(this.feature.get('name'))));
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * Export a Gpx file.
 * @export
 */
app.FeaturePopupController.prototype.exportGpx = function() {
  var gpx = this.gpxFormat_.writeFeatures([this.feature], {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  gpx = gpx.replace('<gpx ',
      '<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
      'version="1.1" ');
  this.exportFeatures_(gpx, 'gpx',
      this.sanitizeFilename_(/** @type {string} */(this.feature.get('name'))));
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 * @private
 */
app.FeaturePopupController.prototype.sanitizeFilename_ = function(name) {
  name = name.replace(/\s+/gi, '_'); // Replace white space with _.
  return name.replace(/[^a-zA-Z0-9\-]/gi, ''); // Strip any special charactere.
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
  this.appFeaturePopup_.hide();
};


/**
 * @export
 */
app.FeaturePopupController.prototype.fitFeature = function() {
  this.appFeaturePopup_.fit(this.feature);
};


/**
 * @return {string}
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
 * @return {string}
 * @export
 */
app.FeaturePopupController.prototype.getLength = function() {
  if (goog.isDef(this.feature) &&
      (this.feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON ||
      this.feature.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING)
  )
  {
    var geom = /** @type {(ol.geom.LineString|ol.geom.Polygon)} **/
        (this.feature.getGeometry());
    return this.appFeaturePopup_.formatLength(geom);
  } else {
    return '';
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
 * get the path to the Mymaps Resource
 * @param {?string | undefined} resource the resource.
 * @return {string}
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
 * @param {?string|undefined} content content to be trusted.
 * @return {*} the trusted content.
 * @export
 */
app.FeaturePopupController.prototype.trustAsHtml = function(content) {
  if (!goog.isDefAndNotNull(content)) {
    content = '';
  }
  return this.sce_.trustAsHtml(content);
};


/**
 * @return {boolean}
 * @export
 */
app.FeaturePopupController.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @export
 */
app.FeaturePopupController.prototype.continueLine = function() {
  if (this.feature) {
    this.drawnFeatures_.modifyInteraction.setActive(false);
    this.drawnFeatures_.drawLineInteraction.continueLine(this.feature);
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
  this.appFeaturePopup_.toggleDropdown();
};


/**
 * @return {boolean}
 * @export
 */
app.FeaturePopupController.prototype.isLineString = function() {
  if (this.feature) {
    return this.feature.getGeometry().getType() ===
        ol.geom.GeometryType.LINE_STRING;
  }
  return false;
};

app.module.controller('AppFeaturePopupController', app.FeaturePopupController);

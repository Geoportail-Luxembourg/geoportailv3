/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "export" web service.
 */
goog.module('app.Export');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olGeomGeometryType = goog.require('ol.geom.GeometryType');
const appMiscFile = goog.require('app.misc.file');
const olFormatGPX = goog.require('ol.format.GPX');
const olFormatGeoJSON = goog.require('ol.format.GeoJSON');
const olFormatKML = goog.require('ol.format.KML');
const olGeomMultiLineString = goog.require('ol.geom.MultiLineString');


/**
 * @constructor
 * @param {Document} $document Document.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @ngInject
 */
exports = function($document, exportgpxkmlUrl) {

  /**
   * @type {ol.Map}
   */
  this.map;

  /**
   * @private
   * @type {string}
   */
  this.exportgpxkmlUrl_ = exportgpxkmlUrl;

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
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new olFormatGPX();

  /**
   * @private
   * @type {olx.format.ReadOptions}
   */
  this.encOpt_;
};


/**
 * Export a Gpx file.
 * @param {ol.Map} map The Map.
 * @export
 */
exports.prototype.init = function(map) {
  this.map = map;
  this.encOpt_ = /** @type {olx.format.ReadOptions} */({
    dataProjection: 'EPSG:2169',
    featureProjection: this.map.getView().getProjection()
  });
};


/**
 * Export a Gpx file.
 * @param {Array.<ol.Feature>} features The features to export.
 * @param {string} name The file name.
 * @param {boolean} isTrack True if gpx should export tracks instead of routes.
 * @export
 */
exports.prototype.exportGpx = function(features, name, isTrack) {
  // LineString geometries, and tracks from MultiLineString
  var explodedFeatures = this.exploseFeature_(features);
  if (isTrack) {
    explodedFeatures = this.changeLineToMultiline_(explodedFeatures);
  } else {
    explodedFeatures = this.changeMultilineToLine_(explodedFeatures);
  }
  var gpx = this.gpxFormat_.writeFeatures(
    this.orderFeaturesForGpx_(explodedFeatures),
    {
      dataProjection: 'EPSG:4326',
      featureProjection: this['map'].getView().getProjection()
    });

  this.exportFeatures_(gpx, 'gpx', appMiscFile.sanitizeFilename(name));
};


/**
 * Change each line contained in the array into multiline geometry.
 * @param {Array.<ol.Feature>} features The features to change.
 * @return {Array.<ol.Feature>} The changed features.
 * @private
 */
exports.prototype.changeLineToMultiline_ = function(features) {
  var changedFeatures = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.LINE_STRING:
        var geom = /** @type {ol.geom.LineString} */ (feature.getGeometry());
        var multilineFeature = feature.clone();
        multilineFeature.setGeometry(
            new olGeomMultiLineString([geom.getCoordinates()]));
        changedFeatures.push(multilineFeature);
        break;
      default :
        changedFeatures.push(feature);
        break;
    }
  });
  return changedFeatures;
};


/**
 * Change each multiline contained in the array into line geometry.
 * @param {Array.<ol.Feature>} features The features to change.
 * @return {Array.<ol.Feature>} The changed features.
 * @private
 */
exports.prototype.changeMultilineToLine_ = function(features) {
  var changedFeatures = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.MULTI_LINE_STRING:
        var geom = /** @type {ol.geom.MultiLineString} */
            (feature.getGeometry());
        var lines = /** @type {ol.geom.MultiLineString} */
            (geom).getLineStrings();
        lines.forEach(function(line) {
          var clonedFeature = feature.clone();
          clonedFeature.setGeometry(line);
          changedFeatures.push(clonedFeature);
        });
        break;
      default :
        changedFeatures.push(feature);
        break;
    }
  });
  return changedFeatures;
};


/**
 * Explose the feature into multiple features if the geometry is a
 * collection of geometries.
 * @param {Array.<ol.Feature>} features The features to explose.
 * @return {Array.<ol.Feature>} The exploded features.
 * @private
 */
exports.prototype.exploseFeature_ = function(features) {
  var explodedFeatures = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.GEOMETRY_COLLECTION:
        var geomCollection = /** @type {ol.geom.GeometryCollection} */
            (feature.getGeometry());
        geomCollection.getGeometriesArray().forEach(
            function(curGeom) {
              var newFeature = feature.clone();
              newFeature.setGeometry(curGeom);
              explodedFeatures.push(newFeature);
            });
        break;
      case olGeomGeometryType.MULTI_LINE_STRING:
        var multiLineString = /** @type {ol.geom.MultiLineString} */
            (feature.getGeometry());
        multiLineString.getLineStrings().forEach(
            function(curGeom) {
              var newFeature = feature.clone();
              newFeature.setGeometry(curGeom);
              explodedFeatures.push(newFeature);
            });
        break;

      default :
        explodedFeatures.push(feature);
        break;
    }
  });
  return explodedFeatures;
};


/**
 * Order the feature to have the right GPX order.
 * An optional instance of <meta />
 * An arbitrary number of instances of <wpt />
 * An arbitrary number of instances of <rte />
 * An arbitrary number of instances of <trk />
 * An optional instance of <extensions />
 * @param {Array.<ol.Feature>} features The features to sort.
 * @return {Array.<ol.Feature>} The sorted features.
 * @private
 */
exports.prototype.orderFeaturesForGpx_ = function(features) {

  var points = [];
  var lines = [];
  var others = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.POINT:
        points.push(feature);
        break;
      case olGeomGeometryType.LINE_STRING:
        lines.push(feature);
        break;
      default :
        others.push(feature);
        break;
    }
  });

  return points.concat(lines, others);
};


/**
 * Export a KML file.
 * @param {Object} feature The feature to export.
 * @param {string} name The file name.
 * @export
 */
exports.prototype.exportKml = function(feature, name) {

  var activeFeature = /** @type {ol.Feature} */
      ((new olFormatGeoJSON()).readFeature(feature, this.encOpt_));

  var kml = this.kmlFormat_.writeFeatures(this.exploseFeature_([activeFeature]),
    {
      dataProjection: 'EPSG:4326',
      featureProjection: this['map'].getView().getProjection()
    });
  this.exportFeatures_(kml, 'kml', appMiscFile.sanitizeFilename(name));
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

appModule.service('appExport', exports);

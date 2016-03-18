/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "export" web service.
 */
goog.provide('app.Export');

goog.require('app');
goog.require('ol.format.GPX');
goog.require('ol.format.GeoJSON');
goog.require('ol.format.KML');
goog.require('ol.proj');



/**
 * @constructor
 * @param {Document} $document Document.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @ngInject
 */
app.Export = function($document, exportgpxkmlUrl) {

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
  this.kmlFormat_ = new ol.format.KML();

  /**
   * @private
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new ol.format.GPX();

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
app.Export.prototype.init = function(map) {
  this.map = map;
  this.encOpt_ = /** @type {olx.format.ReadOptions} */({
    dataProjection: 'EPSG:2169',
    featureProjection: this.map.getView().getProjection()
  });
};


/**
 * Export a Gpx file.
 * @param {Object} feature The feature to export.
 * @param {string} name The file name.
 * @export
 */
app.Export.prototype.exportGpx = function(feature, name) {

  var activeFeature = /** @type {ol.Feature} */
      ((new ol.format.GeoJSON()).readFeature(feature, this.encOpt_));
  var features = [activeFeature];

  var gpx = this.gpxFormat_.writeFeatures(features, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  gpx = gpx.replace('<gpx ',
      '<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' version="1.1" ');
  this.exportFeatures_(gpx, 'gpx', this.sanitizeFilename_(name));
};


/**
 * Export a KML file.
 * @param {Object} feature The feature to export.
 * @param {string} name The file name.
 * @export
 */
app.Export.prototype.exportKml = function(feature, name) {

  var activeFeature = /** @type {ol.Feature} */
      ((new ol.format.GeoJSON()).readFeature(feature, this.encOpt_));
  var features = [activeFeature];

  var kml = this.kmlFormat_.writeFeatures(features, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml', this.sanitizeFilename_(name));
};


/**
 * @param {string} doc The document to export/download.
 * @param {string} format The document format.
 * @param {string} filename File name for the exported document.
 * @private
 */
app.Export.prototype.exportFeatures_ =
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
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 * @private
 */
app.Export.prototype.sanitizeFilename_ = function(name) {
  name = name.replace(/\s+/gi, '_'); // Replace white space with _.
  return name.replace(/[^a-zA-Z0-9\-]/gi, ''); // Strip any special charactere.
};

app.module.service('appExport', app.Export);

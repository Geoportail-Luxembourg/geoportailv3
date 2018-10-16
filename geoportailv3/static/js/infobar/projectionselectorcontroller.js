/**
 * @fileoverview This file provides a "projectionselector" directive
 * This directive is used to insert an Projection Selector and
 * Coordinate Display into the HTML page.
 * Example:
 *
 * <app-projectionselector app-projectionselector-map="::mainCtrl.map" >
 * </app-projectionselector>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.infobar.ProjectionselectorController');

goog.require('app.module');
goog.require('ol.control.MousePosition');


/**
 * @ngInject
 * @export
 * @constructor
 * @param {Object} $document The document service.
 * @param {angular.$sce} $sce Angular sce service.
 * @param {app.CoordinateString} appCoordinateString The coordinate string.
 */
app.infobar.ProjectionselectorController =
    function($document, $sce, appCoordinateString) {
      /**
       * @type {app.CoordinateString}
       * @private
       */
      this.coordinateString_ = appCoordinateString;

  /**
   * @type {Array.<Object>}
   */
      this['projectionOptions'] = [
    {'label': $sce.trustAsHtml('LUREF'), 'value': 'EPSG:2169'},
    {'label': $sce.trustAsHtml('Lon/Lat WGS84'), 'value': 'EPSG:4326'},
    {'label': $sce.trustAsHtml('Lon/Lat WGS84 DMS'), 'value': 'EPSG:4326:DMS'},
    {'label': $sce.trustAsHtml('Lon/Lat WGS84 DM'), 'value': 'EPSG:4326:DMm'},
    {'label': $sce.trustAsHtml('WGS84 UTM 32|31'), 'value': 'EPSG:3263*'}
      ];
      this['projection'] = this['projectionOptions'][0];
      /** @type {ol.control.MousePostion} */
      this['mousePositionControl'] = new ol.control.MousePosition({
        className: 'custom-mouse-coordinates',
        coordinateFormat: /** @type {ol.CoordinateFormatType} */
        (this.mouseCoordinateFormat_.bind(this))
      });
    };


/**
 * @param {ol.Coordinate} coord The coordinate.
 * @return {string} The mouse coordinate format.
 * @private
 */
app.infobar.ProjectionselectorController.prototype.mouseCoordinateFormat_ =
    function(coord) {
      var mapEpsgCode =
      this['map'].getView().getProjection().getCode();
      if (this['projection']['value'] === 'EPSG:4326:DMS') {
        return this.coordinateString_(coord, mapEpsgCode, 'EPSG:4326', true, false);
      } else if (this['projection']['value'] === 'EPSG:4326:DMm') {
        return this.coordinateString_(coord, mapEpsgCode, 'EPSG:4326', false, true);
      } else {
        return this.coordinateString_(
        coord, mapEpsgCode, this['projection']['value'], false, false);
      }
    };


/**
 * @export
 * @param {string} epsgCode The epsg code.
 */
app.infobar.ProjectionselectorController.prototype.switchProjection =
    function(epsgCode) {
      this['projection'] = goog.array.find(this['projectionOptions'],
      function(obj) {
        return obj['value'] == epsgCode;
      });
      this['mousePositionControl'].setCoordinateFormat(
        /** @type {ol.CoordinateFormatType} */
        (this.mouseCoordinateFormat_.bind(this))
      );
    };

app.module.controller('AppProjectionselectorController',
    app.infobar.ProjectionselectorController);

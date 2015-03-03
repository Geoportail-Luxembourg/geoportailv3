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
goog.provide('app.projectionselectorDirective');
goog.require('app');
goog.require('app.projections');
goog.require('ol.control.MousePosition');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appProjectionselectorTemplateUrl
 * @ngInject
 */
app.projectionselectorDirective = function(appProjectionselectorTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appProjectionselectorMap'
    },
    controller: 'AppProjectionselectorController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appProjectionselectorTemplateUrl
  };
};


app.module.directive('appProjectionselector', app.projectionselectorDirective);



/**
 * @ngInject
 * @export
 * @constructor
 * @param {Object} $document
 * @param {angular.$sce} $sce Angular sce service.
 */
app.ProjectionselectorDirectiveController = function($document, $sce) {
  this['projectionOptions'] = [
    {'label': $sce.trustAsHtml('LUREF'), 'value': 'EPSG:2169'},
    {'label': $sce.trustAsHtml('Long/Lat WGS84'), 'value': 'EPSG:4326'},
    {'label': $sce.trustAsHtml('WGS84 UTM 32|31'), 'value': 'EPSG:3263*'}
  ];
  this['projection'] = this['projectionOptions'][0];
  this.mouseposition = new ol.control.MousePosition({
    className: 'custom-mouse-coordinates',
    target: $document.find('.mouse-coordinates')[0],
    projection: this.projection['value'],
    coordinateFormat: /** @type {ol.CoordinateFormatType} */
        (goog.bind(function(coord) {
          return this.coordFormat_(coord, this['projection']['value']);
        }, this)
        )
  });
  this.map.addControl(this.mouseposition);
};


/**
 * @private
 * @param {Array} coord
 * @return {string}
 */
app.ProjectionselectorDirectiveController.prototype.utmZoneCheck_ =
    function(coord) {
  var lonlat = /** @type {ol.Coordinate} */
      (ol.proj.transform(coord,
                         this.mouseposition.getProjection() ,
                         'EPSG:4326')
      );
  return Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
};


/**
 * @private
 * @param {Array} coord
 * @param {string} epsgCode
 * @return {string}
 */
app.ProjectionselectorDirectiveController.prototype.coordFormat_ =
    function(coord, epsgCode) {
  var str = '';
  if (epsgCode === 'EPSG:3263*') {
    var projection = ol.proj.get(this.utmZoneCheck_(coord));
    this.mouseposition.setProjection(projection);
    epsgCode = projection.getCode();
  }
  switch (epsgCode) {
    case 'EPSG:2169':
      str = ol.coordinate.format(coord, '{x} E | {y} N', 0);
      break;
    case 'EPSG:4326':
      var hdms = ol.coordinate.toStringHDMS(coord);
      var yhdms = hdms.split(' ').slice(0, 4).join(' ');
      var xhdms = hdms.split(' ').slice(4, 8).join(' ');
      var template = xhdms + ' ({x}) | ' + yhdms + ' ({y})';
      str = ol.coordinate.format(coord, template, 5);
      break;
    case 'EPSG:32632':
      str = ol.coordinate.format(coord, '{x} | {y} (UTM32N)', 0);
      break;
    case 'EPSG:32631':
      str = ol.coordinate.format(coord, '{x} | {y} (UTM31N)', 0);
      break;
  }
  return str;
};


/**
 * @export
 * @param {string} epsgCode
 */
app.ProjectionselectorDirectiveController.prototype.switchProjection =
    function(epsgCode) {
  var projection = null;
  if (epsgCode === 'EPSG:3263*') {
    projection = ol.proj.get('EPSG:32632');
  } else {
    projection = ol.proj.get(epsgCode);
  }
  this['projection'] = goog.array.find(this['projectionOptions'],
      function(obj) {
        return obj['value'] == epsgCode;
      });
  var widget = this.mouseposition;
  widget.setProjection(projection);
  widget.setCoordinateFormat(
      /** @type {ol.CoordinateFormatType} */ (goog.bind(function(coord) {
        return this.coordFormat_(coord, epsgCode);
      }, this))
  );
};

app.module.controller('AppProjectionselectorController',
    app.ProjectionselectorDirectiveController);

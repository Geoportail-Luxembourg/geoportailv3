/**
 * @fileoverview This file provides a "projectionselector" directive. This directive is
 * used to insert an Projection Selector and Coordinate Display into the HTML page.
 * Example:
 *
 * <app-projectionselector app-projectionselector-map="::mainCtrl.map" ></app-projectionselector>
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
 */
app.ProjectionselectorDirectiveController = function($scope, $document) {
  this['projectionOptions'] = [
    {'label': 'LUREF', 'value': 'EPSG:2169'},
    {'label': 'Long/Lat WGS84', 'value': 'EPSG:4326'},
    {'label': 'WGS84 UTM 32|31', 'value': 'EPSG:3263*'}
  ];
  this['projection'] = this['projectionOptions'][0];
  this.mouseposition = new ol.control.MousePosition({
    className: 'custom-mouse-coordinates',
    target: $document.find('.mouse-coordinates')[0],
    projection: this.projection['value'],
    coordinateFormat: /** @type {ol.CoordinateFormatType} */ (goog.bind(function(coord) {
      return this.coordFormat_(coord, this['projection']['value']);
    }, this))
  });
  this.map.addControl(this.mouseposition);
};


/**
 * @private
 */
app.ProjectionselectorDirectiveController.prototype.utmZoneCheck_ = function(coord) {
  var lonlat = /** @type {ol.Coordinate} */ (ol.proj.transform(coord, this.mouseposition.getProjection() , 'EPSG:4326'));
  return Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
};


/**
 * @private
 */
app.ProjectionselectorDirectiveController.prototype.coordFormat_ = function(coord, epsg_code)
    {
  if (epsg_code === 'EPSG:3263*') {
    var projection = ol.proj.get(this.utmZoneCheck_(coord));
    this.mouseposition.setProjection(projection);
    epsg_code = projection.getCode();
  }
  switch (epsg_code) {
    case 'EPSG:2169':
      return ol.coordinate.format(coord, '{x} E | {y} N', 0);
    case 'EPSG:4326':
      var hdms = ol.coordinate.toStringHDMS(coord);
      var yhdms = hdms.split(' ').slice(0, 4).join(' ');
      var xhdms = hdms.split(' ').slice(4, 8).join(' ');
      var template = xhdms + ' ({x}) | ' + yhdms + ' ({y})';
      return ol.coordinate.format(coord, template, 5);
    case 'EPSG:32632':
      return ol.coordinate.format(coord, '{x} | {y} (UTM32N)', 0);
    case 'EPSG:32631':
      return ol.coordinate.format(coord, '{x} | {y} (UTM31N)', 0);
  }
};


/**
 * @export
 */
app.ProjectionselectorDirectiveController.prototype.switchProjection = function() {
  var projection = null;
  if (this['projection']['value'] === 'EPSG:3263*') {
    projection = ol.proj.get('EPSG:32632');
  } else {
    projection = ol.proj.get(this['projection']['value']);
  }
  var widget = this.mouseposition;
  console.log(projection);
  widget.setProjection(projection);
  widget.setCoordinateFormat(
      /** @type {ol.CoordinateFormatType} */ (goog.bind(function(coord) {
        return this.coordFormat_(coord, this['projection']['value']);
      }, this))
  );
};

app.module.controller('AppProjectionselectorController',
    app.ProjectionselectorDirectiveController);

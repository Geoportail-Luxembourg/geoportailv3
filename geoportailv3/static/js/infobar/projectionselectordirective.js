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
 * @constructor
 */
app.ProjectionselectorDirectiveController = function($scope, $document) {
  $scope.projectionOptions = [
    {label: 'LUREF', value: 'EPSG:2169'},
    {label: 'Long/Lat WGS84', value: 'EPSG:4326'},
    {label: 'WGS84 UTM 32|31', value: 'EPSG:3263*'}
  ];
  $scope.projection = $scope.projectionOptions[0];
  this.mouseposition = new ol.control.MousePosition({
    className: 'custom-mouse-coordinates',
    target: $document.find('.mouse-coordinates')[0],
    projection: $scope.projection.value,
    coordinateFormat: function(coord) {
      return _coordFormat(coord, $scope.projection.value);
    }
  });
  this['map'].addControl(this.mouseposition);

  function _utmZoneCheck(coord) {
    var lonlat = /** @type {ol.Coordinate} */ (ol.proj.transform(coord, $scope['ctrl'].mouseposition.getProjection() , 'EPSG:4326'));
    if (Math.floor(lonlat[0]) >= 6) {
      return 'EPSG:32632';
    } else {
      return 'EPSG:32631';
    }
  };

  function _coordFormat(coord, epsg_code) {
    if (epsg_code === 'EPSG:3263*') {
      var projection = ol.proj.get(_utmZoneCheck(coord));
      $scope['ctrl'].mouseposition.setProjection(projection);
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

  $scope.switchProjection = function() {
    if (this.projection.value === 'EPSG:3263*') {
      var projection = ol.proj.get('EPSG:32632');
    } else {
      var projection = ol.proj.get(this.projection.value);
    }
    var widget = this['ctrl'].mouseposition;
    widget.setProjection(projection);
    widget.setCoordinateFormat = function(coord) {
      return _coordFormat(coord, $scope.projection.value);
    };
  };
};


app.module.controller('AppProjectionselectorController',
    app.ProjectionselectorDirectiveController);

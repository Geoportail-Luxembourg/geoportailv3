/**
 * @fileoverview This file provides a "elevation" directive. This directive is
 * used to insert Elevation information into the HTML page.
 * Example:
 *
 * <app-elevation app-elevation-map="::mainCtrl.map"map></app-elevation>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.elevationDirective');

goog.require('app');
goog.require('app.projections');
goog.require('ngeo.Debounce');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
app.elevationDirective = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appElevationMap'
    },
    controller: 'AppElevationController',
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<span class="elevation" translate>' +
        'Elevation: {{ctrl.elevation}} m</span>'
  };
};


app.module.directive('appElevation', app.elevationDirective);



/**
 * @ngInject
 * @constructor
 * @param {angular.$http} $http
 * @param {ngeo.Debounce} ngeoDebounce
 */
app.ElevationDirectiveController = function($http, ngeoDebounce) {
  var that = this;
  this['map'].on('pointermove',
      ngeoDebounce(
      function(e) {
        var lonlat = /** @type {ol.Coordinate} */
                (ol.proj.transform(e.coordinate,
                   this.getView().getProjection(), 'EPSG:2169'));
            $http.get('raster', {
              params: {'lon': lonlat[0], 'lat': lonlat[1]}
            }).
            success(goog.bind(function(data) {
              this['elevation'] = data['dhm'] > 0 ?
                  parseInt(data['dhm'] / 100, 0) : 'N/A';
            }, that));
      }, 300, true));
};


app.module.controller('AppElevationController',
    app.ElevationDirectiveController);

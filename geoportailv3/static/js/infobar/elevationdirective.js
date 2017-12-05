/**
 * @fileoverview This file provides a "elevation" directive. This directive is
 * used to insert Elevation information into the HTML page.
 * Example:
 *
 * <app-elevation app-elevation-active="mainCtrl.infobarOpen"
 *     app-elevation-map="::mainCtrl.map"></app-elevation>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.ElevationDirectiveController');
goog.provide('app.elevationDirective');

goog.require('app');
goog.require('app.GetElevation');
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
      'map': '=appElevationMap',
      'active': '=appElevationActive'
    },
    controller: 'AppElevationController',
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<span class="elevation" translate>' +
        'Elevation: {{ctrl.elevation}}</span>'
  };
};


app.module.directive('appElevation', app.elevationDirective);


/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope The scope.
 * @param {angular.$http} $http The angular http service.
 * @param {ngeo.Debounce} ngeoDebounce ngeoDebounce service.
 * @param {app.GetElevation} appGetElevation Elevation service.
 * @param {ngeo.olcs.Service} ngeoOlcsService The service.
 */
app.ElevationDirectiveController =
    function($scope, $http, ngeoDebounce, appGetElevation, ngeoOlcsService) {
      var map = this['map'];

      /**
       * @type {app.GetElevation}
       * @private
       */
      this.getElevation_ = appGetElevation;

      /**
       * @type {string}
       */
      this['elevation'] = '';

      let manager = ngeoOlcsService.getManager();

      // 2D
      map.on('pointermove', ngeoDebounce(function(e) {
        if (!this['active']) {
          return;
        }
        if (manager.is3dEnabled()) {
          let coordinate = map.getCoordinateFromPixel(e.pixel);
          if (!coordinate) {
            return;
          }
          this['elevation'] = Math.round(coordinate[2]) + ' m';
        } else {
          this.getElevation_(e.coordinate).then(
            (elevation) => (this['elevation'] = elevation)
          );
        }
      }, 300, true), this);
    };


app.module.controller('AppElevationController',
    app.ElevationDirectiveController);

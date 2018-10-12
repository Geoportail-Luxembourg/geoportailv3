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

goog.require('app.module');


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
 * @param {angular.$http} $http The angular http service.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeoDebounce service.
 * @param {app.GetElevation} appGetElevation Elevation service.
 */
app.ElevationDirectiveController =
    function($http, ngeoDebounce, appGetElevation) {
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

      // 2D
      map.on('pointermove', ngeoDebounce(function(e) {
        if (!this['active'] || !e.coordinate) {
          return;
        }
        this.getElevation_(e.coordinate).then(
          (elevation) => (this['elevation'] = elevation['formattedElevation'])
        );
      }, 300, true), this);
    };


app.module.controller('AppElevationController',
    app.ElevationDirectiveController);

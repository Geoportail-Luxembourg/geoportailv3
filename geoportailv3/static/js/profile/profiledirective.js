/**
 * @fileoverview This file provides a measure directive. This directive is used
 * to create a measure panel in the page.
 *
 * Example:
 *
 * <app-measure app-measure-map="::mainCtrl.map"></app-measure>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.profileDirective');

goog.require('app');
goog.require('app.interaction.MeasureProfile');

goog.require('ngeo');
goog.require('ngeo.profileDirective');


/**
 * @param {string} appProfileTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.profileDirective = function(appProfileTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'profiledata': '=appProfiledata',
      'profileOpen': '=appProfileOpen'
    },
    controller: 'AppProfileController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appProfileTemplateUrl
  };
};

app.module.directive('appProfile', app.profileDirective);



/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @export
 * @ngInject
 */
app.ProfileController = function($scope) {

  
  /**
   * @param {Object} item
   * @return {number}
   */
  var z = function(item) {
    if ('values' in item && 'dhm' in item['values']) {
      return item['values']['dhm'];
    }
    return 0;
  };

  /**
    * @param {Object} item
    * @return {number}
    */
  var dist = function(item) {
    if ('dist' in item) {
      return item['dist'];
    }
    return 0;
  };

  /**
   * @type {Object}
   */
  var extractor = {z: z, dist: dist};

  // Using closures for hoverCallback and outCallback since
  // wrapping in angular.bind leads to a closure error.
  // See PR https://github.com/google/closure-compiler/pull/867
  var that = this;

  /**
   * @param {Object} point
   */
  var hoverCallback = function(point) {
    // An item in the list of points given to the profile.
    that['point'] = point;
  };

  var outCallback = function() {
    that['point'] = null;
  };


  this['profileOptions'] = {
    elevationExtractor: extractor,
    hoverCallback: hoverCallback,
    outCallback: outCallback
  };


  this['point'] = null;
};
app.module.controller('AppProfileController', app.ProfileController);

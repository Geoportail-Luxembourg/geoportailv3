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
      'profiledata': '=appProfiledata'
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
    console.log('---->z');
    console.log(item['values']['dhm']);
    return item['values']['dhm'];
  };

  /**
    * @param {Object} item
    * @return {number}
    */
  var dist = function(item) {
    return item['dist'];
  };

  /**
   * @type {ngeox.profile.ProfileExtractor}
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
    console.log('---->hiverCallback');
    console.log(that['point']);
    that['point'] = point;
  };

  var outCallback = function() {
    console.log('---->outCallback');
    that['point'] = null;
  };


  this['profileOptions'] = {
    extractor: extractor,
    hoverCallback: hoverCallback,
    outCallback: outCallback
  };


  this['point'] = null;
};
app.module.controller('AppProfileController', app.ProfileController);

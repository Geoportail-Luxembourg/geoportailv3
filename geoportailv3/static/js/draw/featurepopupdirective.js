/**
 * @fileoverview Provides a feature popup directive.
 */
goog.provide('app.FeaturePopupController');
goog.provide('app.featurePopupDirective');

goog.require('app');


/**
 * @param {string} appFeaturePopupTemplateUrl URL to the directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.featurePopupDirective = function(appFeaturePopupTemplateUrl) {
  return {
    restrict: 'A',
    scope: {
      'feature': '=appFeaturePopupFeature'
    },
    controller: 'AppFeaturePopupController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeaturePopupTemplateUrl
  };
};

app.module.directive('appFeaturePopup', app.featurePopupDirective);



/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {app.FeaturePopup} appFeaturePopup The feature popup service.
 * @export
 * @ngInject
 */
app.FeaturePopupController = function($scope, appFeaturePopup) {

  /**
   * @type {ol.Feature}
   * @export
   */
  this.feature;

  /**
   * @type {boolean}
   * @export
   */
  this.editingAttributes = false;

  /**
   * @type {boolean}
   * @export
   */
  this.editingStyle = false;

  /**
   * @type {string}
   * @export
   */
  this.tempName = '';

  /**
   * @type {string}
   * @export
   */
  this.tempDesc = '';

  this.appFeaturePopup_ = appFeaturePopup;

  $scope.$watch(goog.bind(function() {
    return this.editingAttributes;
  }, this), goog.bind(function(newVal) {
    if (newVal) {
      this.initForm_();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.feature;
  }, this), goog.bind(function(newVal) {
    this.editingAttributes = false;
    this.editingStyle = false;
  }, this));
};


/**
 */
app.FeaturePopupController.prototype.close = function() {
  this.appFeaturePopup_.hide();
};


/**
 * Inits the attributes form (ie. gets the name and description from feature).
 * @private
 */
app.FeaturePopupController.prototype.initForm_ = function() {
  this.tempName = /** @type {string} */ (this.feature.get('name'));
  this.tempDesc = /** @type {string} */ (this.feature.get('description'));
};


/**
 * Puts the temporary edited name and description back to the feature.
 * @export
 */
app.FeaturePopupController.prototype.validateModifications = function() {
  this.feature.set('name', this.tempName);
  this.feature.set('description', this.tempDesc);
  this.editingAttributes = false;
};


app.module.controller('AppFeaturePopupController', app.FeaturePopupController);

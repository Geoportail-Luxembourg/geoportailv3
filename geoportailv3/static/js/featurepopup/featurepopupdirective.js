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
    scope: true,
    controller: 'AppFeaturePopupController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeaturePopupTemplateUrl
  };
};

app.module.directive('appFeaturePopup', app.featurePopupDirective);



/**
 * @constructor
 * @param {app.FeaturePopup} appFeaturePopup The feature popup service
 * @export
 * @ngInject
 */
app.FeaturePopupController = function(appFeaturePopup) {
  this.appFeaturePopup_ = appFeaturePopup;
};


/**
 */
app.FeaturePopupController.prototype.close = function() {
  this.appFeaturePopup_.hide();
};

app.module.controller('AppFeaturePopupController', app.FeaturePopupController);

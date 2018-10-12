goog.provide('app.LayerinfoController');
goog.provide('app.layerinfoDirective');

goog.require('app.module');


/**
 * @param {string} appLayerinfoTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.layerinfoDirective = function(appLayerinfoTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'layer': '=appLayerinfoLayer'
    },
    controller: 'AppLayerinfoController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appLayerinfoTemplateUrl
  };
};

app.module.directive('appLayerinfo', app.layerinfoDirective);


/**
 * @constructor
 * @param {app.ShowLayerinfo} appShowLayerinfo app.ShowLayerinfo service.
 * @ngInject
 * @export
 */
app.LayerinfoController = function(appShowLayerinfo) {
  /**
   * @private
   */
  this.showLayerInfo_ = appShowLayerinfo;
};


/**
 * @export
 */
app.LayerinfoController.prototype.getInfo = function() {
  this.showLayerInfo_(this['layer']);
};


app.module.controller('AppLayerinfoController', app.LayerinfoController);

goog.provide('app.layermanagerDirective');

goog.require('app');


/**
 * @param {string} appLayermanagerTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 */
app.layermanagerDirective = function(appLayermanagerTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appLayermanagerMap',
      'layers': '=appLayermanagerLayers'
    },
    controller: 'AppLayermanagerController',
    controllerAs: 'layermanagerCtrl',
    bindToController: true,
    templateUrl: appLayermanagerTemplateUrl
  };
};


app.module.directive('appLayermanager', app.layermanagerDirective);



/**
 * @constructor
 * @export
 */
app.LayermanagerController = function() {
  this['uid'] = goog.getUid(this);
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
app.LayermanagerController.prototype.removeLayer = function(layer) {
  this['map'].removeLayer(layer);
};


app.module.controller('AppLayermanagerController', app.LayermanagerController);

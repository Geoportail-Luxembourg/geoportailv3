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
      'map': '=appLayermanagerMap'
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
app.LayermanagerController = function() {};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
app.LayermanagerController.prototype.removeLayer = function(layer) {
  this['map'].removeLayer(layer);
};


app.module.controller('AppLayermanagerController', app.LayermanagerController);


/**
 * @return {function(Array):Array}
 */
app.noBgLayerFilter = function() {
  /**
   * @param {Array} items Array to remove the background layer from.
   * @return {Array} Filtered array.
   */
  return function(items) {
    var items_ = items.slice().reverse();
    items_.pop();
    return items_;
  };
};


app.module.filter('noBgLayer', app.noBgLayerFilter);

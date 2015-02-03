/**
 * @fileoverview Provides a layer info service. That service is a function used
 * to retrieve and display the info (metadata) for a layer.
 */

goog.provide('app.ShowLayerinfo');

goog.require('ngeo.CreatePopup');

/**
 * @typedef {function(ol.layer.Layer)}
 */
app.ShowLayerinfo;


/**
 * @param {angular.$http} $http Angular $http service
 * @param {angular.$sce} $sce Angular $sce service
 * @param {ngeo.CreatePopup} ngeoCreatePopup Ngeo popup factory service
 * @ngInject
 */
app.showLayerinfoFactory = function($http, $sce, ngeoCreatePopup) {

  /**
   * @type {ngeo.Popup}
   */
  var popup = ngeoCreatePopup();

  return (

      /**
       * @param {ol.layer.Layer} layer The layer
       */
      function(layer) {
        var title = /** @type {string} */ (layer.get('label'));
        popup.setTitle(title);
        var content = $sce.trustAsHtml("<b>some</b> content");
        popup.setContent(content);
        popup.show();
      });
};

app.module.service('appShowLayerinfo', app.showLayerinfoFactory);

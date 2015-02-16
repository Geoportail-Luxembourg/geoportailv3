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
 * @return {app.ShowLayerinfo} The show layer info function.
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

        $http.jsonp(
            'http://shop.geoportail.lu/Portail/inspire/webservices/getMD.jsp',
            {params: {
              'uid': layer.get('metadata')['metadata_id'],
              'lang': 'fr',
              'cb': 'JSON_CALLBACK'
            }
            }).success(function(data, status, headers, config) {
              if (status == 200) {
                popup.setTitle(title);
                data.root[0]['uid'] = layer.get('metadata')['metadata_id'];
                if ('legend_name' in layer.get('metadata')) {
                  data.root[0]['legend_name'] =
                      layer.get('metadata')['legend_name'];
                  data.root[0]['legend_url'] = $sce.trustAsResourceUrl(
                      '//wiki.geoportail.lu/doku.php?id=fr:legend:' +
                          data.root[0]['legend_name'] + '&do=export_html');
                  data.root[0]['has_legend'] = true;
                }else {
                  data.root[0]['has_legend'] = false;
                }
                popup.setContent(data.root[0]);
                popup.show();
          }else {
                console.log(status);
          }
        }). error(function(data, status, headers, config) {
          console.log(status);
        });

      });
};

app.module.service('appShowLayerinfo', app.showLayerinfoFactory);

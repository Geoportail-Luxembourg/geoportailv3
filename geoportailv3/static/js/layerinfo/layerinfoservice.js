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
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {angular.$http} $http Angular $http service
 * @param {angular.$sce} $sce Angular $sce service
 * @param {ngeo.CreatePopup} ngeoCreatePopup Ngeo popup factory service
 * @return {app.ShowLayerinfo} The show layer info function.
 * @ngInject
 */
app.showLayerinfoFactory = function(gettextCatalog,
                                    $http,
                                    $sce,
                                    ngeoCreatePopup) {

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
        var local_metadata = layer.get('metadata');

        popup.setTitle(title);

        $http.jsonp(
            'http://shop.geoportail.lu/Portail/inspire/webservices/getMD.jsp',
            {params: {
              'uid': local_metadata['metadata_id'],
              'lang': gettextCatalog.currentLanguage,
              'cb': 'JSON_CALLBACK'
            }
            }).success(function(data, status, headers, config) {
              if (status == 200) {
                var remote_metadata = data.root[0];
                remote_metadata['uid'] = local_metadata['metadata_id'];
                if ('legend_name' in local_metadata) {
                  remote_metadata['legend_name'] =
                      local_metadata['legend_name'];
                  remote_metadata['legend_url'] = $sce.trustAsResourceUrl(
                      '//wiki.geoportail.lu/doku.php?id=' +
                          gettextCatalog.currentLanguage + ':legend:' +
                          remote_metadata['legend_name'] + '&do=export_html');
                  remote_metadata['has_legend'] = true;
                }else {
                  remote_metadata['has_legend'] = false;
                }
                remote_metadata['is_error'] = false;
                remote_metadata['is_short_desc'] = true;
                showPopup(remote_metadata);
          }else {
            showPopup({'is_error': true});
          }
        }). error(function(data, status, headers, config) {
          showPopup({'is_error': true});
        });

        /**
         * @param {Object} content Object with metadata information.
         */
        function showPopup(content) {
          popup.setContent(content);
          popup.show();
        };

      });
};

app.module.service('appShowLayerinfo', app.showLayerinfoFactory);

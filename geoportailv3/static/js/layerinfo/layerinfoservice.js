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
  /**
   * @type {Object.<string, !angular.$q.Promise>}
   * @private
   */
  var promises_ = {};

  return (
      /**
       * @param {ol.layer.Layer} layer The layer
       */
      function(layer) {
        var title = /** @type {string} */ (layer.get('label'));
        var local_metadata = /** @type {Object.<string>} */
            (layer.get('metadata'));
        var metadata_uid = /** @type {string} */
            (local_metadata['metadata_id']);
        popup.setTitle(title);

        if (!(metadata_uid in promises_)) {
          promises_[metadata_uid] = $http.jsonp(
              'http://shop.geoportail.lu/Portail/inspire/webservices/getMD.jsp',
              {params: {
                'uid': metadata_uid,
                'lang': gettextCatalog.currentLanguage,
                'cb': 'JSON_CALLBACK'
              }}).then(
                  angular.bind(this, function(resp) {
                    var remote_metadata = resp.data.root[0];
                    remote_metadata['uid'] = local_metadata['metadata_id'];
                    if ('legend_name' in local_metadata) {
                      remote_metadata['legend_name'] =
                      local_metadata['legend_name'];
                      remote_metadata['legend_url'] = $sce.trustAsResourceUrl(
                          '//wiki.geoportail.lu/doku.php?id=' +
                          gettextCatalog.currentLanguage + ':legend:' +
                          remote_metadata['legend_name'] + '&do=export_html'
                      );
                      remote_metadata['has_legend'] = true;
                    }else {
                      remote_metadata['has_legend'] = false;
                    }
                    remote_metadata['is_error'] = false;
                    remote_metadata['is_short_desc'] = true;
                    showPopup(remote_metadata);
                    return remote_metadata;
                  }));
        }

        promises_[metadata_uid].then(
            function(remote_metadata) {
              showPopup(remote_metadata);
            },
            function(error) {
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

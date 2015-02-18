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
   * @type {Object.<!string, Object.<string, !angular.$q.Promise>>}
   * @private
   */
  var promises_ = {};

  return (
      /**
       * @param {ol.layer.Layer} layer The layer
       */
      function(layer) {
        var title = /** @type {string} */ (layer.get('label'));
        var localMetadata = /** @type {Object.<string>} */
            (layer.get('metadata'));
        var metadataUid = /** @type {string} */
            (localMetadata['metadata_id']);
        popup.setTitle(title);
        var currentLanguage = /** @type {string} */
            (gettextCatalog.currentLanguage);

        if (!(currentLanguage in promises_)) {
          promises_[currentLanguage] = {};
        }

        if (!(metadataUid in promises_[currentLanguage])) {
          promises_[currentLanguage][metadataUid] = $http.jsonp(
              'http://shop.geoportail.lu/Portail/inspire/webservices/getMD.jsp',
              {params: {
                'uid': metadataUid,
                'lang': currentLanguage,
                'cb': 'JSON_CALLBACK'
              }}).then(
                  angular.bind(this, function(resp) {
                    var remoteMetadata = resp.data.root[0];
                    remoteMetadata['uid'] = localMetadata['metadata_id'];
                    if ('legend_name' in localMetadata) {
                      remoteMetadata['legend_name'] =
                      localMetadata['legend_name'];
                      remoteMetadata['legend_url'] = $sce.trustAsResourceUrl(
                          '//wiki.geoportail.lu/doku.php?id=' +
                          gettextCatalog.currentLanguage + ':legend:' +
                          remoteMetadata['legend_name'] + '&do=export_html'
                      );
                      remoteMetadata['has_legend'] = true;
                    }else {
                      remoteMetadata['has_legend'] = false;
                    }
                    remoteMetadata['is_error'] = false;
                    remoteMetadata['is_short_desc'] = true;
                    showPopup(remoteMetadata);
                    return remoteMetadata;
                  }));
        }

        promises_[currentLanguage][metadataUid].then(
            function(remoteMetadata) {
              showPopup(remoteMetadata);
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

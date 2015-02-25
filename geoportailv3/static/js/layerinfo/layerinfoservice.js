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
 * @param {angular.Scope} $rootScope The rootScope provider.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeo.CreatePopup} ngeoCreatePopup Ngeo popup factory service
 * @constructor
 * @ngInject
 */
app.showLayerinfoFactory = function($http, $sce, $rootScope,
    gettextCatalog, ngeoCreatePopup) {

  /**
   * @type {ngeo.Popup}
   */
  var popup = ngeoCreatePopup();
  /**
   * @type {Object.<string, !angular.$q.Promise>}
   * @private
   */
  var promises_ = {};

  /**
   * @type {ol.layer.Layer}
   */
  var currentLayer = null;

  $rootScope.$on('gettextLanguageChanged', function() {
    if (!goog.isNull(currentLayer)) {
      showLayerInfo(currentLayer);
    }
  });

  return showLayerInfo;

  /**
   * @param {ol.layer.Layer} layer The layer
   * @this {Object}
   */
  function showLayerInfo(layer) {
    currentLayer = layer;
    var title = /** @type {string} */ (layer.get('label'));
    var localMetadata = /** @type {Object.<string>} */
        (layer.get('metadata'));
    var metadataUid = /** @type {string} */
        (localMetadata['metadata_id']);
    popup.setTitle(title);
    var currentLanguage = /** @type {string} */
        (gettextCatalog.currentLanguage);
    var promiseKey = /** @type {string} */
        (metadataUid + '##' + currentLanguage);

    if (!(promiseKey in promises_)) {
      promises_[promiseKey] = $http.jsonp(
          'http://shop.geoportail.lu/Portail/inspire/webservices/getMD.jsp',
          {params: {
            'uid': metadataUid,
            'lang': currentLanguage,
            'cb': 'JSON_CALLBACK'
          }}).then(
              goog.bind(function(resp) {

                var content = {
                  'uid' : localMetadata['metadata_id'],
                  'legendUrl' : null,
                  'hasLegend' : false,
                  'isError' : false,
                  'isShortDesc' : true,
                  'layerMetadata' : null
                };

                var remoteMetadata = resp.data.root[0];
                content['layerMetadata'] = remoteMetadata;

                if ('legend_name' in localMetadata) {
                  content['legendUrl'] = $sce.trustAsResourceUrl(
                      '//wiki.geoportail.lu/doku.php?id=' +
                      gettextCatalog.currentLanguage + ':legend:' +
                      localMetadata['legend_name'] + '&do=export_html'
                  );
                  content['hasLegend'] = true;
                }

                showPopup(content);
                return content;
              },this));
    }

    promises_[promiseKey].then(
        function(content) {
          showPopup(content);
        },
        function(error) {
          showPopup({'isError': true});
        });

    /**
     * @param {Object} content Object with metadata information.
     */
    function showPopup(content) {
      popup.setContent(content);
      popup.show();
    };

  }
};

app.module.service('appShowLayerinfo', app.showLayerinfoFactory);

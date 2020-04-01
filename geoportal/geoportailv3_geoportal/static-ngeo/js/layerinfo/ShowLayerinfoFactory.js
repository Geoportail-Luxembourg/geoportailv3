/**
 * @module app.layerinfo.ShowLayerinfoFactory
 */
let exports = {};

/**
 * @fileoverview Provides a layer info service. That service is a function used
 * to retrieve and display the info (metadata) for a layer.
 */

import appModule from '../module.js';


/**
 * @param {angular.$http} $http Angular $http service
 * @param {angular.$sce} $sce Angular $sce service
 * @param {angular.Scope} $rootScope The root Scope.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeox.PopupFactory} ngeoCreatePopup Ngeo popup factory service
 * @param {app.WmsHelper} appWmsHelper The wms herlper service.
 * @param {app.WmtsHelper} appWmtsHelper The wmts herlper service.
 * @param {string} geonetworkBaseUrl catalog base server url.
 * @return {app.layerinfo.ShowLayerinfo} The show layer info function.
 * @ngInject
 */
function factory($http, $sce, $rootScope,
    gettextCatalog, ngeoCreatePopup, appWmsHelper, appWmtsHelper, geonetworkBaseUrl) {
    const isIpv6 = location.search.includes('ipv6=true');
    const domain = (isIpv6) ? "app.geoportail.lu" : "geoportail.lu";

  /**
   * @type {ngeo.message.Popup}
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
    if (currentLayer !== null && popup.getOpen()) {
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
    var localMetadata = /** @type {Object.<string, string>} */
        (layer.get('metadata'));

    var metadataUid = localMetadata['metadata_id'];
    var legend_name = ('legend_name' in localMetadata) ?
        localMetadata['legend_name'] : '';
    popup.setTitle(title);
    var currentLanguage = gettextCatalog.currentLanguage;
    var promiseKey = metadataUid + '##' + currentLanguage + '##' + legend_name;

    if (!(promiseKey in promises_)) {
      if (localMetadata['isExternalWmts']) {
        promises_[promiseKey] = appWmtsHelper.getMetadata(metadataUid);
      } else if (localMetadata['isExternalWms']) {
        promises_[promiseKey] = appWmsHelper.getMetadata(metadataUid);
      } else {
        // TODO: remove the quotes around jsonpCallbackParam when
        // https://github.com/google/closure-compiler/pull/2400 is merged
        promises_[promiseKey] = $http.jsonp(
            '/getMetadata',
          {params: {
            'uid': metadataUid,
            'lang': currentLanguage
          }, 'jsonpCallbackParam': 'cb'}).then(
                function(resp) {
                  var content = {
                    'uid': localMetadata['metadata_id'],
                    'legendUrl': null,
                    'hasLegend': false,
                    'isError': false,
                    'isShortDesc': true,
                    'layerMetadata': null,
                    'geonetworkBaseUrl': geonetworkBaseUrl
                  };

                  var remoteMetadata = resp.data['metadata'];
                  content['layerMetadata'] = remoteMetadata;
                  if ('abstract' in content['layerMetadata']) {
                    content['layerMetadata']['trusted_description'] =
                    $sce.trustAsHtml(content['layerMetadata']['abstract']);
                    content['layerMetadata']['short_trusted_description'] =
                    $sce.trustAsHtml(content['layerMetadata']['abstract'].
                    substring(0, 220));
                  }
                  var links = [];
                  if ('link' in content['layerMetadata']) {
                    content['layerMetadata']['link'].forEach (function(link) {
                        var currentLink = link.split('|');
                        if (currentLink[3]=='WWW:LINK-1.0-http--link' && links.indexOf(currentLink[2]) == -1) {
                            links.push(currentLink[2]);
                        }
                    }, this);
                    content['layerMetadata']['link'] = links;
                  }
                  if ('legend_name' in localMetadata) {
                    var currentLanguage = gettextCatalog.currentLanguage;
                    currentLanguage =
                    currentLanguage === 'lb' ? 'lu' : currentLanguage;
                    content['legendUrl'] = $sce.trustAsResourceUrl(
                        '//wiki.' + domain + '/doku.php?id=' +
                        currentLanguage + ':legend:' +
                        localMetadata['legend_name'] + '&do=export_html'
                    );
                    content['hasLegend'] = true;
                  }

                  return content;
                }.bind(this));
      }
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
      popup.setOpen(true);
    }

  }
}

appModule.factory('appShowLayerinfo', factory);


export default exports;

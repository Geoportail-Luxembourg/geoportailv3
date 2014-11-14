goog.provide('app_main_controller');

goog.require('app');
goog.require('ngeo_map_directive');
goog.require('ol.proj');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.source.OSM');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');

(function() {
  var module = angular.module('app');

  module.controller('MainController', ['$scope', 'gettextCatalog',
    'langUrlTemplate',
    /**
     * @param {angular.Scope} $scope Scope.
     * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
     * @param {string} langUrlTemplate Language URL template.
     */
    function($scope, gettextCatalog, langUrlTemplate) {
      var switchLanguage = $scope['switchLanguage'] = function(lang) {
        gettextCatalog.setCurrentLanguage(lang);
        gettextCatalog.loadRemote(langUrlTemplate.replace('__lang__', lang));
        $scope['lang'] = lang;
      };

      /** @type {ol.proj.Projection} */
      var projection = ol.proj.get('EPSG:3857');
      var projectionExtent =  [300000,6000000,1000000,6700000];
      /** @type {ol.Map} */
      $scope['map'] = new ol.Map({
        layers: [
          new ol.layer.Tile({
            title: 'basemap (mapproxy) - global scheme',
            opacity: 0.7,
            extent: projectionExtent,
            visible: true,
            source: new ol.source.WMTS({
              url: 'http://wmts.geoportail.lu/mapproxy_4_v3/wmts/{Layer}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
              layer: 'basemap_global',
              matrixSet: 'GLOBAL_WEBMERCATOR',
              requestEncoding: /** @type {ol.source.WMTSRequestEncoding} */ ('REST'),
              format: 'image/png',
              projection: projection,
              tileGrid: new ol.tilegrid.WMTS({
                origin: [-20037508.3428, 20037508.3428],
                resolutions: [156543.033928, 78271.516964, 39135.758482, 19567.879241, 9783.9396205,
4891.96981025, 2445.98490513, 1222.99245256, 611.496226281, 305.748113141, 152.87405657,
76.4370282852, 38.2185141426, 19.1092570713, 9.55462853565, 4.77731426782, 2.38865713391,
1.19432856696, 0.597164283478, 0.298582141739],
                matrixIds: [
                                0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,16,17,18,19
                              ]
              }),
              style: 'default'
            })
          })
 
        ],
        view: new ol.View({
          center: ol.proj.transform([6, 49.7], 'EPSG:4326', 'EPSG:3857'),
          zoom: 8
        })
      });

      switchLanguage('fr');
    }]);

})();

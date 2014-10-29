goog.provide('main');

goog.require('ngeo_map_directive');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.source.OSM');

(function() {
  var module = angular.module('app', ['ngeo', 'gettext']);

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

      /** @type {ol.Map} */
      $scope['map'] = new ol.Map({
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          })
        ],
        view: new ol.View({
          center: [0, 0],
          zoom: 4
        })
      });

      switchLanguage('fr');
    }]);

})();

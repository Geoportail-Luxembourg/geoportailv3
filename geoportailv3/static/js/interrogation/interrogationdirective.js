goog.provide('app.interrogationDirective');


/**
 * @param {string} appInterrogationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.interrogationDirective = function(appInterrogationTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appInterrogationMap',
      'selectedLayers': '=appInterrogationSelectedlayers',
      'infoOpen': '=appInterrogationOpen'
    },
    controller: 'AppInterrogationController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appInterrogationTemplateUrl
  };
};
app.module.directive('appInterrogation', app.interrogationDirective);



/**
 * @constructor
 * @param {angular.$http} $http Angular $http service
 * @param {string} appInterrogationTemplatesPath Path to find the intterogation templates.
 * @export
 * @ngInject
 */
app.InterrogationController = function($http, appInterrogationTemplatesPath) {

  this['content'] = [];
  this['templatePath'] = appInterrogationTemplatesPath;

  var map = this['map'];
  var layers = map.getLayers().getArray();

  var layersList = [];
  var box = [];
  map.on('singleclick', goog.bind(function(evt) {
    layersList = [];
    var buffer = 1;
    var coordinate = (ol.proj.transform(evt.coordinate,
        map.getView().getProjection(), 'EPSG:2169'));
    box = [];
    box.push(coordinate[0] - buffer);
    box.push(coordinate[1] - buffer);
    box.push(coordinate[0] + buffer);
    box.push(coordinate[1] + buffer);

    for (var i = 0; i < layers.length; i++) {
      var metadata = layers[i].get('metadata');
      if (goog.isDefAndNotNull(metadata)) {
        if (metadata['is_queryable'] == 'true') {
          layersList.push(layers[i].getSource().getLayer());
        }
      }
    }

    $http.get(
        'http://workshop.geoportal.lu:8081/getfeatureinfo',
        {params: {
          'layers': layersList.join(),
          'box': box.join()
        }}).then(
        goog.bind(function(resp) {
          this['content'] = resp.data;
          this['infoOpen'] = true;
        },this));
  },this));
};


app.module.controller('AppInterrogationController', app.InterrogationController);

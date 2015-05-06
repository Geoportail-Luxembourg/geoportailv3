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
}
app.module.directive('appInterrogation', app.interrogationDirective);


/**
 * @constructor
 * @param {angular.$http} $http Angular $http service
 * @param {string} appInterrogationTemplateUrl Url to interrogation template
 * @export
 * @ngInject
 */
app.InterrogationController = function($http, appInterrogationTemplateUrl) {

  this['content'] = [];
  var map = this['map'];
  var layers = map.getLayers().getArray();

  var layersList = [];
  map.on('singleclick', goog.bind(function(evt) {
    layersList = [];
    for (var i = 0;i<layers.length;i++){
      var metadata = layers[i].get('metadata');
      if (goog.isDefAndNotNull(metadata)){
        if (metadata["is_queryable"] == "true"){
          layersList.push(layers[i].getSource().getLayer());
        }
      }
    }

    $http.get(
      'http://workshop.geoportal.lu:8081/getfeatureinfo',
      {params: {
            'layers': layersList.join()
      }}).then(
        goog.bind(function(resp) {
          console.log(evt.coordinate);
          console.log(resp.data);
          this['content'] = resp.data;
          this['infoOpen']=true;
        },this));
  },this));

}


app.module.controller('AppInterrogationController', app.InterrogationController);

/**
 * @fileoverview This file provides a "search" directive. This directive is
 * used to insert a Search bar into a HTML page.
 * Example:
 *
 * <app-search app-search-map="::mainCtrl.map"></app-search>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.searchDirective');

goog.require('app');
goog.require('ngeo.CreateGeoJSONBloodhound');
goog.require('ngeo.searchDirective');

/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appSearchTemplateUrl
 * @ngInject
 */
app.searchDirective = function(appSearchTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appSearchMap'
    },
    controller: 'AppSearchController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appSearchTemplateUrl,
    link:
        /**
         * @param {angular.Scope} scope Scope.
         * @param {angular.JQLite} element Element.
         * @param {angular.Attributes} attrs Atttributes.
         */
        function(scope, element, attrs) {
          // Empty the search field on focus and blur.
          element.find('input').on('focus blur', function() {
            $(this).val('');
          });
        }
  };
};


app.module.directive('appSearch', app.searchDirective);

 

/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope Angular root scope.
 * @param {angular.$compile} $compile Angular compile service.
 * @param {ngeo.CreateGeoJSONBloodhound} ngeoCreateGeoJSONBloodhound The ngeo
 *     create GeoJSON Bloodhound service.
 * @export
 */
app.SearchDirectiveController = function($scope, $compile, 
  ngeoCreateGeoJSONBloodhound) {


  /**
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = this.createFeatureOverlay_();

  /** @type {Bloodhound} */
  var bloodhoundEngine = this.createAndInitBloodhound_(
      ngeoCreateGeoJSONBloodhound);

  /** @type {TypeaheadOptions} */
  this['options'] = {
    highlight: true
  };

  /** @type {Array.<TypeaheadDataset>} */
  this['datasets'] = [{
    source: bloodhoundEngine.ttAdapter(),
    displayKey: function(suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      return feature.get('label');
    },
    templates: {
      header: function() {
        return '<div class="header">Addresses</div>';
      },
      suggestion: function(suggestion) {
        var feature = /** @type {ol.Feature} */ (suggestion);

        // A scope for the ng-click on the suggestion's « i » button.
        var scope = $scope.$new(true);
        scope['feature'] = feature;
        scope['click'] = function(event) {
          window.alert(feature.get('label'));
          event.stopPropagation();
        };

        var html = '<p>' + feature.get('label') +
            '<button ng-click="click($event)">i</button></p>';
        return $compile(html)(scope);
      }
    }
  }];

  this['listeners'] = /** @type {ngeox.SearchDirectiveListeners} */ ({
    selected: goog.bind(app.SearchDirectiveController.selected_, this)
  });

};


/**
 * @return {ol.FeatureOverlay} The feature overlay.
 * @private
 */
app.SearchDirectiveController.prototype.createFeatureOverlay_ = function() {
  var featureOverlay = new ol.FeatureOverlay();
  featureOverlay.setMap(this['map']);
  return featureOverlay;
};


/**
 * @param {ngeo.CreateGeoJSONBloodhound} ngeoCreateGeoJSONBloodhound The ngeo
 *     create GeoJSON Bloodhound service.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.SearchDirectiveController.prototype.createAndInitBloodhound_ =
    function(ngeoCreateGeoJSONBloodhound) {
  var url = 'fulltextsearch?query=%QUERY';
  var bloodhound = ngeoCreateGeoJSONBloodhound(url, ol.proj.get('EPSG:3857'));
  bloodhound.initialize();
  return bloodhound;
};


/**
 * @param {jQuery.event} event Event.
 * @param {Object} suggestion Suggestion.
 * @param {TypeaheadDataset} dataset Dataset.
 * @this {app.SearchDirectiveController}
 * @private
 */
app.SearchDirectiveController.selected_ = function(event, suggestion, dataset) {
  var map = /** @type {ol.Map} */ (this['map']);
  var feature = /** @type {ol.Feature} */ (suggestion);
  var features = this.featureOverlay_.getFeatures();
  var featureGeometry = /** @type {ol.geom.SimpleGeometry} */
      (feature.getGeometry());
  var mapSize = /** @type {ol.Size} */ (map.getSize());
  features.clear();
  features.push(feature);
  map.getView().fitGeometry(featureGeometry, mapSize,
      /** @type {olx.view.FitGeometryOptions} */ ({maxZoom: 16}));
};

app.module.controller('AppSearchController',
    app.SearchDirectiveController);

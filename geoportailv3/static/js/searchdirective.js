/**
 * @fileoverview This file provides a "search" directive. This directive is
 * used to insert a Search bar into a HTML page.
 * Example:
 *
 * <app-search app-search-map="::mainCtrl.map"
 *   app-search-theme="mainCtrl.currentTheme"></app-search>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.searchDirective');

goog.require('app');
goog.require('app.Themes');
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
      'map': '=appSearchMap',
      'theme': '=appSearchTheme'
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
 * @param {app.Themes} appThemes Themes service.
 * @param {angular.$compile} $compile Angular compile service.
 * @param {ngeo.CreateGeoJSONBloodhound} ngeoCreateGeoJSONBloodhound The ngeo
 *     create GeoJSON Bloodhound service.o
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @export
 */
app.SearchDirectiveController = function($scope, appThemes, $compile, 
    ngeoCreateGeoJSONBloodhound, gettextCatalog) {
  /**
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = this.createFeatureOverlay_();

  /** @type {Bloodhound} */
  var POIBloodhoundEngine = this.createAndInitPOIBloodhound_(
      ngeoCreateGeoJSONBloodhound);
  /** @type {Bloodhound} */
  var LayerBloodhoundEngine = this.createAndInitLayerBloodhound_();

  //watch for theme & language change to update layer search
  $scope.$watch(goog.bind(function() {
    return this['theme'];
  },this), goog.bind(function() {
    this.createLocalLayerData_(
        appThemes, LayerBloodhoundEngine, gettextCatalog);
  }, this));

  $scope.$on('gettextLanguageChanged', goog.bind(function(event, args) {
    this.createLocalLayerData_(
        appThemes, LayerBloodhoundEngine, gettextCatalog);
  }, this));


  /** @type {TypeaheadOptions} */
  this['options'] = {
    highlight: true
  };

  /** @type {Array.<TypeaheadDataset>} */
  this['datasets'] = [{
    source: POIBloodhoundEngine.ttAdapter(),
    displayKey: function(suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      return feature.get('label');
    },
    templates: {
      header: function() {
        return '<div class="header" translate>Addresses</div>';
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
  },{
    source: LayerBloodhoundEngine.ttAdapter(),
    displayKey: 'name',
    templates: {
      header: function() {
        return '<div class="header" translate>Layers</div>';
      },
      suggestion: function(suggestion) {
        var scope = $scope.$new(true);
        scope['object'] = suggestion;
        scope['click'] = function(event) {
          window.alert(suggestion['name']);
          event.stopPropagation();
        };

        var html = '<p>' + suggestion['name'] +
            '<button ng-click="click($event)">i</button></p>';
        return $compile(html)(scope);
      }
    }
  }
  ];

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
app.SearchDirectiveController.prototype.createAndInitPOIBloodhound_ =
    function(ngeoCreateGeoJSONBloodhound) {
  var url = 'fulltextsearch?query=%QUERY';
  var bloodhound = ngeoCreateGeoJSONBloodhound(url, ol.proj.get('EPSG:3857'));
  bloodhound.initialize();
  return bloodhound;
};


/**
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.SearchDirectiveController.prototype.createAndInitLayerBloodhound_ =
    function() {
  var bloodhound = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: []
  });
  bloodhound.initialize();
  return bloodhound;
};


/**
 * @param {app.Themes} appThemes Themes Service
 * @param {Bloodhound} bloodhound
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @private
 */
app.SearchDirectiveController.prototype.createLocalLayerData_ =
    function(appThemes, bloodhound, gettextCatalog) {
  appThemes.getThemeObject(this['theme']).then(
      goog.bind(function(theme) {
        var layers = app.SearchDirectiveController.getAllChildren_(
            theme.children, gettextCatalog);
        bloodhound.clear();
        bloodhound.add(layers);
      }, this)
  );
};


/**
 * @param {Array} element
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @return {Array} array
 * @private
 */
app.SearchDirectiveController.getAllChildren_ =
    function(element, gettextCatalog) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      array = array.concat(app.SearchDirectiveController.getAllChildren_(
          element[i].children, gettextCatalog));
    } else {
      array.push({
        'name': gettextCatalog.getString(element[i].name),
        'metadata': element[i].metadata,
        'layer_name': element[i].name,
        'id': element[i].id
      });
    }
  }
  return array;
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

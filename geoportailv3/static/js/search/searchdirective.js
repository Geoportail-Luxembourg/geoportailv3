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
goog.require('app.GetLayerForCatalogNode');
goog.require('app.ShowLayerinfo');
goog.require('app.Themes');
goog.require('ngeo.CreateGeoJSONBloodhound');
goog.require('ngeo.searchDirective');


/**
 * @return {angular.Directive} The Directive Object Definition
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
         * @param {angular.Scope} scope Scope
         * @param {angular.JQLite} element Element
         * @param {angular.Attributes} attrs Atttributes
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
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode
 * @param {app.ShowLayerinfo} appShowLayerinfo
 * @param {string} searchServiceUrl
 * @export
 */
app.SearchDirectiveController =
    function($scope, appThemes, $compile,
        ngeoCreateGeoJSONBloodhound, gettextCatalog,
        appGetLayerForCatalogNode, appShowLayerinfo, searchServiceUrl) {
  /**
   * @type {Array}
   */
  this.layers = [];

  /**
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = this.createFeatureOverlay_();

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  /**
   * @type {app.ShowLayerinfo}
   * @private
   */
  this.showLayerinfo_ = appShowLayerinfo;

  /** @type {Bloodhound} */
  var POIBloodhoundEngine = this.createAndInitPOIBloodhound_(
      ngeoCreateGeoJSONBloodhound, searchServiceUrl);
  /** @type {Bloodhound} */
  var LayerBloodhoundEngine = this.createAndInitLayerBloodhound_();

  $scope.$on('gettextLanguageChanged', goog.bind(function(event, args) {
    this.createLocalAllLayerData_(
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
        return '<div class="header">' +
            gettextCatalog.getString('Addresses') +
            '</div>';
      },
      suggestion: function(suggestion) {
        var feature = /** @type {ol.Feature} */ (suggestion);

        // A scope for the ng-click on the suggestion's « i » button.
        var scope = $scope.$new(true);
        scope['feature'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        };

        var html = '<p>' + feature.get('label') +
            ' <span>(' + gettextCatalog.getString(
                /** @type {string} */ (feature.get('layer_name'))
            ) + ')</span></p>';
        return $compile(html)(scope);
      }
    }
  },{
    source: LayerBloodhoundEngine.ttAdapter(),
    displayKey: 'translated_name',
    templates: {
      header: function() {
        return '<div class="header">' +
            gettextCatalog.getString('Layers') +
            '</div>';
      },
      suggestion: goog.bind(function(suggestion) {
        var scope = $scope.$new(true);
        scope['object'] = suggestion;
        scope['click'] = goog.bind(function(event) {
          this.showLayerinfo_(this.getLayerFunc_(suggestion));
          event.stopPropagation();
        }, this);

        var html = '<p>' + suggestion['translated_name'] +
            '<button ng-click="click($event)">i</button></p>';
        return $compile(html)(scope);
      }, this)
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
 * @param {string} searchServiceUrl
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.SearchDirectiveController.prototype.createAndInitPOIBloodhound_ =
    function(ngeoCreateGeoJSONBloodhound, searchServiceUrl) {
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
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('translated_name'),
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
app.SearchDirectiveController.prototype.createLocalAllLayerData_ =
    function(appThemes, bloodhound, gettextCatalog) {
  appThemes.getThemesObject().then(
      goog.bind(function(themes) {
        for (var i = 0; i < themes.length; i++) {
          var theme = themes[i];
          goog.array.extend(this['layers'],
              app.SearchDirectiveController.getAllChildren_(
              theme.children, gettextCatalog
              )
          );
        }
        var dedup = [];
        goog.array.removeDuplicates(this['layers'], dedup, function(element) {
          return element['id'];
        });
        this['layers'] = dedup;
        bloodhound.clear();
        bloodhound.add(this['layers']);
      }, this)
  );
};


/**
 * @param {(Object|string)} input
 * @private
 */
app.SearchDirectiveController.prototype.addLayerToMap_ = function(input) {
  var layer = {};
  if (typeof input === 'string') {
    var node = goog.array.find(this['layers'], function(element) {
      return goog.object.containsKey(element, 'name') &&
          goog.object.containsValue(element, input);
    });
    if (!node) return; //stop error propagating if no node is found
    layer = this.getLayerFunc_(node);
  } else if (typeof input === 'object') {
    layer = this.getLayerFunc_(input);
  }
  var map = this['map'];
  if (map.getLayers().getArray().indexOf(layer) <= 0) {
    map.addLayer(layer);
  }
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
      goog.array.extend(array, app.SearchDirectiveController.getAllChildren_(
          element[i].children, gettextCatalog)
      );
    } else {
      element[i].translated_name = gettextCatalog.getString(element[i].name);
      array.push(element[i]);
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
app.SearchDirectiveController.selected_ =
    function(event, suggestion, dataset) {
  if (suggestion instanceof ol.Feature) {
    var layerLookup = {
      'Adresse': ['addresses'],
      'Parcelle': ['parcels', 'parcels_labels'],
      'lieu_dit': ['toponymes'],
      'FLIK': ['asta_flik_parcels_2015'],
      'asta_esp': ['asta_esp_esp']
    };
    var showGeom = ['hydro', 'Adresse', 'FLIK', 'biotope',
      'hydro_km', 'asta_esp', 'Parcelle'];
    var map = /** @type {ol.Map} */ (this['map']);
    var feature = /** @type {ol.Feature} */ (suggestion);
    var featureGeometry = /** @type {ol.geom.SimpleGeometry} */
        (feature.getGeometry());
    var mapSize = /** @type {ol.Size} */ (map.getSize());
    var features = this.featureOverlay_.getFeatures();
    features.clear();
    if (goog.array.contains(showGeom, feature.get('layer_name'))) {
      features.push(feature);
    }
    map.getView().fitGeometry(featureGeometry, mapSize,
        /** @type {olx.view.FitGeometryOptions} */ ({maxZoom: 18}));
    var layers = layerLookup[suggestion.get('layer_name')];
    goog.array.forEach(layers, goog.bind(function(layer) {
      this.addLayerToMap_(layer);
    }, this));
  } else {
    this.addLayerToMap_(suggestion);
  }
};


app.module.controller('AppSearchController',
    app.SearchDirectiveController);

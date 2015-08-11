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
goog.require('app.CoordinateString');
goog.require('app.GetLayerForCatalogNode');
goog.require('app.ShowLayerinfo');
goog.require('app.Themes');
goog.require('app.VectorOverlay');
goog.require('app.VectorOverlayMgr');
goog.require('goog.array');
goog.require('goog.object');
goog.require('ngeo.BackgroundLayerMgr');
goog.require('ngeo.CreateGeoJSONBloodhound');
goog.require('ngeo.searchDirective');


/**
 * @typedef {{bgLayer: ol.layer.Layer, translatedName: string}}
 */
app.BackgroundLayerSuggestion;


/**
 * @return {angular.Directive} The Directive Object Definition
 * @param {string} appSearchTemplateUrl
 * @ngInject
 */
app.searchDirective = function(appSearchTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appSearchMap',
      'language': '=appSearchLanguage',
      'mobileActive': '=appSearchMobileactive'
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
          // Empty the search field on focus
          element.find('input').on('focus', function() {
            $(this).val('');
            $(this).addClass('placeholder-text');
          });
          element.find('span.clear-button').on('click',
              goog.bind(function(scope) {
                $(this).find('input').val('').trigger('input');
                var ctrl = /** @type {app.SearchDirectiveController} */
                    (scope['ctrl']);
                ctrl.vectorOverlay_.clear();
              }, element, scope));

          element.find('input').on(
              'input propertyChange focus blur', function() {
                var clearButton =
                    $(this).parents('.form-group').find('span.clear-button');
                if ($(this).val() === '') {
                  clearButton.css('display', 'none');
                } else {
                  clearButton.css('display', 'block');
                }
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
 *     create GeoJSON Bloodhound service
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr
 * @param {ngeo.CreateGeoJSONBloodhound} ngeoCreateGeoJSONBloodhound The ngeo
 * @param {app.CoordinateString} appCoordinateString
 * @param {app.Themes} appThemes Themes service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode
 * @param {app.ShowLayerinfo} appShowLayerinfo
 * @param {app.VectorOverlayMgr} appVectorOverlayMgr Vector overlay manager.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {string} searchServiceUrl
 * @export
 */
app.SearchDirectiveController = function($scope, $compile, gettextCatalog,
    ngeoBackgroundLayerMgr, ngeoCreateGeoJSONBloodhound, appCoordinateString,
    appThemes, appGetLayerForCatalogNode, appShowLayerinfo, appVectorOverlayMgr,
    maxExtent, searchServiceUrl) {

  /**
   * @type {Object}
   * @private
   */
  this.layerLookup_ = {
    'Adresse': ['addresses'],
    'Parcelle': ['parcels', 'parcels_labels'],
    'lieu_dit': ['toponymes'],
    'FLIK': ['asta_flik_parcels_2015'],
    'asta_esp': ['asta_esp_esp'],
    'editus_poi_285': ['editus_poi_285'],
    'editus_poi_286': ['editus_poi_286'],
    'editus_poi_287': ['editus_poi_287'],
    'editus_poi_289': ['editus_poi_289'],
    'editus_poi_290': ['editus_poi_290'],
    'editus_poi_291': ['editus_poi_291'],
    'editus_poi_292': ['editus_poi_292'],
    'editus_poi_293': ['editus_poi_293'],
    'editus_poi_294': ['editus_poi_294'],
    'editus_poi_295': ['editus_poi_295'],
    'editus_poi_296': ['editus_poi_296'],
    'editus_poi_297': ['editus_poi_297'],
    'editus_poi_298': ['editus_poi_298'],
    'editus_poi_299': ['editus_poi_299']
  };

  /**
   * @type {Array.<string>}
   * @private
   */
  this.showGeom_ = [
    'hydro',
    'Adresse',
    'FLIK',
    'biotope',
    'editus_poi_285',
    'editus_poi_286',
    'editus_poi_287',
    'editus_poi_289',
    'editus_poi_290',
    'editus_poi_291',
    'editus_poi_292',
    'editus_poi_293',
    'editus_poi_294',
    'editus_poi_295',
    'editus_poi_296',
    'editus_poi_297',
    'editus_poi_298',
    'editus_poi_299',
    'hydro_km',
    'asta_esp',
    'Parcelle'
  ];

  /**
   * @type {ol.Extent}
   * @private
   */
  this.maxExtent_ =
      ol.proj.transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

  /**
   * @type {Array.<ol.layer.Layer>}
   * @private
   */
  this.layers_ = [];

  /**
   * @type {ngeo.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.VectorOverlay}
   * @private
   */
  this.vectorOverlay_ = appVectorOverlayMgr.getVectorOverlay();

  var fillStyle = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });

  var strokeStyle = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  this.vectorOverlay_.setStyle(
      new ol.style.Style({
        fill: fillStyle,
        stroke: strokeStyle,
        image: new ol.style.Circle({
          radius: 10,
          fill: fillStyle,
          stroke: strokeStyle
        })
      }));

  /**
   * @type {app.CoordinateString}
   * @private
   */
  this.coordinateString_ = appCoordinateString;

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

  /** @type {Fuse} */
  var layerFuseEngine =
      new Fuse(this.layers_, {
        keys: ['translatedName'],
        threshold: 0.4,
        distance: 100,
        includeScore: true
      });

  /** @type {Fuse} */
  var backgroundLayerEngine =
      new Fuse([], {
        keys: ['translatedName'],
        threshold: 0.4,
        distance: 100,
        includeScore: true
      });

  $scope.$on('gettextLanguageChanged', goog.bind(function(evt) {
    this.createLocalAllLayerData_(
        appThemes, layerFuseEngine, gettextCatalog);
    this.createLocalBackgroundLayerData_(
        appThemes, backgroundLayerEngine, gettextCatalog);
  }, this));

  goog.events.listen(appThemes, app.ThemesEventType.LOAD,
      /**
     * @param {goog.events.Event} evt Event
     */
      function(evt) {
        this.createLocalAllLayerData_(
            appThemes, layerFuseEngine, gettextCatalog);
        this.createLocalBackgroundLayerData_(
            appThemes, backgroundLayerEngine, gettextCatalog);
      }, undefined, this);

  /** @type {TypeaheadOptions} */
  this['options'] = {
    highlight: true
  };

  /** @type {Array.<TypeaheadDataset>} */
  this['datasets'] = [{
    name: 'coordinates',
    /**
     * @param {Object} query
     * @param {function(Array<string>)} syncResults
     * @return {Object}
     */
    source: goog.bind(function(query, syncResults) {
      return syncResults(this.matchCoordinate_(query));
    }, this),
    display: function(suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      return feature.get('label');
    },
    templates: /** @type {TypeaheadTemplates} */ ({
      suggestion: goog.bind(function(feature) {
        var scope = $scope.$new(true);
        scope['object'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        };
        var html = '<p>' + feature.get('label') +
            ' (' + feature.get('epsgLabel') + ')</p>';
        return $compile(html)(scope);
      }, this)
    })
  },{
    name: 'layers',
    /**
     * @param {Object} query
     * @param {function(Array<string>)} syncResults
     * @return {Object}
     */
    source: goog.bind(function(query, syncResults) {
      return syncResults(this.matchLayers_(layerFuseEngine, query));
    }, this),
    /**
     * @param {Object} suggestion
     * @return {string}
     */
    display: function(suggestion) {
      return suggestion['translatedName'];
    },
    templates: /** @type {TypeaheadTemplates} */({
      header: function() {
        return '<div class="header">' +
            gettextCatalog.getString('Layers') +
            '</div>';
      },
      suggestion: goog.bind(function(suggestion) {
        var scope = $scope.$new(true);
        scope['object'] = suggestion;
        var html = '<p>' + suggestion['translatedName'];
        scope['click'] = goog.bind(function(event) {
          this.showLayerinfo_(this.getLayerFunc_(suggestion));
          event.stopPropagation();
        }, this);
        html += '<button ng-click="click($event)">i</button>';
        html += '</p>';
        return $compile(html)(scope);
      }, this)
    })
  },{
    name: 'backgroundLayers',
    /**
     * @param {Object} query
     * @param {function(Array<string>)} syncResults
     * @return {Object}
     */
    source: goog.bind(function(query, syncResults) {
      return syncResults(this.matchLayers_(backgroundLayerEngine, query));
    }, this),
    /**
     * @param {app.BackgroundLayerSuggestion} suggestion
     * @return {string}
     */
    display: function(suggestion) {
      return suggestion['translatedName'];
    },
    templates: /** @type {TypeaheadTemplates} */({
      header: function() {
        return '<div class="header">' +
            gettextCatalog.getString('Background Layers') +
            '</div>';
      },
      suggestion: goog.bind(
          /**
          * @param {app.BackgroundLayerSuggestion} suggestion
          */
          function(suggestion) {
            var scope = $scope.$new(true);
            scope['object'] = suggestion;
            var html = '<p>' + suggestion['translatedName'];
            html += ' (' + gettextCatalog.getString('Background') + ') ';
            html += '</p>';
            return $compile(html)(scope);
          }, this)
    })
  },{
    name: 'pois',
    source: POIBloodhoundEngine.ttAdapter(),
    display: function(suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      return feature.get('label');
    },
    templates: /** @type {TypeaheadTemplates} */({
      header: function() {
        return '<div class="header">' +
            gettextCatalog.getString('Addresses') +
            '</div>';
      },
      suggestion: function(suggestion) {
        var feature = /** @type {ol.Feature} */ (suggestion);
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
    })
  }
  ];

  this['listeners'] = /** @type {ngeox.SearchDirectiveListeners} */ ({
    selected: goog.bind(app.SearchDirectiveController.selected_, this)
  });

  goog.events.listen(this['map'].getLayers(),
      ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEvent} e Collection event.
       */
      function(e) {
        this.vectorOverlay_.clear();
      }, undefined, this);
};


/**
 * @param {Fuse} fuseEngine
 * @param {string} searchString
 * @return {Array.<string>}
 * @private
 */
app.SearchDirectiveController.prototype.matchLayers_ =
    function(fuseEngine, searchString) {
  var fuseResults = /** @type {Array.<FuseResult>} */
      (fuseEngine.search(searchString).slice(0, 5));
  return goog.array.map(fuseResults,
      /**
       * @param {FuseResult} r
       */
      function(r) {
        return r.item;
      });
};


/**
 * @param {string} searchString
 * @return {Array<ol.Feature>}
 * @private
 */
app.SearchDirectiveController.prototype.matchCoordinate_ =
    function(searchString) {
  var results = [];
  var re = {
    'EPSG:2169': {
      regex: /(\d{4,5})\s*([E|N])?\W*(\d{4,5})\s*([E|N])?/,
      label: 'LUREF'
    },
    'EPSG:4326': {
      regex:
          /(\d{1,2}[\,\.]\d{4,5})\d*\s?(latitude|lat|N|longitude|long|lon|E)?\W*(\d{1,2}[\,\.]\d{4,5})\d*\s?(longitude|long|lon|E|latitude|lat|N)?/,
      label: 'long/lat WGS84'
    }
  };
  for (var epsgCode in re) {
    /**
     * @type {Array.<string>}
     */
    var m = re[epsgCode].regex.exec(searchString);
    if (goog.isDefAndNotNull(m)) {
      /**
       * @type {number}
       */
      var easting;
      /**
       * @type {number}
       */
      var northing;
      if (goog.isDefAndNotNull(m[2]) && goog.isDefAndNotNull(m[4])) {
        if (goog.array.contains(['latitude', 'lat', 'N'], m[2]) &&
            goog.array.contains(['longitude', 'long', 'lon', 'E'], m[4])) {
          easting = parseFloat(m[3]);
          northing = parseFloat(m[1]);
        } else if (goog.array.contains(['latitude', 'lat', 'N'], m[4]) &&
            goog.array.contains(['longitude', 'long', 'lon', 'E'], m[2])) {
          easting = parseFloat(m[1]);
          northing = parseFloat(m[3]);
        }
      } else if (!goog.isDef(m[2]) && !goog.isDef(m[4])) {
        easting = parseFloat(m[1]);
        northing = parseFloat(m[3]);
      }
      var mapEpsgCode =
          this['map'].getView().getProjection().getCode();
      var point = /** @type {ol.geom.Point} */
          (new ol.geom.Point([easting, northing])
         .transform(epsgCode, mapEpsgCode));
      var flippedPoint =  /** @type {ol.geom.Point} */
          (new ol.geom.Point([northing, easting])
         .transform(epsgCode, mapEpsgCode));
      var feature = /** @type {ol.Feature} */ (null);
      if (ol.extent.containsCoordinate(
          this.maxExtent_, point.getCoordinates())) {
        feature = new ol.Feature(point);
      } else if (epsgCode === 'EPSG:4326' && ol.extent.containsCoordinate(
          this.maxExtent_, flippedPoint.getCoordinates())) {
        feature = new ol.Feature(flippedPoint);
      }
      if (!goog.isNull(feature)) {
        var resultPoint = /** @type {ol.geom.Point} */ (feature.getGeometry());
        var resultString = this.coordinateString_(
            resultPoint.getCoordinates(), mapEpsgCode, epsgCode);
        feature.set('label', resultString);
        feature.set('epsgLabel', re[epsgCode].label);
        results.push(feature);
      }
    }
  }
  return results; //return empty array if no match
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
  var url = searchServiceUrl + '?limit=5&query=%QUERY';
  var bloodhound = ngeoCreateGeoJSONBloodhound(url, ol.proj.get('EPSG:3857'));
  bloodhound.initialize();
  return bloodhound;
};


/**
 * @param {app.Themes} appThemes Themes Service
 * @param {Fuse} fuse
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @private
 */
app.SearchDirectiveController.prototype.createLocalBackgroundLayerData_ =
    function(appThemes, fuse, gettextCatalog) {
  appThemes.getBgLayers().then(
      goog.bind(function(bgLayers) {
        var suggestions = goog.array.map(bgLayers,
            /**
           * @param {ol.layer.Layer} bgLayer
           * @return {app.BackgroundLayerSuggestion}
           */
            function(bgLayer) {
              return {
                'bgLayer': bgLayer,
                'translatedName': gettextCatalog.getString(
                    /** @type {string} */ (bgLayer.get('label')))
              };
            }
            );
        fuse.set(suggestions);
      }, this)
  );
};


/**
 * @param {app.Themes} appThemes Themes Service
 * @param {Fuse} fuse
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @private
 */
app.SearchDirectiveController.prototype.createLocalAllLayerData_ =
    function(appThemes, fuse, gettextCatalog) {
  this.layers_ = [];
  appThemes.getThemesObject().then(
      goog.bind(function(themes) {
        var dedup = [];
        for (var i = 0; i < themes.length; i++) {
          var theme = themes[i];
          goog.array.extend(dedup,
              app.SearchDirectiveController.getAllChildren_(
              theme.children, gettextCatalog
              )
          );
        }
        var dedup2 = [];
        goog.array.removeDuplicates(dedup, dedup2,
            /**
           * @constructor
           * @dict
           */
            (function(element) {
              return element['id'];
            })
        );
        this.layers_ = [];
        goog.array.extend(this.layers_, dedup2);
        fuse.set(this.layers_);
      }, this)
  );
};


/**
 * @param {(app.BackgroundLayerSuggestion)} input
 * @private
 */
app.SearchDirectiveController.prototype.setBackgroundLayer_ = function(input) {
  this.backgroundLayerMgr_.set(this['map'], input['bgLayer']);
};


/**
 * @param {(Object|string)} input
 * @private
 */
app.SearchDirectiveController.prototype.addLayerToMap_ = function(input) {
  var layer = {};
  if (typeof input === 'string') {
    var node = goog.array.find(this.layers_, function(element) {
      return goog.object.containsKey(element, 'name') &&
          goog.object.containsValue(element, input);
    });
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
      element[i]['translatedName'] = gettextCatalog.getString(element[i].name);
      array.push(element[i]);
    }
  }
  return array;
};


/**
 * @param {jQuery.Event} event
 * @param {(ol.Feature|Object|app.BackgroundLayerSuggestion)} suggestion
 * @param {string} dataset Typeahead dataset ID.
 * @this {app.SearchDirectiveController}
 * @private
 */
app.SearchDirectiveController.selected_ =
    function(event, suggestion, dataset) {
  var map = /** @type {ol.Map} */ (this['map']);
  if (dataset === 'pois' || dataset === 'coordinates') { //POIs
    var feature = /** @type {ol.Feature} */ (suggestion);
    var featureGeometry = /** @type {ol.geom.SimpleGeometry} */
        (feature.getGeometry());
    var mapSize = /** @type {ol.Size} */ (map.getSize());
    map.getView().fit(featureGeometry, mapSize,
        /** @type {olx.view.FitOptions} */ ({maxZoom: 17}));
    this.vectorOverlay_.clear();
    var features = [];
    if (dataset === 'coordinates') {
      features.push(feature);
    } else if (dataset === 'pois') {
      if (goog.array.contains(this.showGeom_, feature.get('layer_name'))) {
        features.push(feature);
      }
      var layers = /** @type {Array<string>} */
          (this.layerLookup_[suggestion.get('layer_name')] || []);
      goog.array.forEach(layers, goog.bind(function(layer) {
        this.addLayerToMap_(/** @type {string} */ (layer));
      }, this));
    }
    for (var i = 0; i < features.length; ++i) {
      this.vectorOverlay_.addFeature(features[i]);
    }
  } else if (dataset === 'layers') { //Layer
    this.addLayerToMap_(/** @type {Object} */ (suggestion));
  } else if (dataset === 'backgroundLayers') { //BackgroundLayer
    this.setBackgroundLayer_(
        /** @type {app.BackgroundLayerSuggestion} */ (suggestion));
  }
};


app.module.controller('AppSearchController',
    app.SearchDirectiveController);

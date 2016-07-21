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
goog.provide('app.SearchDirectiveController');
goog.provide('app.searchDirective');

goog.require('app');
goog.require('app.CoordinateString');
goog.require('app.GetLayerForCatalogNode');
goog.require('app.ShowLayerinfo');
goog.require('app.Themes');
goog.require('goog.array');
goog.require('goog.object');
goog.require('ngeo.BackgroundLayerMgr');
goog.require('ngeo.CreateGeoJSONBloodhound');
goog.require('ngeo.FeatureOverlay');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.searchDirective');
goog.require('ol.events');


/**
 * @typedef {{bgLayer: ol.layer.Layer, translatedName: string}}
 */
app.BackgroundLayerSuggestion;


/**
 * @return {angular.Directive} The Directive Object Definition
 * @param {string} appSearchTemplateUrl The template url.
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
          element.find('input').one('focus', function() {
            $(this).addClass('placeholder-text');
          });
          element.find('input').on('click', function() {
            $(this).select();
          });
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
          element.find('span.clear-button').on('click',
              goog.bind(function(scope) {
                $(this).find('input').val('').trigger('input');
                var ctrl = /** @type {app.SearchDirectiveController} */
                    (scope['ctrl']);
                ctrl.featureOverlay_.clear();
              }, element, scope));
        }
  };
};


app.module.directive('appSearch', app.searchDirective);


/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope Angular root scope.
 * @param {angular.$compile} $compile Angular compile service.
 * create GeoJSON Bloodhound service
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr The background
 * manager service.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {app.CoordinateString} appCoordinateString The cooridate string
 * service.
 * @param {ngeo.CreateGeoJSONBloodhound} ngeoCreateGeoJSONBloodhound The
 * GeoJSON Bloodhound factory.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.Theme} appTheme The current theme service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * catalog service.
 * @param {app.ShowLayerinfo} appShowLayerinfo The layer info service.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {string} poiSearchServiceUrl The url to the poi search service.
 * @param {string} layerSearchServiceUrl The url to the layer search service.
 * @export
 */
app.SearchDirectiveController = function($scope, $compile, gettextCatalog,
    ngeoBackgroundLayerMgr, ngeoFeatureOverlayMgr,
    appCoordinateString, ngeoCreateGeoJSONBloodhound, appThemes, appTheme,
    appGetLayerForCatalogNode, appShowLayerinfo, maxExtent,
    poiSearchServiceUrl, layerSearchServiceUrl) {

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
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;

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
   * @type {ngeo.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Map}
   */
  this.map;

  var fillStyle = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });

  var strokeStyle = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  this.featureOverlay_.setStyle(
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

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /** @type {Bloodhound} */
  var POIBloodhoundEngine = this.createAndInitPOIBloodhound_(
      ngeoCreateGeoJSONBloodhound, poiSearchServiceUrl);

  /** @type {Bloodhound} */
  var LayerBloodhoundEngine = this.createAndInitLayerBloodhoundEngine_(
      layerSearchServiceUrl);

  /** @type {Fuse} */
  var backgroundLayerEngine =
      new Fuse([], {
        keys: ['translatedName'],
        threshold: 0.4,
        distance: 100,
        includeScore: true
      });

  $scope.$on('gettextLanguageChanged', goog.bind(function(evt) {
    this.createLocalAllLayerData_(appThemes);
    this.createLocalBackgroundLayerData_(
        appThemes, backgroundLayerEngine, this.gettextCatalog_);
  }, this));

  ol.events.listen(appThemes, app.ThemesEventType.LOAD,
      /**
     * @param {ol.events.Event} evt Event
     */
      function(evt) {
        this.createLocalAllLayerData_(appThemes);
        this.createLocalBackgroundLayerData_(
            appThemes, backgroundLayerEngine, this.gettextCatalog_);
      }, this);

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
    /**
     * @param {Object} suggestion The suggestion.
     * @return {(string|*)} The string.
     * @this {TypeaheadDataset}
     */
    display: function(suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      suggestion.set('dataset', this.name);
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
    name: 'backgroundLayers',
    /**
     * @param {Object} query The query.
     * @param {function(Array<string>)} syncResults A function.
     * @return {Object} The result.
     */
    source: goog.bind(function(query, syncResults) {
      return syncResults(this.matchLayers_(backgroundLayerEngine, query));
    }, this),
    /**
     * @param {app.BackgroundLayerSuggestion} suggestion The suggestion.
     * @return {string} The result.
     * @this {TypeaheadDataset}
     */
    display: function(suggestion) {
      suggestion['dataset'] = this.name;
      return suggestion['translatedName'];
    },
    templates: /** @type {TypeaheadTemplates} */({
      header: goog.bind(function() {
        return '<div class="header">' +
            this.gettextCatalog_.getString('Background Layers') +
            '</div>';
      }, this),
      suggestion: goog.bind(
          /**
           * @param {app.BackgroundLayerSuggestion} suggestion The suggestion.
           * @return {*} The result.
           */
          function(suggestion) {
            var scope = $scope.$new(true);
            scope['object'] = suggestion;
            var html = '<p>' + suggestion['translatedName'];
            html += ' (' + this.gettextCatalog_.getString('Background') + ') ';
            html += '</p>';
            return $compile(html)(scope);
          }, this)
    })
  },{
    name: 'pois',
    source: POIBloodhoundEngine.ttAdapter(),
    // Use a large number for "limit" here. This is to work around a bug
    // in typeahead.js: https://github.com/twitter/typeahead.js/pull/1319
    limit: 50,
    /**
     * @param {Object} suggestion The suggestion.
     * @return {(string|*)} The result.
     * @this {TypeaheadDataset}
     */
    display: function(suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      feature.set('dataset', this.name);
      return feature.get('label');
    },
    templates: /** @type {TypeaheadTemplates} */({
      header: goog.bind(function() {
        return '<div class="header">' +
            this.gettextCatalog_.getString('Addresses') +
            '</div>';
      }, this),
      suggestion: goog.bind(function(suggestion) {
        var feature = /** @type {ol.Feature} */ (suggestion);
        var scope = $scope.$new(true);
        scope['feature'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        };

        var html = '<p>' + feature.get('label') +
            ' <span>(' + this.gettextCatalog_.getString(
                /** @type {string} */ (feature.get('layer_name'))
            ) + ')</span></p>';
        return $compile(html)(scope);
      }, this)
    })
  },{
    name: 'layers',
    source: LayerBloodhoundEngine.ttAdapter(),
    // Use a large number for "limit" here. This is to work around a bug
    // in typeahead.js: https://github.com/twitter/typeahead.js/pull/1319
    limit: 50,
    /**
     * @param {Object} suggestion The suggestion.
     * @return {(string|*)} The result.
     * @this {TypeaheadDataset}
     */
    display: function(suggestion) {
      suggestion['dataset'] = this.name;
      return gettextCatalog.getString(suggestion.name);
    },
    templates: /** @type {TypeaheadTemplates} */({
      header: goog.bind(function() {
        return '<div class="header">' +
            this.gettextCatalog_.getString('Layers') +
            '</div>';
      }, this),
      suggestion: goog.bind(function(suggestion) {
        var scope = $scope.$new(true);
        var translated_name = this.gettextCatalog_.getString(
                /** @type {string} */ (suggestion.name)
        );
        var themeLink = '';
        var layerTheme = suggestion['themes'][0];
        if (suggestion['showThemeLink']) {
          themeLink = '<br><a href="#"' +
            'ng-click="switchTheme(\'' + layerTheme + '\')">' +
            this.gettextCatalog_.getString(' (open in theme ') +
            this.gettextCatalog_.getString(layerTheme) +
            ')</a>';
        }
        var html = '<p>' +
            '<span class="suggestion-text">' +
             translated_name + '</span>' +
             themeLink +
            '<button ng-click="click($event)">i</button>' +
            '</p>';
        scope['switchTheme'] = goog.bind(function(themeId) {
          this.appTheme_.setCurrentTheme(themeId, this.map);
        }, this);
        scope['click'] = goog.bind(function(event) {
          var node = goog.array.find(this.layers_, function(element) {
            return goog.object.containsKey(element, 'name') &&
                goog.object.containsValue(element, suggestion.name);
          });
          this.showLayerinfo_(this.getLayerFunc_(node));
          event.stopPropagation();
        }, this);
        return $compile(html)(scope);
      }, this)
    })
  }
  ];

  this['listeners'] = /** @type {ngeox.SearchDirectiveListeners} */ ({
    select: goog.bind(app.SearchDirectiveController.selected_, this)
  });

  ol.events.listen(this['map'].getLayers(),
      ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEvent} e Collection event.
       */
      function(e) {
        this.featureOverlay_.clear();
      }, this);
};


/**
 * @param {Fuse} fuseEngine The fuse engine.
 * @param {string} searchString The search string.
 * @return {Array.<string>} The result.
 * @private
 */
app.SearchDirectiveController.prototype.matchLayers_ =
    function(fuseEngine, searchString) {
      var fuseResults = /** @type {Array.<FuseResult>} */
      (fuseEngine.search(searchString.slice(0, 31)).slice(0, 5));
      return goog.array.map(fuseResults,
      /**
       * @param {FuseResult} r The result.
       * @return {*} The item.
       */
      function(r) {
        return r.item;
      });
    };


/**
 * @param {string} searchString The search string.
 * @return {Array<ol.Feature>} The result.
 * @private
 */
app.SearchDirectiveController.prototype.matchCoordinate_ =
    function(searchString) {
      var results = [];
      var re = {
        'EPSG:2169': {
          regex: /(\d{4,6})\s*([E|N])?\W*(\d{4,6})\s*([E|N])?/,
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
            var resultPoint =
              /** @type {ol.geom.Point} */ (feature.getGeometry());
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
 * @param {ngeo.CreateGeoJSONBloodhound} ngeoCreateGeoJSONBloodhound The create
 * GeoJSON Bloodhound service.
 * @param {string} searchServiceUrl The search url.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.SearchDirectiveController.prototype.createAndInitPOIBloodhound_ =
    function(ngeoCreateGeoJSONBloodhound, searchServiceUrl) {
      var geojsonFormat = new ol.format.GeoJSON();
      var bloodhound = ngeoCreateGeoJSONBloodhound(
      '', undefined, undefined, undefined,
      /** @type {BloodhoundOptions} */ ({
        remote: {
          url: searchServiceUrl,
          replace: function(url, query) {
            return url +
                '?query=' + encodeURIComponent(query) +
                '&limit=5';
          },
          rateLimitWait: 50,
          transform: function(parsedResponse) {
            /** @type {GeoJSONFeatureCollection} */
            var featureCollection = /** @type {GeoJSONFeatureCollection} */
                (parsedResponse);

            return geojsonFormat.readFeatures(featureCollection, {
              featureProjection: ol.proj.get('EPSG:3857'),
              dataProjection: undefined
            });
          }
        }
      }));

      bloodhound.initialize();
      return bloodhound;
    };


/**
 * @param {string} layerSearchServiceUrl The search url.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.SearchDirectiveController.prototype.createAndInitLayerBloodhoundEngine_ =
  function(layerSearchServiceUrl) {
    var bloodhoundOptions = /** @type {BloodhoundOptions} */ ({
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      datumTokenizer: goog.nullFunction,
      remote: {
        url: layerSearchServiceUrl,
        rateLimitWait: 50,
        replace: goog.bind(function(url, query) {
          return url +
              '?query=' + encodeURIComponent(query) +
              '&limit=5' + '&language=' + this.gettextCatalog_.currentLanguage;
        }, this),
        transform: goog.bind(function(response) {
          goog.array.forEach(response, goog.bind(function(result) {
            var layers = goog.array.filter(
              this.layers_, goog.bind(function(element) {
                return result['layer_id'] == element['id'];
              }, this));
            result['themes'] = [];
            goog.array.forEach(layers, goog.bind(function(element) {
              result['themes'].push(element.theme);
            }, this));
            result['showThemeLink'] = !goog.array.contains(
              result['themes'], this.appTheme_.getCurrentTheme());
          }, this));
          return response;
        }, this)
      }
    });
    var bloodhound = new Bloodhound(bloodhoundOptions);
    return bloodhound;
  };


/**
 * @param {app.Themes} appThemes Themes Service
 * @param {Fuse} fuse The fuse engine.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @private
 */
app.SearchDirectiveController.prototype.createLocalBackgroundLayerData_ =
    function(appThemes, fuse, gettextCatalog) {
      appThemes.getBgLayers().then(
      goog.bind(function(bgLayers) {
        var suggestions = goog.array.map(bgLayers,
            /**
             * @param {ol.layer.Layer} bgLayer The current bg layer.
             * @return {app.BackgroundLayerSuggestion} The suggestion.
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
 * @param {app.Themes} appThemes Themes Service.
 * @private
 */
app.SearchDirectiveController.prototype.createLocalAllLayerData_ =
    function(appThemes) {
      this.layers_ = [];
      this.appThemes_.getFlatCatalog().then(
        goog.bind(function(flatCatalogue) {
          this.layers_ = [];
          goog.array.extend(this.layers_, flatCatalogue);
        }, this));
    };


/**
 * @param {(app.BackgroundLayerSuggestion)} input The input.
 * @private
 */
app.SearchDirectiveController.prototype.setBackgroundLayer_ = function(input) {
  this.backgroundLayerMgr_.set(this['map'], input['bgLayer']);
};


/**
 * @param {(Object|string)} input The input.
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
 * @param {jQuery.Event} event The event.
 * @param {(ol.Feature|Object|app.BackgroundLayerSuggestion)} suggestion
 * The suggestion.
 * @this {app.SearchDirectiveController}
 * @private
 */
app.SearchDirectiveController.selected_ =
    function(event, suggestion) {
      var map = /** @type {ol.Map} */ (this['map']);
      var /** @type {string} */ dataset;
      if (goog.isDef(suggestion['dataset'])) {
        dataset = suggestion['dataset'];
      } else if (suggestion.get('dataset')) {
        dataset = suggestion.get('dataset');
      }
      if (dataset === 'pois' || dataset === 'coordinates') { //POIs
        var feature = /** @type {ol.Feature} */ (suggestion);
        var featureGeometry = /** @type {ol.geom.SimpleGeometry} */
        (feature.getGeometry());
        var mapSize = /** @type {ol.Size} */ (map.getSize());
        map.getView().fit(featureGeometry, mapSize,
        /** @type {olx.view.FitOptions} */ ({maxZoom: 17}));
        this.featureOverlay_.clear();
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
          this.featureOverlay_.addFeature(features[i]);
        }
      // } else if (dataset === 'layers') { //Layer
      //   this.addLayerToMap_(/** @type {Object} */ (suggestion));
      } else if (dataset === 'layers') { //Layer
        this.addLayerToMap_(/** @type {string} */ (suggestion.name));
      } else if (dataset === 'backgroundLayers') { //BackgroundLayer
        this.setBackgroundLayer_(
        /** @type {app.BackgroundLayerSuggestion} */ (suggestion));
      }
    };


app.module.controller('AppSearchController',
    app.SearchDirectiveController);

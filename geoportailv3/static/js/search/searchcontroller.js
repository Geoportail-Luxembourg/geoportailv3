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
goog.provide('app.search.SearchController');

goog.require('app.module');
goog.require('app.events.ThemesEventType');
goog.require('goog.object');
goog.require('ngeo.search.createGeoJSONBloodhound');
goog.require('ol.CollectionEventType');
goog.require('ol.events');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.Feature');
goog.require('ol.format.GeoJSON');
goog.require('ol.geom.Point');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Style');
goog.require('ol.style.Stroke');


/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope Angular root scope.
 * @param {angular.$window} $window The window service.
 * @param {angular.$compile} $compile Angular compile service.
 * create GeoJSON Bloodhound service
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr The background
 * manager service.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {app.CoordinateString} appCoordinateString The cooridate string
 * service.
 * @param {ngeo.search.createGeoJSONBloodhound.Function}
 * ngeoSearchCreateGeoJSONBloodhound The GeoJSON Bloodhound factory.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.Theme} appTheme The current theme service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * catalog service.
 * @param {app.ShowLayerinfo} appShowLayerinfo The layer info service.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {string} poiSearchServiceUrl The url to the poi search service.
 * @param {string} layerSearchServiceUrl The url to the layer search service.
 * @param {string} cmsSearchServiceUrl The url to the cms search service.
 * @param {Array} appExcludeThemeLayerSearch The themes to exclude.
 * @param {app.Routing} appRouting The routing service.
 * @export
 */
app.search.SearchController = function($scope, $window, $compile,
    gettextCatalog, ngeoBackgroundLayerMgr, ngeoFeatureOverlayMgr,
    appCoordinateString, ngeoSearchCreateGeoJSONBloodhound, appThemes, appTheme,
    appGetLayerForCatalogNode, appShowLayerinfo, maxExtent,
    poiSearchServiceUrl, layerSearchServiceUrl, cmsSearchServiceUrl,
    appExcludeThemeLayerSearch, appRouting) {

  /**
   * @type {app.Routing}
   * @export
   */
  this.appRouting_ = appRouting;

  /**
   * @type {angular.$window}
   * @private
   */
  this.$window_ = $window;

  /**
   * @type {Object}
   * @private
   */
  this.layerLookup_ = {
    'Adresse': ['addresses'],
    'Parcelle': ['parcels', 'parcels_labels'],
    'lieu_dit': ['toponymes'],
    'FLIK': ['asta_flik_parcels_2017'],
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
   * @type {number}
   */
  this.limitResults = 8;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

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
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Feature}
   * @private
   */
  this.lastSelectedSuggestion_ = null;

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

  /**
   * @type {Array}
   * @private
   */
  this.appExcludeThemeLayerSearch_ = appExcludeThemeLayerSearch;

  /** @type {Bloodhound} */
  var POIBloodhoundEngine = this.createAndInitPOIBloodhound_(
      poiSearchServiceUrl);

  /** @type {Bloodhound} */
  var LayerBloodhoundEngine = this.createAndInitLayerBloodhoundEngine_(
      layerSearchServiceUrl);

  /** @type {Bloodhound} */
  var CMSBloodhoundEngine = this.createAndInitCMSBloodhoundEngine_(
      cmsSearchServiceUrl);

  /** @type {Fuse} */
  var backgroundLayerEngine =
      new Fuse([], {
        keys: ['translatedName'],
        threshold: 0.4,
        distance: 100,
        includeScore: true
      });

  $scope.$on('gettextLanguageChanged', function(evt) {
    this.createLocalAllLayerData_(appThemes);
    this.createLocalBackgroundLayerData_(
        appThemes, backgroundLayerEngine, this.gettextCatalog);
  }.bind(this));

  ol.events.listen(appThemes, app.events.ThemesEventType.LOAD,
      /**
     * @param {ol.events.Event} evt Event
     */
      function(evt) {
        this.createLocalAllLayerData_(appThemes);
        this.createLocalBackgroundLayerData_(
            appThemes, backgroundLayerEngine, this.gettextCatalog);
      }, this);

  /** @type {TypeaheadOptions} */
  this['options'] = {
    highlight: true
  };
  var sourceFunc =
    /**
     * @param {Object} query
     * @param {function(Array<string>)} syncResults
     * @return {Object}
     */
    function(query, syncResults) {
      return syncResults(this.matchCoordinate_(query));
    };
  /** @type {Array.<TypeaheadDataset>} */
  this['datasets'] = [{
    name: 'coordinates',
    source: sourceFunc.bind(this),
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
      suggestion: function(feature) {
        var scope = $scope.$new(true);
        scope['object'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        };
        var html = '<p>' + feature.get('label') +
            ' (' + feature.get('epsgLabel') + ')</p>';
        return $compile(html)(scope);
      }.bind(this)
    })
  }, {
    name: 'backgroundLayers',
    /**
     * @param {Object} query The query.
     * @param {function(Array<string>)} syncResults A function.
     * @return {Object} The result.
     */
    source: function(query, syncResults) {
      return syncResults(this.matchLayers_(backgroundLayerEngine, query));
    }.bind(this),
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
      header: function() {
        return '<div class="header">' +
            this.gettextCatalog.getString('Background Layers') +
            '</div>';
      }.bind(this),
      suggestion:
          /**
           * @param {app.BackgroundLayerSuggestion} suggestion The suggestion.
           * @return {*} The result.
           */
          function(suggestion) {
            var scope = $scope.$new(true);
            scope['object'] = suggestion;
            var html = '<p>' + suggestion['translatedName'];
            html += ' (' + this.gettextCatalog.getString('Background') + ') ';
            html += '</p>';
            return $compile(html)(scope);
          }.bind(this)
    })
  }, {
    name: 'pois',
    source: POIBloodhoundEngine.ttAdapter(),
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
      header: function() {
        return '<div class="header">' +
            this.gettextCatalog.getString('Addresses') +
            '</div>';
      }.bind(this),
      suggestion: function(suggestion) {
        var feature = /** @type {ol.Feature} */ (suggestion);
        var scope = $scope.$new(true);
        scope['feature'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        };
        scope['addRoutePoint'] = function(feature, event) {
          this.addRoutePoint(feature);
          event.stopPropagation();
        }.bind(this);

        var html = '<p><span class="search-result-container"><span class="search-result-label">' + feature.get('label') +
            ' <span>(' + this.gettextCatalog.getString(
                /** @type {string} */ (feature.get('layer_name'))
            ) + ')</span></span><span class="search-result-routing"><button class="standalone-routing-button" ng-click="addRoutePoint(feature, $event)"><span class="standalone-routing-icon"></span></button></span></span></p>';

        return $compile(html)(scope);
      }.bind(this)
    })
  }, {
    name: 'layers',
    source: LayerBloodhoundEngine.ttAdapter(),
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
      header: function() {
        return '<div class="header">' +
            this.gettextCatalog.getString('Layers') +
            '</div>';
      }.bind(this),
      suggestion: function(suggestion) {
        var scope = $scope.$new(true);
        var translated_name = this.gettextCatalog.getString(
                /** @type {string} */ (suggestion.name)
        );
        var themeLink = '';
        var layerTheme = suggestion['themes'][0];
        if (suggestion['showThemeLink'] && layerTheme) {
          themeLink = '<br><a href="#"' +
            'ng-click="switchTheme(\'' + layerTheme + '\')"> (' +
            this.gettextCatalog.getString('open in theme') +
            ' ' +
            this.gettextCatalog.getString(layerTheme) +
            ')</a>';
        }
        var html = '<p>' +
            '<span class="suggestion-text">' +
             translated_name + '</span>' +
             themeLink +
            '<button ng-click="click($event)">i</button>' +
            '</p>';
        scope['switchTheme'] = function(themeId) {
          this.appTheme_.setCurrentTheme(themeId);
        }.bind(this);
        scope['click'] = function(event) {
          var node = goog.array.find(this.layers_, function(element) {
            return goog.object.containsKey(element, 'name') &&
                goog.object.containsValue(element, suggestion.name);
          });
          this.showLayerinfo_(this.getLayerFunc_(node));
          event.stopPropagation();
        }.bind(this);
        return $compile(html)(scope);
      }.bind(this)
    })
  }, {
    name: 'cms',
    source: CMSBloodhoundEngine.ttAdapter(),
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
      header: function() {
        return '<div class="header">' +
            this.gettextCatalog.getString('Website Pages') +
            '</div>';
      }.bind(this),
      suggestion: function(suggestion) {
        var scope = $scope.$new(true);
        var html = '<p>' +
            '<span class="suggestion-text">' +
            suggestion.title + '</span>' +
            '</p>';
        return $compile(html)(scope);
      }.bind(this)
    })
  }
  ];

  this['listeners'] = /** @type {ngeox.SearchDirectiveListeners} */ ({
    select: app.search.SearchController.selected_.bind(this)
  });

  ol.events.listen(this['map'].getLayers(),
      ol.CollectionEventType.ADD,
      /**
       * @param {ol.Collection.Event} e Collection event.
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
app.search.SearchController.prototype.matchLayers_ =
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
app.search.SearchController.prototype.matchCoordinate_ =
    function(searchString) {
      searchString = searchString.replace(/,/gi, '.');
      var results = [];
      var re = {
        'EPSG:2169': {
          regex: /(\d{4,6}[\,\.]?\d{0,3})\s*([E|N])?\W*(\d{4,6}[\,\.]?\d{0,3})\s*([E|N])?/,
          label: 'LUREF',
          epsgCode: 'EPSG:2169'
        },
        'EPSG:4326': {
          regex:
          /(\d{1,2}[\,\.]\d{1,6})\d*\s?(latitude|lat|N|longitude|long|lon|E|east|est)?\W*(\d{1,2}[\,\.]\d{1,6})\d*\s?(longitude|long|lon|E|latitude|lat|N|north|nord)?/i,
          label: 'long/lat WGS84',
          epsgCode: 'EPSG:4326'
        },
        'EPSG:4326:DMS': {
          regex:
          /([NSEW])?(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s?(?:(\d+(?:\.\d+)?)['’‘′:]\s?(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|'')?)?)?\s?([NSEW])?/i,
          label: 'long/lat WGS84 DMS',
          epsgCode: 'EPSG:4326'
        }
      };
      var northArray = ['LATITUDE', 'LAT', 'N', 'NORTH', 'NORD'];
      var eastArray = ['LONGITUDE', 'LONG', 'LON', 'E', 'EAST', 'EST'];
      for (var epsgKey in re) {
        /**
         * @type {Array.<string | undefined>}
         */
        var m = re[epsgKey].regex.exec(searchString);

        if (m !== undefined && m !== null) {
          var epsgCode = re[epsgKey].epsgCode;
          var isDms = false;
          /**
           * @type {number | undefined}
           */
          var easting = undefined;
          /**
           * @type {number | undefined}
           */
          var northing = undefined;
          if (epsgKey === 'EPSG:4326' || epsgKey === 'EPSG:2169') {
            if ((m[2] !== undefined && m[2] !== null) && (m[4] !== undefined && m[4] !== null)) {
              if (goog.array.contains(northArray, m[2].toUpperCase()) &&
              goog.array.contains(eastArray, m[4].toUpperCase())) {
                easting = parseFloat(m[3].replace(',', '.'));
                northing = parseFloat(m[1].replace(',', '.'));
              } else if (goog.array.contains(northArray, m[4].toUpperCase()) &&
              goog.array.contains(eastArray, m[2].toUpperCase())) {
                easting = parseFloat(m[1].replace(',', '.'));
                northing = parseFloat(m[3].replace(',', '.'));
              }
            } else if (m[2] === undefined && m[4] === undefined) {
              easting = parseFloat(m[1].replace(',', '.'));
              northing = parseFloat(m[3].replace(',', '.'));
            }
          } else if (epsgKey === 'EPSG:4326:DMS') {
            // Inspired by https://github.com/gmaclennan/parse-dms/blob/master/index.js
            var m1, m2, decDeg1, decDeg2, dmsString2;
            m1 = m;
            if (m1[1]) {
              m1[6] = undefined;
              dmsString2 = searchString.substr(m1[0].length - 1).trim();
            } else {
              dmsString2 = searchString.substr(m1[0].length).trim();
            }
            decDeg1 = this.decDegFromMatch_(m1);
            if (decDeg1 !== undefined) {
              m2 = re[epsgKey].regex.exec(dmsString2);
              decDeg2 = m2 ? this.decDegFromMatch_(m2) : undefined;
              if (decDeg2 !== undefined) {
                if (typeof decDeg1.latLon === 'undefined') {
                  if (!isNaN(decDeg1.decDeg) && !isNaN(decDeg2.decDeg)) {
                    // If no hemisphere letter but we have two coordinates,
                    // infer that the first is lat, the second lon
                    decDeg1.latLon = 'lat';
                  }
                }
                if (decDeg1.latLon === 'lat') {
                  northing = decDeg1.decDeg;
                  easting = decDeg2.decDeg;
                } else {
                  easting = decDeg1.decDeg;
                  northing = decDeg2.decDeg;
                }
                isDms = true;
              }
            }
          }
          if (easting !== undefined && northing !== undefined) {
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
              resultPoint.getCoordinates(), mapEpsgCode, epsgCode, isDms, false);
              feature.set('label', resultString);
              feature.set('epsgLabel', re[epsgKey].label);
              results.push(feature);
            }
          }
        }
      }
      return results; //return empty array if no match
    };

/**
 * @param {Array.<string | undefined>} m The matched result.
 * @return {Object | undefined} Returns the coordinate.
 * @private
 */
app.search.SearchController.prototype.decDegFromMatch_ = function(m) {
  var signIndex = {
    '-': -1,
    'N': 1,
    'S': -1,
    'E': 1,
    'W': -1
  };

  var latLonIndex = {
    'N': 'lat',
    'S': 'lat',
    'E': 'lon',
    'W': 'lon'
  };

  var sign;
  sign = signIndex[m[2]] || signIndex[m[1]] || signIndex[m[6]] || 1;
  if (m[3] === undefined) {
    return undefined;
  }

  var degrees, minutes = 0, seconds = 0, latLon;
  degrees = Number(m[3]);
  if (m[4] !== undefined) {
    minutes = Number(m[4]);
  }
  if (m[5] !== undefined) {
    seconds = Number(m[5]);
  }
  latLon = latLonIndex[m[1]] || latLonIndex[m[6]];

  return {
    decDeg: sign * (degrees + minutes / 60 + seconds / 3600),
    latLon: latLon
  };
};

/**
 * @param {string} searchServiceUrl The search url.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.search.SearchController.prototype.createAndInitPOIBloodhound_ =
    function(searchServiceUrl) {
      var geojsonFormat = new ol.format.GeoJSON();
      var bloodhound = ngeo.search.createGeoJSONBloodhound(
      '', undefined, undefined, undefined,
      /** @type {BloodhoundOptions} */ ({
        remote: {
          url: searchServiceUrl,
          prepare: function(query, settings) {
            settings.url = settings.url +
                '?query=' + encodeURIComponent(query) +
                '&limit=' + this.limitResults;
            return settings;
          }.bind(this),
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
app.search.SearchController.prototype.createAndInitLayerBloodhoundEngine_ =
  function(layerSearchServiceUrl) {
    var bloodhoundOptions = /** @type {BloodhoundOptions} */ ({
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      datumTokenizer: goog.nullFunction,
      remote: {
        url: layerSearchServiceUrl,
        rateLimitWait: 50,
        replace: function(url, query) {
          return url +
              '?query=' + encodeURIComponent(query) +
              '&limit=' + this.limitResults +
              '&language=' + this.gettextCatalog.currentLanguage;
        }.bind(this),
        transform: function(response) {
          response.forEach(function(result) {
            var layers = goog.array.filter(
              this.layers_, goog.bind(function(element) {
                return result['layer_id'] == element['id'];
              }, this));
            result['themes'] = [];
            layers.forEach(goog.bind(function(element) {
              result['themes'].push(element.theme);
            }, this));
            result['showThemeLink'] = !goog.array.contains(
              result['themes'], this.appTheme_.getCurrentTheme());
          }.bind(this));

          return response;
        }.bind(this)
      }
    });
    var bloodhound = new Bloodhound(bloodhoundOptions);
    return bloodhound;
  };

/**
 * @param {string} cmsSearchServiceUrl The search url.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.search.SearchController.prototype.createAndInitCMSBloodhoundEngine_ =
  function(cmsSearchServiceUrl) {
    var bloodhoundOptions = /** @type {BloodhoundOptions} */ ({
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      datumTokenizer: goog.nullFunction,
      remote: {
        url: cmsSearchServiceUrl,
        rateLimitWait: 50,
        replace: function(url, query) {
          return url +
              '?query=' + encodeURIComponent(query) +
              '&limit=' + this.limitResults +
              '&language=' + this.gettextCatalog.currentLanguage;
        }.bind(this),
        transform: function(response) {
          return response;
        }.bind(this)
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
app.search.SearchController.prototype.createLocalBackgroundLayerData_ =
    function(appThemes, fuse, gettextCatalog) {
      appThemes.getBgLayers().then(
      function(bgLayers) {
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
      }.bind(this)
  );
    };


/**
 * @param {app.Themes} appThemes Themes Service.
 * @private
 */
app.search.SearchController.prototype.createLocalAllLayerData_ =
    function(appThemes) {
      this.layers_ = [];
      this.appThemes_.getFlatCatalog().then(
        function(flatCatalogue) {
          this.layers_ = [];
          goog.array.extend(this.layers_, flatCatalogue);
        }.bind(this));
    };


/**
 * @param {(app.BackgroundLayerSuggestion)} input The input.
 * @private
 */
app.search.SearchController.prototype.setBackgroundLayer_ = function(input) {
  this.backgroundLayerMgr_.set(this['map'], input['bgLayer']);
};


/**
 * @param {(Object|string)} input The input.
 * @private
 */
app.search.SearchController.prototype.addLayerToMap_ = function(input) {
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
 * @this {app.search.SearchController}
 * @private
 */
app.search.SearchController.selected_ =
    function(event, suggestion) {
      var map = /** @type {ol.Map} */ (this['map']);
      var /** @type {string} */ dataset;
      if (suggestion['dataset'] !== undefined) {
        dataset = suggestion['dataset'];
      } else if (suggestion.get('dataset')) {
        dataset = suggestion.get('dataset');
      }
      if (dataset === 'pois' || dataset === 'coordinates') { //POIs
        var feature = /** @type {ol.Feature} */ (suggestion);
        this.lastSelectedSuggestion_ = feature;
        var featureGeometry = /** @type {ol.geom.SimpleGeometry} */ (feature.getGeometry());
        map.getView().fit(featureGeometry, /** @type {olx.view.FitOptions} */ ({
          size: /** @type {ol.Size} */ (map.getSize()),
          maxZoom: 18
        }));
        this.featureOverlay_.clear();
        var features = [];
        if (dataset === 'coordinates') {
          features.push(feature);
        } else if (dataset === 'pois') {
          if (!(goog.array.contains(this.appExcludeThemeLayerSearch_,
                 this.appTheme_.getCurrentTheme()) &&
                 feature.get('layer_name') === 'Parcelle')) {
            if (goog.array.contains(this.showGeom_, feature.get('layer_name'))) {
              features.push(feature);
            }
            var layers = /** @type {Array<string>} */
            (this.layerLookup_[suggestion.get('layer_name')] || []);
            layers.forEach(function(layer) {
              this.addLayerToMap_(/** @type {string} */ (layer));
            }.bind(this));
          } else {
            feature.setGeometry(
              new ol.geom.Point(ol.extent.getCenter(
                featureGeometry.getExtent())));
            features.push(feature);
          }
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
      } else if (dataset === 'cms') {
        this.$window_.open('https://www.geoportail.lu' + suggestion.url, '_blank');
      }
    };

/**
 * @param {ol.Feature} suggestion The feature.
 * @export
 */
app.search.SearchController.prototype.addRoutePoint = function(suggestion) {
  var coordinate = ol.extent.getCenter(suggestion.getGeometry().getExtent());
  var feature = /** @type {ol.Feature} */
      (new ol.Feature(new ol.geom.Point(coordinate)));
  feature.set('label', suggestion.get('label'));
  this.appRouting_.addRoutePoint(feature);
  this['routingOpen'] = true;
};

/**
 * @return {boolean} true if a featuer is selected.
 * @export
 */
app.search.SearchController.prototype.isSearchFeature = function() {
  return (this.lastSelectedSuggestion_ !== null);
};

/**
 * Add to the routing the last suggested feature.
 * @export
 */
app.search.SearchController.prototype.addLastSuggestedFeature = function() {
  this.addRoutePoint(this.lastSelectedSuggestion_);
};

app.module.controller('AppSearchController',
    app.search.SearchController);

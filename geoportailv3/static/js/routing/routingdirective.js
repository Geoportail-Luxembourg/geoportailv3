/**
 * @fileoverview This file provides the routing directive. That directive
 * is used to create the routing panel in the side panel.
 *
 * Example:
 *
 * <app-routing app-routing-map="::mainCtrl.map"
 * </app-routing>
 *
 */
goog.provide('app.RoutingController');
goog.provide('app.routingDirective');

goog.require('app');
goog.require('app.Routing');

/**
 * @param {string} appRoutingTemplateUrl Url to routing template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.routingDirective = function(appRoutingTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appRoutingMap',
      'hasResult': '=appRoutingHasResult'
    },
    controller: 'AppRoutingController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appRoutingTemplateUrl
  };
};


app.module.directive('appRouting', app.routingDirective);


/**
 * @param {angular.Scope} $scope Angular root scope.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {string} poiSearchServiceUrl The url to the layer search service.
 * @param {angular.$compile} $compile Angular compile service.
 * @param {ngeo.search.createGeoJSONBloodhound.Function} ngeoSearchCreateGeoJSONBloodhound The
 * GeoJSON Bloodhound factory.
 * @param {app.Routing} appRouting The routing service.
 * @param {app.GetProfile} appGetProfile The profile service.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay?
 * @constructor
 * @ngInject
 * @export
 */
app.RoutingController = function($scope, gettextCatalog, poiSearchServiceUrl,
    $compile, ngeoSearchCreateGeoJSONBloodhound, appRouting, appGetProfile,
    ngeoFeatureOverlayMgr) {
  /**
   * @type {app.ShowProfile}
   * @export
   */
  this.showProfile = /** @type {app.ShowProfile} */ ({active: true});

  /**
   * @type {Array<Object>}
   * @export
   */
  this.profileData = [];
  /**
   * @type {app.GetProfile}
   * @private
   */
  this.getProfile_ = appGetProfile;

  /**
   * @type {app.Routing}
   * @export
   */
  this.appRouting = appRouting;

  /**
   * @type {ol.Map}
   * @export
   */
  this.map = this['map'];

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {number}
   * @private
   */
  this.mode_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.criteria_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.distance_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.time_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.elevation_ = 0;

  /**
   * @type {Array<Object>}
   * @export
   */
  this.routeDesc = [];

  /** @type {Bloodhound} */
  var POIBloodhoundEngine = this.createAndInitPOIBloodhound_(
      ngeoSearchCreateGeoJSONBloodhound, poiSearchServiceUrl);


  /** @type {Array.<TypeaheadDataset>}*/
  this['datasets'] = [{
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
      header: goog.bind(function() {
        return '<div class="header">' +
            this.gettextCatalog.getString('Addresses') +
            '</div>';
      }, this),
      suggestion: goog.bind(function(suggestion) {
        var feature = /** @type {ol.Feature} */ (suggestion);
        var scope = $scope.$new(true);
        scope['feature'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        }.bind(this);

        var html = '<p>' + feature.get('label') + '</p>';
        return $compile(html)(scope);
      }, this)
    })
  }];

  this['listeners'] = /** @type {ngeox.SearchDirectiveListeners} */ ({
    select: function(event, suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      var routeNumber = parseInt($(event.currentTarget).attr('route-number'), 10);
      this.appRouting.insertFeatureAt(feature, routeNumber);
      this.getRoute_();
    }.bind(this)
  });

  var fillStyle = new ol.style.Fill({
    color: [41, 128, 185]
  });

  var strokeStyle = new ol.style.Stroke({
    color: [255, 255, 255],
    width: 3
  });

  /**
   * @type {ol.style.Style}
   * @private
   */
  this.stepStyle_ = new ol.style.Style({
    fill: fillStyle,
    stroke: strokeStyle,
    image: new ol.style.Circle({
      radius: 7,
      fill: fillStyle,
      stroke: strokeStyle
    })
  });

  /**
   * @type {ol.style.Style}
   * @private
   */
  this.roadStyle_ = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [255, 0, 0],
      width: 5
    })
  });
  /**
   * The draw overlay
   * @type {ngeo.FeatureOverlay}
   * @private
   */
  this.highlightOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  this.highlightOverlay_.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({color: '#ff0000'})
        })
      }));
  /**
   * The help tooltip element.
   * @type {Element}
   * @private
   */
  this.tooltipElement_ = null;


  /**
   * Overlay to show the help messages.
   * @type {ol.Overlay}
   * @private
   */
  this.tooltipOverlay_ = null;

  /**
   * The collection containg each step feature.
   * @type {ol.Collection}
   * @private
   */
  this.stepFeaturesCollection_ = new ol.Collection();

  /**
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteraction_ = new ol.interaction.Select({
    hitTolerance: 20,
    condition: ol.events.condition.pointerMove,
    filter: goog.bind(function(feature, layer) {
      return this.stepFeaturesCollection_.getArray().indexOf(feature) != -1;
    }, this)
  });
  this.map.addInteraction(this.selectInteraction_);

  this.selectInteraction_.setActive(false);
  this.selectInteraction_.on('select', function(e) {
    this.highlightOverlay_.clear();
    var selectedFeatures = e.target.getFeatures();
    if (selectedFeatures.getLength() > 0) {
      var feature = selectedFeatures.getArray()[0];
      var geometry = /** @type {ol.Coordinate} */ (feature.getGeometry().getFirstCoordinate());
      var newFeature = new ol.Feature({
        geometry: new ol.geom.Point(geometry)
      });
      this.highlightOverlay_.addFeature(newFeature);
      this.createTooltip_(geometry, feature.get('__text'));
    } else {
      this.removeTooltip_();
    }
  }.bind(this));

  /**
   * @type {ol.source.Vector}
   * @private
   */
  this.source_ = ngeoFeatureOverlayMgr.getLayer().getSource();
};

/**
 * Creates a new tooltip.
 * @param {ol.Coordinate} position The position to display the overlay.
 * @param {string} text The text to display.
 * @private
 */
app.RoutingController.prototype.createTooltip_ = function(position, text) {
  this.removeTooltip_();
  this.tooltipElement_ = document.createElement('div');
  this.tooltipElement_.classList.add('tooltip');
  this.tooltipElement_.innerHTML = text;
  this.tooltipOverlay_ = new ol.Overlay({
    element: this.tooltipElement_,
    offset: [15, 0],
    positioning: 'center-left'
  });
  this.map.addOverlay(this.tooltipOverlay_);
  this.tooltipOverlay_.setPosition(position);
};


/**
 * Destroy the tooltip.
 * @private
 */
app.RoutingController.prototype.removeTooltip_ = function() {
  if (this.tooltipOverlay_ !== null) {
    this.map.removeOverlay(this.tooltipOverlay_);
  }
  if (this.tooltipElement_ !== null) {
    this.tooltipElement_.parentNode.removeChild(this.tooltipElement_);
  }
  this.tooltipElement_ = null;
  this.tooltipOverlay_ = null;
};

/**
 * @param {ngeo.search.createGeoJSONBloodhound.Function} ngeoSearchCreateGeoJSONBloodhound The create
 * GeoJSON Bloodhound service.
 * @param {string} searchServiceUrl The search url.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.RoutingController.prototype.createAndInitPOIBloodhound_ =
    function(ngeoSearchCreateGeoJSONBloodhound, searchServiceUrl) {
      var geojsonFormat = new ol.format.GeoJSON();
      var bloodhound = ngeoSearchCreateGeoJSONBloodhound(
      '', undefined, undefined, undefined,
      /** @type {BloodhoundOptions} */ ({
        remote: {
          url: searchServiceUrl,
          prepare: goog.bind(function(query, settings) {
            settings.url = settings.url +
                '?query=' + encodeURIComponent(query) +
                '&limit=8&layer=Adresse';
            return settings;
          }, this),
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
 * @return {boolean} True if a route exists.
 * @export
 */
app.RoutingController.prototype.isRoute = function() {
  return (this.routeDesc.length !== 0);
};

/**
 * @export
 */
app.RoutingController.prototype.clearRoute = function() {
  this.appRouting.routes = ['', ''];
  this.appRouting.features.clear();
  this.routeDesc = [];
  this.source_.setAttributions(undefined);
  this.getRoute_();
};

/**
 * @param {number} step The text to clear.
 * @export
 */
app.RoutingController.prototype.removeOrClearStep = function(step) {
  if (this.appRouting.routes.length > 2) {
    this.appRouting.routes.splice(step, 1);
  } else {
    this.appRouting.routes[step] = '';
  }
  this.getRoute_();
};

/**
 * @return {string} The distance.
 * @export
 */
app.RoutingController.prototype.getDistance = function() {
  return parseInt(this.distance_, 10) + ' km';
};

/**
 * @return {string} The time.
 * @export
 */
app.RoutingController.prototype.getTime = function() {
  return parseInt((this.time_), 10) + ' min';
};

/**
 * @return {string} the elevation.
 * @export
 */
app.RoutingController.prototype.getElevation = function() {
  return parseInt(this.elevation_, 10) + ' m';
};

/**
 * Get the route.
 * @private
 */
app.RoutingController.prototype.getRoute_ = function() {
  this.appRouting.routeOverlay.clear();
  this.stepFeaturesCollection_.clear();
  this.selectInteraction_.setActive(false);
  this['hasResult'] = false;
  this.source_.setAttributions(undefined);
  if (this.appRouting.features.getLength() >= 2) {
    var waypoints = [];
    this.appRouting.features.forEach(function(feature) {
      var geom = feature.getGeometry();
      if (geom instanceof ol.geom.Point) {
        var lonlat = /** @type {ol.Coordinate} */
            (ol.proj.transform(geom.getFirstCoordinate(),
            'EPSG:3857', 'EPSG:4326'));
        waypoints.push(lonlat[1] + ',' + lonlat[0]);
      }
    }.bind(this));
    if (waypoints.length < 2) {
      return;
    }
    this.appRouting.getRoute(waypoints.join(','),
        this.getCriteria(), this.getMode()).then(function(features) {

          if (features !== null) {
            var encOpt = /** @type {olx.format.ReadOptions} */ ({
              dataProjection: 'EPSG:4326',
              featureProjection: this.map.getView().getProjection()
            });
            var jsonFeatures = (new ol.format.GeoJSON()).
                readFeatures(features, encOpt);

            if (jsonFeatures !== null && jsonFeatures !== undefined) {

              this.appRouting.routeOverlay.clear();
              var curView = this.map.getView();
              // Only one path is returned
              jsonFeatures.forEach(function(feature) {
                feature.setStyle(this.roadStyle_);
                this.appRouting.routeOverlay.addFeature(feature);
                this.source_.setAttributions(feature.get('attribution'));
                this.getProfile_(feature.getGeometry()).then(function(profile) {
                  this.profileData = profile;
                  this.elevation_ = this.profileData[this.profileData.length - 1]['cumulativeElevation'];
                }.bind(this));
                var viewSize = /** {ol.Size} **/ (this.map.getSize());
                this.map.getView().fit(feature.getGeometry(), {
                  size: viewSize
                });

                this.routeDesc = feature.get('desc');
                this.routeDesc.forEach(function(description) {
                  var coordinate = [description.lon, description.lat];
                  var geometry = /** @type {ol.Coordinate} */
                  (ol.proj.transform(coordinate, 'EPSG:4326', curView.getProjection()));
                  var stepFeature = new ol.Feature({
                    geometry: new ol.geom.Point(geometry)
                  });
                  stepFeature.setStyle(this.stepStyle_);
                  stepFeature.set('__text', description.description);
                  this.appRouting.routeOverlay.addFeature(stepFeature);
                  this.stepFeaturesCollection_.push(stepFeature);
                }, this);
                this.selectInteraction_.setActive(true);
                this.distance_ = feature.get('dist') / 1000;
                this.time_ = feature.get('time') / 60;
                this['hasResult'] = true;
              }.bind(this));
            }
            return jsonFeatures;
          }
        }.bind(this));
  }
};

/**
 * @param {number} lon The longitude.
 * @param {number} lat The latitude.
 * @param {string} text The text to display.
 * @export
 */
app.RoutingController.prototype.highlightPosition = function(lon, lat, text) {
  var coordinate = [lon, lat];
  var curView = this.map.getView();
  var geometry = /** @type {ol.Coordinate} */
  (ol.proj.transform(coordinate, 'EPSG:4326', curView.getProjection()));
  var feature = new ol.Feature({
    geometry: new ol.geom.Point(geometry)
  });
  this.highlightOverlay_.clear();
  this.highlightOverlay_.addFeature(feature);
  this.createTooltip_(geometry, text);
};

/**
 * @export
 */
app.RoutingController.prototype.clearHighlight = function() {
  this.highlightOverlay_.clear();
  this.removeTooltip_();
};

/**
 * @param {number} direction The direction class.
 * @return {string} Returns the corresponding class.
 * @export
 */
app.RoutingController.prototype.getIconDirectionClass = function(direction) {
  switch (direction) {
    case 0:
      return 'north';
    case 1:
      return 'west';
    case 2:
      return 'west';
    case 3:
      return 'west';
    case 4:
      return 'south';
    case 5:
      return 'east';
    case 6:
      return 'east';
    case 7:
      return 'east';
    default:
      return 'north';
  }
};

/**
 * 0 : fastest
 * 1 : shortest
 * @return {number} Returns the mode.
 * @export
 */
app.RoutingController.prototype.getCriteria = function() {
  return this.criteria_;
};


/**
 * @param {number} criteria the criteria. Possible values are :
 * 0 : fastest, 1 : shortest
 * @export
 */
app.RoutingController.prototype.setCriteria = function(criteria) {
  this.criteria_ = criteria;
  this.getRoute_();
};


/**
 * 1 : Pedestrian
 * 2 : Bike
 * 3 : Car
 * @return {number} Returns the mode.
 * @export
 */
app.RoutingController.prototype.getMode = function() {
  return this.mode_;
};

/**
 * @param {number} mode the mode. Possible values are :
 * 1 : Pedestrian, 2 : Bike, 3 : Car
 * @export
 */
app.RoutingController.prototype.setMode = function(mode) {
  this.mode_ = mode;
  this.getRoute_();
};

/**
 * Exchange the first and last route.
 * @export
 */
app.RoutingController.prototype.exchangeRoutes = function() {
  var lastFeature = this.appRouting.features.removeAt(this.appRouting.features.getLength() - 1);
  var firstFeature = this.appRouting.features.removeAt(0);
  if (firstFeature !== null && firstFeature !== undefined &&
      lastFeature !== null && lastFeature !== undefined) {
    this.appRouting.features.insertAt(0, lastFeature);
    this.appRouting.features.push(firstFeature);
  }

  var temp = this.appRouting.routes[this.appRouting.routes.length - 1];
  this.appRouting.routes[this.appRouting.routes.length - 1] = this.appRouting.routes[0];
  this.appRouting.routes[0] = temp;
  this.setPositionText_();
  this.getRoute_();
};

/**
 * Set the position text into the feature.
 * @private
 */
app.RoutingController.prototype.setPositionText_ = function() {
  var pos = 0;
  this.appRouting.features.forEach(function(feature) {
    pos++;
    if (feature !== undefined && feature !== null) {
      feature.set('__text', '' + pos);
    }
  }, this);
};

/**
 * @return {Array<string>} The adresses to search.
 * @export
 */
app.RoutingController.prototype.getRoutes = function() {
  return this.appRouting.routes;
};

/**
 * Add a new empy route.
 * @export
 */
app.RoutingController.prototype.addRoute = function() {
  this.appRouting.routes.push('');
};


app.module.controller('AppRoutingController', app.RoutingController);

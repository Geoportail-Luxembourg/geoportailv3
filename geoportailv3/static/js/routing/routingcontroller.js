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
goog.provide('app.routing.RoutingController');

goog.require('app.module');
goog.require('app.NotifyNotificationType');
goog.require('ngeo.search.createGeoJSONBloodhound');
goog.require('ol');
goog.require('ol.geom.Point');
goog.require('ol.geom.GeometryType');
goog.require('ol.style');
goog.require('ol.interaction');
goog.require('ol.events');
goog.require('ol.format.GeoJSON');


/**
 * @param {angular.Scope} $scope Angular root scope.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {string} poiSearchServiceUrl The url to the layer search service.
 * @param {angular.$compile} $compile Angular compile service.
 * @param {app.Routing} appRouting The routing service.
 * @param {app.GetProfile} appGetProfile The profile service.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay?
 * @param {app.Export} appExport The export service.
 * @param {app.CoordinateString} appCoordinateString The coordinate to string
 * service.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {angular.$window} $window Window.
 * @param {app.Geocoding} appGeocoding appGeocoding The geocoding service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {angular.$filter} $filter Angular filter.
 * @constructor
 * @ngInject
 * @export
 */
app.routing.RoutingController = function($scope, gettextCatalog, poiSearchServiceUrl,
    $compile, appRouting, appGetProfile,
    ngeoFeatureOverlayMgr, appExport, appCoordinateString, maxExtent,
    $window, appGeocoding, appUserManager, appNotify, appMymaps, $filter) {
  /**
   * @type {angular.$filter}
   * @private
   */
  this.filter_ = $filter;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {app.Geocoding}
   * @private
   */
  this.geocode_ = appGeocoding;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = $window;

  /**
   * @type {ol.Extent}
   * @private
   */
  this.maxExtent_ =
      ol.proj.transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

  /**
   * @type {app.CoordinateString}
   * @private
   */
  this.coordinateString_ = appCoordinateString;

  /**
   * @type {app.Export}
   * @private
   */
  this.appExport_ = appExport;

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
  this.elevationGain_ = 0;
  /**
   * @type {number}
   * @private
   */
  this.elevationLoss_ = 0;

  /**
   * @type {Array<Object>}
   * @export
   */
  this.routeDesc = [];

  /** @type {Bloodhound} */
  var POIBloodhoundEngine = this.createAndInitPOIBloodhound_(
      poiSearchServiceUrl);


  /** @type {Array.<TypeaheadDataset>}*/
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
      feature.set('dataset', this.name);
      return feature.get('label');
    },
    templates: /** @type {TypeaheadTemplates} */ ({
      suggestion: goog.bind(function(feature) {
        var scope = this.scope_.$new(true);
        scope['object'] = feature;
        scope['click'] = function(event) {
          event.stopPropagation();
        };
        var html = '<p>' + feature.get('label') +
            ' (' + feature.get('epsgLabel') + ')</p>';
        return $compile(html)(scope);
      }, this)
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
      var geometry = feature.getGeometry();
      feature.setGeometry(new ol.geom.Point(ol.extent.getCenter(
        geometry.getExtent())));
      var routeNumber = parseInt($(event.currentTarget).attr('route-number'), 10);
      this.appRouting.insertFeatureAt(feature, routeNumber);

      this.appRouting.routes[routeNumber - 1] = /** @type {string} */
        (feature.get('label'));
      this.appRouting.getRoute();
    }.bind(this)
  });

  /**
   * The draw overlay
   * @type {ngeo.map.FeatureOverlay}
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
   * @type {ol.Collection}
   * @private
   */
  this.modyfyFeaturesCollection_ = new ol.Collection();

  /**
   * Due to https://github.com/openlayers/openlayers/issues/7483
   * We cannot use pointermove condition.
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteraction_ = new ol.interaction.Select({
    features: this.modyfyFeaturesCollection_,
    condition: ol.events.condition.click,
    filter: goog.bind(function(feature, layer) {
      return this.appRouting.stepFeatures.getArray().indexOf(feature) != -1;
    }, this)
  });

  this.map.addInteraction(this.selectInteraction_);
  this.selectInteraction_.setActive(false);
  /**
   * We cannot use pointermove condition.
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteractionPM_ = new ol.interaction.Select({
    condition: ol.events.condition.pointerMove,
    filter: goog.bind(function(feature, layer) {
      return this.appRouting.stepFeatures.getArray().indexOf(feature) != -1;
    }, this)
  });

  this.map.addInteraction(this.selectInteractionPM_);

  this.selectInteractionPM_.setActive(false);
  ol.events.listen(this.selectInteractionPM_, 'select',
    this.showHideTooltip_, this);

  /**
   * @type {ol.interaction.Modify}
   * @private
   */
  this.modifyInteraction_ = new ol.interaction.Modify({
    features: this.modyfyFeaturesCollection_
  });
  this.map.addInteraction(this.modifyInteraction_);
  this.modifyInteraction_.setActive(true);

  ol.events.listen(this.modifyInteraction_,
    ol.interaction.ModifyEventType.MODIFYEND, this.modifyEndStepFeature_, this);
  /**
   * @type {ol.source.Vector}
   * @private
   */
  this.source_ = ngeoFeatureOverlayMgr.getLayer().getSource();

  ol.events.listen(this.appRouting.routeFeatures, ol.CollectionEventType.ADD,
    this.showRoute_, this);
  ol.events.listen(this.appRouting.routeFeatures, ol.CollectionEventType.REMOVE,
    this.removeRoute_, this);

  /**
   * @type {ol.Geolocation}
   * @private
   */
  this.geolocation_ = new ol.Geolocation({
    projection: this.map.getView().getProjection(),
    trackingOptions: /** @type {GeolocationPositionOptions} */ ({
      enableHighAccuracy: true,
      maximumAge: 60000,
      timeout: 7000
    })
  });
  this.initRoutingService_();
};

/**
 * Init the routing service_.
 * @private
 */
app.routing.RoutingController.prototype.initRoutingService_ = function() {
  this.appRouting.map = this.map;
};

/**
 * Modify the step feature.
 * @param {ol.interaction.Modify.Event} event The event.
 * @private
 */
app.routing.RoutingController.prototype.modifyEndStepFeature_ = function(event) {
  var lastIdx = this.appRouting.features.getLength() - 1;
  var lastFeature = this.appRouting.features.removeAt(lastIdx);
  var lastLabel = this.appRouting.routes[lastIdx];

  var feature = this.modyfyFeaturesCollection_.getArray()[0].clone();
  var geometry = /** @type {ol.Coordinate} */ (feature.getGeometry().getFirstCoordinate());
  this.geocode_.reverseGeocode(geometry).then(function(resp) {
    if (resp['count'] > 0) {
      var address = resp['results'][0];
      var formattedAddress = address['number'] + ',' + address['street'] + ',' +
      address['postal_code'] + ' ' + address['locality'];
      var label = formattedAddress;
      if (!(label.length > 0 && Math.round(address['distance']) <= 100)) {
        label = this.coordinateString_(
        geometry, 'EPSG:3857', 'EPSG:2169', false, true);
      }
      feature.set('label', label);
      this.appRouting.routes[lastIdx] = label;
    }
  }.bind(this));

  this.appRouting.insertFeatureAt(feature, lastIdx + 1);

  if (lastFeature !== undefined &&
      lastFeature !== null) {
    this.addRoute(lastLabel);
    this.appRouting.insertFeatureAt(lastFeature, lastIdx + 2);
  }
  this.appRouting.getRoute();
};

/**
 * Modify the step feature.
 * @param {number} step The step.
 * @export
 */
app.routing.RoutingController.prototype.whereAmI = function(step) {
  if (this.window_.location.protocol !== 'https:') {
    this['showRedirect'] = true;
  } else {
    ol.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.POSITION),
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        this.geolocation_.setTracking(false);
        var position = /** @type {ol.Coordinate} */
            (this.geolocation_.getPosition());
        var feature = new ol.Feature({
          geometry: new ol.geom.Point(position)
        });
        var label = this.coordinateString_(
                position, 'EPSG:3857', 'EPSG:4326', false, true);
        feature.set('label', label);
        this.appRouting.insertFeatureAt(feature, step + 1);
        this.appRouting.routes[step] = label;
        this.appRouting.getRoute();
      }, this);
    this.geolocation_.setTracking(true);
  }
};

/**
 * Show or hide tooltip.
 * @param {ol.interaction.Select.Event} e The event.
 * @private
 */
app.routing.RoutingController.prototype.showHideTooltip_ = function(e) {
  this.highlightOverlay_.clear();
  var selectedFeatures = e.target.getFeatures();
  if (selectedFeatures.getLength() > 0) {
    var feature = selectedFeatures.getArray()[0];

    var geometry = /** @type {ol.Coordinate} */ (feature.getGeometry().getFirstCoordinate());
    var newFeature = new ol.Feature({
      geometry: new ol.geom.Point(geometry)
    });
    this.highlightOverlay_.addFeature(newFeature);
    this.createTooltip_(geometry, feature.get('name'));
  } else {
    this.removeTooltip_();
  }
};

/**
 * Creates a new tooltip.
 * @param {ol.Coordinate} position The position to display the overlay.
 * @param {string} text The text to display.
 * @private
 */
app.routing.RoutingController.prototype.createTooltip_ = function(position, text) {
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
 * Update the map and save the new feature order.
 * @param {angular.JQLite} element The feature.
 * @param {Array} array The array.
 * @export
 */
app.routing.RoutingController.prototype.afterReorder = function(element, array) {
  var fromIdx = -1;
  var toIdx = -1;
  var i = 0;
  var isFirst = false;
  var moveBottom = false;
  for (i = 0; i < this.appRouting.routesOrder.length; i++) {
    if (this.appRouting.routesOrder[i] !== i) {
      if (this.appRouting.routesOrder[i] === i + 1 && !isFirst) {
        moveBottom = true;
        isFirst = true;
        fromIdx = i;
      }
      if (moveBottom && this.appRouting.routesOrder[i] < i) {
        toIdx = i;
        break;
      }

      if (this.appRouting.routesOrder[i] > i &&
          this.appRouting.routesOrder[i] !== i + 1 && !isFirst) {
        isFirst = true;
        toIdx = i;
        fromIdx = this.appRouting.routesOrder[i];
        break;
      }
    }
  }
  element.off('sortupdate');
  if (fromIdx !== toIdx) {
    var elementToMove = this.appRouting.routes[fromIdx];
    this.appRouting.routes.splice(fromIdx, 1);
    this.appRouting.routes.splice(toIdx, 0, elementToMove);
    this.appRouting.moveFeaturePosition(fromIdx, toIdx);
    this.appRouting.reorderRoute();
    this.appRouting.getRoute();
  }
};

/**
 * Destroy the tooltip.
 * @private
 */
app.routing.RoutingController.prototype.removeTooltip_ = function() {
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
 * @param {string} searchServiceUrl The search url.
 * @return {Bloodhound} The bloodhound engine.
 * @private
 */
app.routing.RoutingController.prototype.createAndInitPOIBloodhound_ =
    function(searchServiceUrl) {
      var geojsonFormat = new ol.format.GeoJSON();
      var bloodhound = ngeo.search.createGeoJSONBloodhound(
      '', undefined, undefined, undefined,
      /** @type {BloodhoundOptions} */ ({
        remote: {
          url: searchServiceUrl,
          prepare: goog.bind(function(query, settings) {
            settings.url = settings.url +
                '?query=' + encodeURIComponent(query) +
                '&limit=8';
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
app.routing.RoutingController.prototype.isRoute = function() {
  return (this.routeDesc.length !== 0);
};

/**
 * Clear all fields and remove computed route.
 * @export
 */
app.routing.RoutingController.prototype.clearRoutes = function() {
  this.appRouting.routes = ['', ''];
  this.appRouting.routesOrder.splice(0);
  this.appRouting.routesOrder.push(0);
  this.appRouting.routesOrder.push(1);
  this.appRouting.features.clear();
  this.appRouting.routeFeatures.clear();
  this.modyfyFeaturesCollection_.clear();
  this.routeDesc = [];
  this.appRouting.getRoute();
  this.source_.setAttributions(undefined);
};

/**
 * Clear the field and remove computed route.
 * @param {number} routeIdx The route number.
 * @export
 */
app.routing.RoutingController.prototype.clearRoute = function(routeIdx) {

  if (routeIdx > 0 && routeIdx < this.appRouting.features.getArray().length - 1) {
    this.appRouting.features.removeAt(routeIdx);
    this.appRouting.routes.splice(routeIdx, 1);
    this.appRouting.routesOrder.splice(routeIdx, 1);
    this.appRouting.reorderRoute();
  } else {
    this.appRouting.routes[routeIdx] = '';
    var blankFeature = new ol.Feature();
    blankFeature.set('name', '' + (routeIdx + 1));
    this.appRouting.features.setAt(routeIdx, blankFeature);
  }
  this.appRouting.routeFeatures.clear();
  this.appRouting.stepFeatures.clear();
  this.modyfyFeaturesCollection_.clear();
  this.routeDesc = [];
  this.source_.setAttributions(undefined);
  this.appRouting.getRoute();
};

/**
 * @return {number} The distance in meter.
 * @export
 */
app.routing.RoutingController.prototype.getDistance = function() {
  return this.distance_;
};

/**
 * @return {number} The total time in seconde.
 * @export
 */
app.routing.RoutingController.prototype.getTime = function() {
  return this.time_;
};

/**
 * @return {number} the elevation gain in meter.
 * @export
 */
app.routing.RoutingController.prototype.getElevationGain = function() {
  return this.elevationGain_;
};

/**
 * @return {number} the elevation gain in meter.
 * @export
 */
app.routing.RoutingController.prototype.getElevationLoss = function() {
  return this.elevationLoss_;
};

/**
 * Remove the route information.
 * @private
 */
app.routing.RoutingController.prototype.removeRoute_ = function() {
  this.appRouting.stepFeatures.clear();
  this.selectInteraction_.setActive(false);
  this.selectInteractionPM_.setActive(false);
  this['hasResult'] = false;
  this.source_.setAttributions(undefined);
};

/**
 * @private
 */
app.routing.RoutingController.prototype.showRoute_ = function() {
  var routeArray = this.appRouting.routeFeatures.getArray();
  if (routeArray.length === 0) {
    this.removeRoute_();
    return;
  }
  var feature = routeArray[0];

  var curView = this.map.getView();
  // Only one path is returned

  this.source_.setAttributions(/** @type {string} */ (feature.get('attribution')));
  this.getProfile_(/** @type {ol.geom.LineString} */ (feature.getGeometry())).then(function(profile) {
    this.profileData = profile;
    this.elevationGain_ = this.profileData[this.profileData.length - 1]['elevationGain'];
    this.elevationLoss_ = this.profileData[this.profileData.length - 1]['elevationLoss'];
  }.bind(this));
  var viewSize = /** {ol.Size} **/ (this.map.getSize());
  curView.fit(/** @type {ol.geom.SimpleGeometry} */ (feature.getGeometry()), {
    size: viewSize
  });

  this.routeDesc = /** @type {Array} */ (feature.get('desc'));
  var cumulativeDistance = 0;
  var cumulativeTime = 0;
  this.routeDesc.forEach(function(description) {
    var coordinate = [description.lon, description.lat];
    var geometry = /** @type {ol.Coordinate} */
    (ol.proj.transform(coordinate, 'EPSG:4326', curView.getProjection()));
    var stepFeature = new ol.Feature({
      geometry: new ol.geom.Point(geometry)
    });
    cumulativeDistance += description.distance;
    cumulativeTime += description.time;
    description['cumulativeDistance'] = cumulativeDistance;
    description['cumulativeTime'] = cumulativeTime;

    stepFeature.set('name', description.description);
    this.appRouting.stepFeatures.push(stepFeature);
  }, this);
  this.distance_ = /** @type {number} */ (feature.get('dist'));
  this.time_ = /** @type {number} */ (feature.get('time'));
  this.selectInteraction_.setActive(true);
  this.selectInteractionPM_.setActive(true);
  this['hasResult'] = true;
};

/**
 * @param {number} lon The longitude.
 * @param {number} lat The latitude.
 * @export
 */
app.routing.RoutingController.prototype.center = function(lon, lat) {
  var curView = this.map.getView();
  var coordinate = ol.proj.transform([lon, lat], 'EPSG:4326', curView.getProjection());
  curView.setCenter(coordinate);
};

/**
 * @param {number} lon The longitude.
 * @param {number} lat The latitude.
 * @param {string} text The text to display.
 * @export
 */
app.routing.RoutingController.prototype.highlightPosition = function(lon, lat, text) {
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
app.routing.RoutingController.prototype.clearHighlight = function() {
  this.highlightOverlay_.clear();
  this.removeTooltip_();
};

/**
 * @param {number} direction The direction class.
 * @return {string} Returns the corresponding class.
 * @export
 */
app.routing.RoutingController.prototype.getIconDirectionClass = function(direction) {
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
app.routing.RoutingController.prototype.getCriteria = function() {
  return this.appRouting.criteria;
};


/**
 * @param {number} criteria the criteria. Possible values are :
 * 0 : fastest, 1 : shortest
 * @export
 */
app.routing.RoutingController.prototype.setCriteria = function(criteria) {
  this.appRouting.criteria = criteria;
  this.appRouting.getRoute();
};


/**
 * 1 : Pedestrian
 * 2 : Bike
 * 3 : Car
 * @return {number} Returns the mode.
 * @export
 */
app.routing.RoutingController.prototype.getMode = function() {
  return this.appRouting.transportMode;
};

/**
 * @param {number} mode the mode. Possible values are :
 * 1 : Pedestrian, 2 : Bike, 3 : Car
 * @export
 */
app.routing.RoutingController.prototype.setMode = function(mode) {
  this.appRouting.transportMode = mode;
  this.appRouting.getRoute();
};

/**
 * Exchange the first and last route.
 * @export
 */
app.routing.RoutingController.prototype.exchangeRoutes = function() {
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
  this.appRouting.getRoute();
};

/**
 * Set the position text into the feature.
 * @private
 */
app.routing.RoutingController.prototype.setPositionText_ = function() {
  var pos = 0;
  this.appRouting.features.forEach(function(feature) {
    pos++;
    if (feature !== undefined && feature !== null) {
      feature.set('name', '' + pos);
    }
  }, this);
};

/**
 * @return {Array<string>} The adresses to search.
 * @export
 */
app.routing.RoutingController.prototype.getRoutes = function() {
  return this.appRouting.routes;
};

/**
 * Add a new empy route.
 * @param {string | undefined} routeName The label of the route.
 * @export
 */
app.routing.RoutingController.prototype.addRoute = function(routeName) {
  this.appRouting.routes.push((routeName === undefined) ? '' : routeName);
  this.appRouting.routesOrder.push(this.appRouting.routesOrder.length);
};

/**
 * Export a Gpx file.
 * @export
 */
app.routing.RoutingController.prototype.exportGpx = function() {
  var features = goog.array.filter(
    this.appRouting.routeFeatures.getArray(), function(feature) {
      return (feature.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING);
    }, this);
  this.appExport_.exportGpx(features, 'Route', true);
};


/**
 * @param {string} searchString The search string.
 * @return {Array<ol.Feature>} The result.
 * @private
 */
app.routing.RoutingController.prototype.matchCoordinate_ =
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

        if (goog.isDefAndNotNull(m)) {
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
            if (goog.isDefAndNotNull(m[2]) && goog.isDefAndNotNull(m[4])) {
              if (goog.array.contains(northArray, m[2].toUpperCase()) &&
              goog.array.contains(eastArray, m[4].toUpperCase())) {
                easting = parseFloat(m[3].replace(',', '.'));
                northing = parseFloat(m[1].replace(',', '.'));
              } else if (goog.array.contains(northArray, m[4].toUpperCase()) &&
              goog.array.contains(eastArray, m[2].toUpperCase())) {
                easting = parseFloat(m[1].replace(',', '.'));
                northing = parseFloat(m[3].replace(',', '.'));
              }
            } else if (!goog.isDef(m[2]) && !goog.isDef(m[4])) {
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
app.routing.RoutingController.prototype.decDegFromMatch_ = function(m) {
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
 * Create a map from an route.
 * @export
 */
app.routing.RoutingController.prototype.createMapFromRoute = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    var mapTitle = this.gettextCatalog.getString('Route du');
    mapTitle = mapTitle + ' ' + this.filter_('date')(Date.now(), 'dd/MM/yyyy');
    var mapDescription = this.appRouting.routes[0] + ' ' +
      this.appRouting.routes[this.appRouting.routes.length - 1];
    this.appMymaps_.createMap(mapTitle, mapDescription,
        null, false)
        .then(function(resp) {
          if (goog.isNull(resp)) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (goog.isDef(mapId)) {
              this.appMymaps_.setMapId(mapId);
            }
          }
        }.bind(this)).then(function(mapinformation) {
          var features = this.appRouting.routeFeatures.getArray();
          var stepFeatures = this.appRouting.stepFeatures.getArray();
          return this.appMymaps_.saveFeatures(features.concat(stepFeatures));
        }.bind(this)).then(function(mapinformation) {
          var msg = this.gettextCatalog.getString('Une copie de votre route a été enregistrée dans Mymaps.');
          this.notify_(msg, app.NotifyNotificationType.INFO);
          this.appMymaps_.clear();
        }.bind(this));
  }
};

/**
 * Notify the user he has to connect
 * @export
 */
app.routing.RoutingController.prototype.askToConnect = function() {
  var msg = this.gettextCatalog.getString(
      'Veuillez vous identifier afin d\'accéder à vos cartes'
      );
  this.notify_(msg, app.NotifyNotificationType.INFO);
  this['useropen'] = true;
};

app.module.controller('AppRoutingController', app.routing.RoutingController);

/**
 * @param {angular.$filter} $filter Angular filter.
 * @return {function(number): string} A function to format secondes.
 * @ngInject
 * @ngdoc filter
 * @ngname appSecondsToHHmmss
 */
app.secondsToHHmmss = function($filter) {
  return function(seconds) {
    var hours   = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds - (hours * 3600)) / 60);
    var sec = seconds - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {
      hours   = '0' + hours;
    }
    if (minutes < 10) {
      minutes = '0' + minutes;
    }
    if (sec < 10) {
      sec = '0' + sec;
    }
    return hours + ':' + minutes + ':' + sec;
  };
};

app.module.filter('appSecondsToHHmmss', app.secondsToHHmmss);

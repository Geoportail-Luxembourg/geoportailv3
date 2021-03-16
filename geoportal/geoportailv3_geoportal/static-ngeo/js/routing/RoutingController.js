/**
 * @module app.routing.RoutingController
 */
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

import appModule from '../module.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';
import ngeoSearchCreateGeoJSONBloodhound from 'ngeo/search/createGeoJSONBloodhound.js';
import {get as projGet, transform, transformExtent} from 'ol/proj.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import Style from 'ol/style/Style.js';
import Circle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Select from 'ol/interaction/Select.js';
import Modify from 'ol/interaction/Modify.js';
import {listen} from 'ol/events.js';
import {getCenter, containsCoordinate} from 'ol/extent';
import olFormatGeoJSON from 'ol/format/GeoJSON.js';
import {includes as arrayIncludes} from 'ol/array.js';
import Collection from 'ol/Collection.js';
import Feature from 'ol/Feature.js';
import Geolocation from 'ol/Geolocation.js';
import Overlay from 'ol/Overlay.js';
import {click, pointerMove} from 'ol/events/condition.js';
import { matchCoordinate } from '../CoordinateMatch'

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
const exports = function($scope, gettextCatalog, poiSearchServiceUrl,
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
      transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

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
   * @type {app.query.ShowProfile}
   * @export
   */
  this.showProfile = /** @type {app.query.ShowProfile} */ ({active: true});

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

  /**
   * @param {Object} query
   * @param {function(Array<string>)} syncResults
   * @return {Object}
   */
  var sourceFunc = (query, syncResults) => syncResults(matchCoordinate(
    query,
    this['map'].getView().getProjection().getCode(),
    this.maxExtent_,
    this.coordinateString_
  ));

  /** @type {Array.<TypeaheadDataset>}*/
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
      feature.set('dataset', this.name);
      return feature.get('label');
    },
    templates: /** @type {TypeaheadTemplates} */ ({
      suggestion: function(feature) {
        var scope = this.scope_.$new(true);
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
        }.bind(this);

        var html = '<p>' + feature.get('label') + '</p>';
        return $compile(html)(scope);
      }.bind(this)
    })
  }];

  this['listeners'] = /** @type {ngeox.SearchDirectiveListeners} */ ({
    select: function(event, suggestion) {
      var feature = /** @type {ol.Feature} */ (suggestion);
      var geometry = feature.getGeometry();
      feature.setGeometry(new olGeomPoint(getCenter(
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
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({color: '#ff0000'})
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
  this.modyfyFeaturesCollection_ = new Collection();

  /**
   * Due to https://github.com/openlayers/openlayers/issues/7483
   * We cannot use pointermove condition.
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteraction_ = new Select({
    features: this.modyfyFeaturesCollection_,
    condition: click,
    filter: function(feature, layer) {
      return this.appRouting.stepFeatures.getArray().indexOf(feature) != -1;
    }.bind(this)
  });

  this.map.addInteraction(this.selectInteraction_);
  this.selectInteraction_.setActive(false);
  /**
   * We cannot use pointermove condition.
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteractionPM_ = new Select({
    condition: pointerMove,
    filter: function(feature, layer) {
      return this.appRouting.stepFeatures.getArray().indexOf(feature) != -1;
    }.bind(this)
  });

  this.map.addInteraction(this.selectInteractionPM_);

  this.selectInteractionPM_.setActive(false);
  listen(this.selectInteractionPM_, 'select',
    this.showHideTooltip_, this);

  /**
   * @type {ol.interaction.Modify}
   * @private
   */
  this.modifyInteraction_ = new Modify({
    features: this.modyfyFeaturesCollection_
  });
  this.map.addInteraction(this.modifyInteraction_);
  this.modifyInteraction_.setActive(true);

  listen(this.modifyInteraction_,
    'modifyend', this.modifyEndStepFeature_, this);
  /**
   * @type {ol.source.Vector}
   * @private
   */
  this.source_ = ngeoFeatureOverlayMgr.getLayer().getSource();

  listen(this.appRouting.routeFeatures, 'add',
    this.showRoute_, this);
  listen(this.appRouting.routeFeatures, 'remove',
    this.removeRoute_, this);

  /**
   * @type {ol.Geolocation}
   * @private
   */
  this.geolocation_ = new Geolocation({
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
exports.prototype.initRoutingService_ = function() {
  this.appRouting.map = this.map;
};

/**
 * Modify the step feature.
 * @param {ol.interaction.Modify.Event} event The event.
 * @private
 */
exports.prototype.modifyEndStepFeature_ = function(event) {
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
exports.prototype.whereAmI = function(step) {
  if (this.window_.location.protocol !== 'https:') {
    this['showRedirect'] = true;
  } else {
    listen(this.geolocation_, 'change:position',
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        this.geolocation_.setTracking(false);
        var position = /** @type {ol.Coordinate} */
            (this.geolocation_.getPosition());
        var feature = new Feature({
          geometry: new olGeomPoint(position)
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
exports.prototype.showHideTooltip_ = function(e) {
  this.highlightOverlay_.clear();
  var selectedFeatures = e.target.getFeatures();
  if (selectedFeatures.getLength() > 0) {
    var feature = selectedFeatures.getArray()[0];

    var geometry = /** @type {ol.Coordinate} */ (feature.getGeometry().getFirstCoordinate());
    var newFeature = new Feature({
      geometry: new olGeomPoint(geometry)
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
exports.prototype.createTooltip_ = function(position, text) {
  this.removeTooltip_();
  this.tooltipElement_ = document.createElement('div');
  this.tooltipElement_.classList.add('tooltip');
  this.tooltipElement_.innerHTML = text;
  this.tooltipOverlay_ = new Overlay({
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
exports.prototype.afterReorder = function(element, array) {
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
exports.prototype.removeTooltip_ = function() {
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
exports.prototype.createAndInitPOIBloodhound_ =
    function(searchServiceUrl) {
      var geojsonFormat = new olFormatGeoJSON();
      var bloodhound = ngeoSearchCreateGeoJSONBloodhound(
      '', undefined, undefined, undefined,
      /** @type {BloodhoundOptions} */ ({
        remote: {
          url: searchServiceUrl,
          prepare: function(query, settings) {
            settings.url = settings.url +
                '?query=' + encodeURIComponent(query) +
                '&limit=8';
            return settings;
          }.bind(this),
          rateLimitWait: 50,
          transform: function(parsedResponse) {
            /** @type {GeoJSONFeatureCollection} */
            var featureCollection = /** @type {GeoJSONFeatureCollection} */
                (parsedResponse);

            return geojsonFormat.readFeatures(featureCollection, {
              featureProjection: projGet('EPSG:3857'),
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
exports.prototype.isRoute = function() {
  return (this.routeDesc.length !== 0);
};

/**
 * Clear all fields and remove computed route.
 * @export
 */
exports.prototype.clearRoutes = function() {
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
exports.prototype.clearRoute = function(routeIdx) {

  if (routeIdx > 0 && routeIdx < this.appRouting.features.getArray().length - 1) {
    this.appRouting.features.removeAt(routeIdx);
    this.appRouting.routes.splice(routeIdx, 1);
    this.appRouting.routesOrder.splice(routeIdx, 1);
    this.appRouting.reorderRoute();
  } else {
    this.appRouting.routes[routeIdx] = '';
    var blankFeature = new Feature();
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
exports.prototype.getDistance = function() {
  return this.distance_;
};

/**
 * @return {number} The total time in seconde.
 * @export
 */
exports.prototype.getTime = function() {
  return this.time_;
};

/**
 * @return {number} the elevation gain in meter.
 * @export
 */
exports.prototype.getElevationGain = function() {
  return this.elevationGain_;
};

/**
 * @return {number} the elevation gain in meter.
 * @export
 */
exports.prototype.getElevationLoss = function() {
  return this.elevationLoss_;
};

/**
 * Remove the route information.
 * @private
 */
exports.prototype.removeRoute_ = function() {
  this.appRouting.stepFeatures.clear();
  this.selectInteraction_.setActive(false);
  this.selectInteractionPM_.setActive(false);
  this['hasResult'] = false;
  this.source_.setAttributions(undefined);
};

/**
 * @private
 */
exports.prototype.showRoute_ = function() {
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
    (transform(coordinate, 'EPSG:4326', curView.getProjection()));
    var stepFeature = new Feature({
      geometry: new olGeomPoint(geometry)
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
exports.prototype.center = function(lon, lat) {
  var curView = this.map.getView();
  var coordinate = transform([lon, lat], 'EPSG:4326', curView.getProjection());
  curView.setCenter(coordinate);
};

/**
 * @param {number} lon The longitude.
 * @param {number} lat The latitude.
 * @param {string} text The text to display.
 * @export
 */
exports.prototype.highlightPosition = function(lon, lat, text) {
  var coordinate = [lon, lat];
  var curView = this.map.getView();
  var geometry = /** @type {ol.Coordinate} */
  (transform(coordinate, 'EPSG:4326', curView.getProjection()));
  var feature = new Feature({
    geometry: new olGeomPoint(geometry)
  });
  this.highlightOverlay_.clear();
  this.highlightOverlay_.addFeature(feature);
  this.createTooltip_(geometry, text);
};

/**
 * @export
 */
exports.prototype.clearHighlight = function() {
  this.highlightOverlay_.clear();
  this.removeTooltip_();
};

/**
 * @param {number} direction The direction class.
 * @return {string} Returns the corresponding class.
 * @export
 */
exports.prototype.getIconDirectionClass = function(direction) {
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
exports.prototype.getCriteria = function() {
  return this.appRouting.criteria;
};


/**
 * @param {number} criteria the criteria. Possible values are :
 * 0 : fastest, 1 : shortest
 * @export
 */
exports.prototype.setCriteria = function(criteria) {
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
exports.prototype.getMode = function() {
  return this.appRouting.transportMode;
};

/**
 * @param {number} mode the mode. Possible values are :
 * 1 : Pedestrian, 2 : Bike, 3 : Car
 * @export
 */
exports.prototype.setMode = function(mode) {
  this.appRouting.transportMode = mode;
  this.appRouting.getRoute();
};

/**
 * Exchange the first and last route.
 * @export
 */
exports.prototype.exchangeRoutes = function() {
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
exports.prototype.setPositionText_ = function() {
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
exports.prototype.getRoutes = function() {
  return this.appRouting.routes;
};

/**
 * Add a new empy route.
 * @param {string | undefined} routeName The label of the route.
 * @export
 */
exports.prototype.addRoute = function(routeName) {
  this.appRouting.routes.push((routeName === undefined) ? '' : routeName);
  this.appRouting.routesOrder.push(this.appRouting.routesOrder.length);
};

/**
 * Export a Gpx file.
 * @export
 */
exports.prototype.exportGpx = function() {
  var features = this.appRouting.routeFeatures.getArray().filter(
    function(feature) {
      return feature.getGeometry().getType() === olGeomGeometryType.LINE_STRING;
    }, this);
  this.appExport_.exportGpx(features, 'Route', true);
};


/**
 * Create a map from an route.
 * @export
 */
exports.prototype.createMapFromRoute = function() {
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
          if (resp === null) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (mapId !== undefined) {
              this.appMymaps_.setMapId(mapId);
            }
          }
        }.bind(this)).then(function(mapinformation) {
          var features = this.appRouting.routeFeatures.getArray();
          var stepFeatures = this.appRouting.stepFeatures.getArray();
          return this.appMymaps_.saveFeatures(features.concat(stepFeatures));
        }.bind(this)).then(function(mapinformation) {
          var msg = this.gettextCatalog.getString('Une copie de votre route a été enregistrée dans Mymaps.');
          this.notify_(msg, appNotifyNotificationType.INFO);
          this.appMymaps_.clear();
        }.bind(this));
  }
};

/**
 * Notify the user he has to connect
 * @export
 */
exports.prototype.askToConnect = function() {
  var msg = this.gettextCatalog.getString(
      'Veuillez vous identifier afin d\'accéder à vos cartes'
      );
  this.notify_(msg, appNotifyNotificationType.INFO);
  this['useropen'] = true;
};

appModule.controller('AppRoutingController', exports);

/**
 * @param {angular.$filter} $filter Angular filter.
 * @return {function(number): string} A function to format secondes.
 * @ngInject
 * @ngdoc filter
 * @ngname appSecondsToHHmmss
 */
function secondsToHHmmss($filter) {
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
}

appModule.filter('appSecondsToHHmmss', secondsToHHmmss);


export default exports;

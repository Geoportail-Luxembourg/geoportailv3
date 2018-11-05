/**
 * @module app.profile.ProfileController
 */
/**
 * @fileoverview This file provides a profile directive. This directive is used
 * to create a profile panel in the page.
 *
 * Example:
 *
 * <app-profile app-profile-data="mainCtrl.profileData"
 *   app-profile-open="mainCtrl.profileOpen" app-profile-map="::mainCtrl.map">
 * </app-profile>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */

import appModule from '../module.js';
import {listen} from 'ol/events.js';
import olFeature from 'ol/Feature.js';
import olMapBrowserEventType from 'ol/MapBrowserEventType.js';
import olOverlay from 'ol/Overlay.js';
import olGeomGeometryLayout from 'ol/geom/GeometryLayout.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomPoint from 'ol/geom/Point.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleStyle from 'ol/style/Style.js';

/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {string} echocsvUrl URL to echo web service.
 * @param {Document} $document Document.
 * @export
 * @ngInject
 */
const exports = function($scope, ngeoFeatureOverlayMgr, echocsvUrl,
    $document) {

  /**
   * @type {boolean}
   * @private
   */
  this.showTooltip_ = true;

  /**
   * @type {string}
   * @export
   */
  this.elevationGain;

  /**
   * @type {string}
   * @export
   */
  this.elevationLoss;

  /**
   * @type {string}
   * @export
   */
  this.cumulativeElevation;

  /**
   * @private
   * @type {Document}
   */
  this.$document_ = $document;

  /**
   * @private
   * @type {string}
   */
  this.echocsvUrl_ = echocsvUrl;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @private
   */
  this.distanceLabel_ = 'Distance : ';

  /**
   * @private
   */
  this.elevationLabel_ = 'Elevation : ';

  /**
   * Overlay to show the measurement.
   * @type {ol.Overlay}
   * @private
   */
  this.measureTooltip_ = null;

  /**
   * The measure tooltip element.
   * @type {Element}
   * @private
   */
  this.measureTooltipElement_ = null;

  /**
   * The draw overlay
   * @type {ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  this.featureOverlay_.setStyle(
      new olStyleStyle({
        image: new olStyleCircle({
          radius: 3,
          fill: new olStyleFill({color: '#ffffff'})
        })
      }));

  /**
   * @type {ol.geom.LineString}
   * @private
   */
  this.line_ = null;

  /**
   * @param {Object} item The item.
   * @return {number} The elevation.
   */
  var z = function(item) {
    if ('values' in item && 'dhm' in item['values']) {
      return parseFloat((item['values']['dhm'] / 100).toPrecision(5));
    }
    return 0;
  };

  /**
    * @param {Object} item The item.
    * @return {number} The distance.
    */
  var dist = function(item) {
    if ('dist' in item) {
      return item['dist'];
    }
    return 0;
  };

  /**
   * @type {ol.Feature}
   * @private
   */
  this.snappedPoint_ = new olFeature();
  this.featureOverlay_.addFeature(this.snappedPoint_);

  /**
   * @type {ol.EventsKey}
   * @private
   */
  this.event_ = listen(this['map'], olMapBrowserEventType.POINTERMOVE,
      /**
       * @param {ol.MapBrowserPointerEvent} evt Map browser event.
       */
      function(evt) {
        if (evt.dragging || this.line_ === null) {
          return;
        }
        var coordinate = this['map'].getEventCoordinate(evt.originalEvent);
        this.snapToGeometry_(coordinate, this.line_);
      }, this);

  /**
   * @param {Object} point The point.
   * @param {number} dist The distance.
   * @param {string} xUnits The x unit.
   * @param {Object} elevation The elevation.
   * @param {string} yUnits The y unit.
   */
  var hoverCallback = function(point, dist, xUnits, elevation, yUnits) {
    if (this.showTooltip_) {
      // An item in the list of points given to the profile.
      this['point'] = point;
      this.featureOverlay_.clear();
      var curPoint = new olGeomPoint([point['x'], point['y']]);
      curPoint.transform('EPSG:2169', this['map'].getView().getProjection());
      var positionFeature = new olFeature({
        geometry: curPoint
      });
      this.featureOverlay_.addFeature(positionFeature);
      this.createMeasureTooltip_();
      this.measureTooltipElement_.innerHTML = this.distanceLabel_ +
          this.formatDistance_(dist, xUnits) +
          '<br>' +
          this.elevationLabel_ +
          this.formatElevation_(elevation['line1'], yUnits);
      this.measureTooltip_.setPosition(curPoint.getCoordinates());
      this.snappedPoint_.setGeometry(new olGeomPoint([point.x, point.y]));
    }
  }.bind(this);

  var outCallback = function() {
    if (this.showTooltip_) {
      this['point'] = null;
      this.removeMeasureTooltip_();
      this.featureOverlay_.clear();
      this.snappedPoint_.setGeometry(null);
    }
  }.bind(this);
  var linesConfiguration = {
    'line1': {
      style: {},
      zExtractor: z
    }
  };

  this['profileOptions'] = {
    linesConfiguration: linesConfiguration,
    distanceExtractor: dist,
    hoverCallback: hoverCallback,
    outCallback: outCallback,
    formatter: {
      xhover: this.formatDistance_,
      yhover: this.formatElevation_
    }
  };


  this['point'] = null;

  this.unwatchProfileData = $scope.$watch(function() {
    return this['profileData'];
  }.bind(this), function(newVal, oldVal) {
    if (newVal !== undefined) {
      var i;
      var len = newVal.length;
      var lineString = new olGeomLineString([], olGeomGeometryLayout.XYM);
      for (i = 0; i < len; i++) {
        var p = newVal[i];
        p = new olGeomPoint([p['x'], p['y']]);
        p.transform('EPSG:2169', this['map'].getView().getProjection());
        lineString.appendCoordinate(
            p.getCoordinates().concat(newVal[i]['dist']));
      }
      this.line_ = lineString;
      this.elevationGain = this.formatElevationGain_(newVal[len - 1]['elevationGain'], 'm');
      this.elevationLoss = this.formatElevationGain_(-1 * newVal[len - 1]['elevationLoss'], 'm');
      this.cumulativeElevation = this.formatElevationGain_(newVal[len - 1]['cumulativeElevation'], 'm');
    } else {
      this.line_ = null;
    }
  }.bind(this));

  this.scope_.$on('$destroy', function() {
    olEvents.unlistenByKey(this.event_);
    this.unwatchProfileData();
  }.bind(this));
};


/**
 * Creates a new measure tooltip
 * @private
 */
exports.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = document.createElement('DIV');
  this.measureTooltipElement_.classList.add('tooltip');
  this.measureTooltipElement_.classList.add('ngeo-tooltip-measure');
  this.measureTooltip_ = new olOverlay({
    element: this.measureTooltipElement_,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  this['map'].addOverlay(this.measureTooltip_);
};


/**
 * Destroy the help tooltip
 * @private
 */
exports.prototype.removeMeasureTooltip_ = function() {
  if (this.measureTooltipElement_  !== null) {
    this.measureTooltipElement_.parentNode.removeChild(
        this.measureTooltipElement_);
    this.measureTooltipElement_ = null;
    this.measureTooltip_ = null;
  }
};


/**
 * Format the distance text.
 * @param {number} dist The distance.
 * @param {string} units The unit.
 * @return {string} The formatted distance.
 * @private
 */
exports.prototype.formatDistance_ = function(dist, units) {
  return parseFloat(dist.toPrecision(3)) + ' ' + units;
};


/**
 * Format the elevation text.
 * @param {number} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} The elevation text.
 * @private
 */
exports.prototype.formatElevation_ = function(elevation, units) {
  return parseFloat(elevation.toPrecision(4)) + ' ' + units;
};


/**
 * Format the elevation gain text.
 * @param {number} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} the elevation gain text.
 * @private
 */
exports.prototype.formatElevationGain_ =
    function(elevation, units) {
      return parseFloat(parseInt(elevation, 10)) + ' ' + units;
    };


/**
 * @param {ol.Coordinate} coordinate The current pointer coordinate.
 * @param {ol.geom.Geometry|undefined} geom The geometry to snap to.
 * @private
 */
exports.prototype.snapToGeometry_ = function(coordinate, geom) {
  var closestPoint = geom.getClosestPoint(coordinate);
  // compute distance to line in pixels
  var dx = closestPoint[0] - coordinate[0];
  var dy = closestPoint[1] - coordinate[1];
  var viewResolution = this['map'].getView().getResolution();
  var distSqr = dx * dx + dy * dy;
  var pixelDistSqr = distSqr / (viewResolution * viewResolution);
  // Check whether dist is lower than 8 pixels
  this['profileHighlight'] = pixelDistSqr < 64 ? closestPoint[2] : -1;
  if (this['profileHighlight'] > -1) {
    this.showTooltip_ = false;
  } else {
    this.showTooltip_ = true;
  }
  this.scope_.$digest();
};


/**
 * Export the data as a csv file.
 * @export
 */
exports.prototype.exportCSV = function() {
  var csv = 'dist,MNT,y,x\n';
  this['profileData'].forEach(function(item) {
    csv = csv + item['dist'] + ',' +
          (item['values']['dhm']) / 100 + ',' +
          item['x'] + ',' +
          item['y'] + '\n';
  }.bind(this));

  var csvInput = $('<input>').attr({
    type: 'hidden',
    name: 'csv',
    value: csv
  });
  var nameInput = $('<input>').attr({
    type: 'hidden',
    name: 'name',
    value: 'mnt'
  });

  var form = $('<form>').attr({
    method: 'POST',
    action: this.echocsvUrl_
  });
  form.append(nameInput, csvInput);
  angular.element(this.$document_[0].body).append(form);
  form[0].submit();
  form.remove();
};

appModule.controller('AppProfileController', exports);


export default exports;

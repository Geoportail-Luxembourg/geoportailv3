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
goog.provide('app.profileDirective');

goog.require('app');
goog.require('ngeo');
goog.require('ngeo.profileDirective');
goog.require('ol.Feature');
goog.require('ol.FeatureOverlay');
goog.require('ol.MapBrowserEvent.EventType');
goog.require('ol.Overlay');
goog.require('ol.geom.GeometryLayout');
goog.require('ol.geom.Point');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Style');


/**
 * @param {string} appProfileTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.profileDirective = function(appProfileTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'profileData': '=appProfileData',
      'profileOpen': '=appProfileOpen',
      'map': '=appProfileMap'
    },
    controller: 'AppProfileController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appProfileTemplateUrl
  };
};

app.module.directive('appProfile', app.profileDirective);



/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @export
 * @ngInject
 */
app.ProfileController = function($scope) {

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
   * @type {ol.style.Style}
   * @private
   */
  this.style_ = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 3,
      fill: new ol.style.Fill({color: 'white'})
    })
  });

  /**
   * The draw overlay
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.overlay_ = new ol.FeatureOverlay({
    map: this['map'],
    style: this.style_
  });


  /**
   * @param {Object} item
   * @return {number}
   */
  var z = function(item) {
    if ('values' in item && 'dhm' in item['values']) {
      return parseFloat((item['values']['dhm'] / 100).toPrecision(5));
    }
    return 0;
  };

  /**
    * @param {Object} item
    * @return {number}
    */
  var dist = function(item) {
    if ('dist' in item) {
      return item['dist'];
    }
    return 0;
  };

  /**
   * @type {Object}
   */
  var extractor = {z: z, dist: dist};

  /**
   * @type {ol.Feature}
   * @private
   */
  this.snappedPoint_ = new ol.Feature();
  this.overlay_.addFeature(this.snappedPoint_);


  goog.events.listen(this['map'], ol.MapBrowserEvent.EventType.POINTERMOVE,
      /**
       * @param {ol.MapBrowserPointerEvent} evt Map browser event.
       */
      function(evt) {
        if (evt.dragging || !goog.isDef(this.line_)) {
          return;
        }
        var coordinate = this['map'].getEventCoordinate(evt.originalEvent);
        this.snapToGeometry(coordinate, this.line_);
      }, undefined, this);


  /**
   * @param {Object} point
   * @param {number} dist
   * @param {string} xUnits
   * @param {number} elevation
   * @param {string} yUnits
   */
  var hoverCallback = goog.bind(
      function(point, dist, xUnits, elevation, yUnits) {
        // An item in the list of points given to the profile.
        this['point'] = point;
        this.overlay_.getFeatures().clear();
        var curPoint = new ol.geom.Point([point['x'], point['y']]);
        curPoint.transform('EPSG:2169', this['map'].getView().getProjection());
        var positionFeature = new ol.Feature({
          geometry: curPoint
        });
        this.overlay_.addFeature(positionFeature);

        this.createMeasureTooltip_();
        this.measureTooltipElement_.innerHTML = this.distanceLabel_ +
            this.formatDistance_(dist, xUnits) +
            '<br>' +
            this.elevationLabel_ +
            this.formatElevation_(elevation, yUnits);
        this.measureTooltip_.setPosition(curPoint.getCoordinates());

        this.snappedPoint_.setGeometry(new ol.geom.Point([point.x, point.y]));

      }, this);

  var outCallback = goog.bind(function() {
    this['point'] = null;
    this.removeMeasureTooltip_();
    this.overlay_.getFeatures().clear();
    this.snappedPoint_.setGeometry(null);
  }, this);

  this['profileOptions'] = {
    elevationExtractor: extractor,
    hoverCallback: hoverCallback,
    outCallback: outCallback,
    formatter: {
      xhover: this.formatDistance_,
      yhover: this.formatElevation_
    }
  };


  this['point'] = null;

  $scope.$watch(goog.bind(function() {
    return this['profileData'];
  }, this), goog.bind(function(newVal, oldVal) {
    if (goog.isDef(newVal)) {
      var i;
      var len = newVal.length;
      var lineString = new ol.geom.LineString([], ol.geom.GeometryLayout.XYM);
      for (i = 0; i < len; i++) {
        var p = newVal[i];
        p = new ol.geom.Point([p['x'], p['y']]);
        p.transform('EPSG:2169', this['map'].getView().getProjection());
        lineString.appendCoordinate(
            p.getCoordinates().concat(newVal[i]['dist']));
      }
      this.line_ = lineString;
    }
  }, this));
};


/**
 * Creates a new measure tooltip
 * @private
 */
app.ProfileController.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = goog.dom.createDom(goog.dom.TagName.DIV);
  goog.dom.classlist.addAll(this.measureTooltipElement_,
      ['tooltip', 'tooltip-measure']);
  this.measureTooltip_ = new ol.Overlay({
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
app.ProfileController.prototype.removeMeasureTooltip_ = function() {
  if (!goog.isNull(this.measureTooltipElement_)) {
    this.measureTooltipElement_.parentNode.removeChild(
        this.measureTooltipElement_);
    this.measureTooltipElement_ = null;
    this.measureTooltip_ = null;
  }
};


/**
 * Format the distance text.
 * @param {number} dist
 * @param {string} units
 * @return {string}
 * @private
 */
app.ProfileController.prototype.formatDistance_ = function(dist, units) {
  return parseFloat(dist.toPrecision(3)) + ' ' + units;
};


/**
 * Format the elevation text.
 * @param {number} elevation
 * @param {string} units
 * @return {string}
 * @private
 */
app.ProfileController.prototype.formatElevation_ = function(elevation, units) {
  return parseFloat(elevation.toPrecision(4)) + ' ' + units;
};


/**
 * @param {ol.Coordinate} coordinate The current pointer coordinate.
 * @param {ol.geom.Geometry|undefined} geom The geometry to snap to.
 */
app.ProfileController.prototype.snapToGeometry = function(coordinate, geom) {
  var closestPoint = geom.getClosestPoint(coordinate);
  // compute distance to line in pixels
  var dx = closestPoint[0] - coordinate[0];
  var dy = closestPoint[1] - coordinate[1];
  var viewResolution = this['map'].getView().getResolution();
  var distSqr = dx * dx + dy * dy;
  var pixelDistSqr = distSqr / (viewResolution * viewResolution);
  // Check whether dist is lower than 8 pixels
  this['profileHighlight'] = pixelDistSqr < 64 ? closestPoint[2] : -1;

  this.scope_.$apply();
};

app.module.controller('AppProfileController', app.ProfileController);

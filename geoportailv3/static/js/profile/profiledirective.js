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
goog.require('ol.Overlay');
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
        var srcPoint = new ol.geom.Point([point['x'], point['y']]);
        var curPoint = /** @type {ol.geom.Point} */
            (srcPoint.transform(
                'EPSG:2169', this['map'].getView().getProjection()));
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

      }, this);

  var outCallback = goog.bind(function() {
    this['point'] = null;
    this.removeMeasureTooltip_();
    this.overlay_.getFeatures().clear();
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

app.module.controller('AppProfileController', app.ProfileController);

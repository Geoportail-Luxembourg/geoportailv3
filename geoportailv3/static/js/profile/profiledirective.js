/**
 * @fileoverview This file provides a measure directive. This directive is used
 * to create a measure panel in the page.
 *
 * Example:
 *
 * <app-measure app-measure-map="::mainCtrl.map"></app-measure>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.profileDirective');

goog.require('app');
goog.require('app.interaction.MeasureProfile');
goog.require('ngeo');
goog.require('ngeo.profileDirective');
goog.require('ol.FeatureOverlay');


/**
 * @param {string} appProfileTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.profileDirective = function(appProfileTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'profiledata': '=appProfiledata',
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
      return parseFloat((item['values']['dhm'] / 100).toPrecision(3));
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

  // Using closures for hoverCallback and outCallback since
  // wrapping in angular.bind leads to a closure error.
  // See PR https://github.com/google/closure-compiler/pull/867
  var that = this;

  /**
   * @param {Object} point
   */
  var hoverCallback = function(point) {
    // An item in the list of points given to the profile.
    that['point'] = point;
    var dist = point['dist'];
    var dhm = point['values']['dhm'];
    that.overlay_.getFeatures().clear();
    var srcPoint = new ol.geom.Point([point['x'], point['y']]);
    var curPoint = /** @type {ol.geom.Point} */
        (srcPoint.transform(
            'EPSG:2169', that['map'].getView().getProjection()));
    var positionFeature = new ol.Feature({
      geometry: curPoint
    });
    that.overlay_.addFeature(positionFeature);

    that.createMeasureTooltip_();
    that.measureTooltipElement_.innerHTML = that.distanceLabel_ +
        that.formatDistance_(dist) +
        '<br>' +
        that.elevationLabel_ +
        that.formatElevation_(dhm);
    that.measureTooltip_.setPosition(curPoint.getCoordinates());

  };

  var outCallback = function() {
    that['point'] = null;
    that.removeMeasureTooltip_();
    that.overlay_.getFeatures().clear();
  };


  this['profileOptions'] = {
    elevationExtractor: extractor,
    hoverCallback: hoverCallback,
    outCallback: outCallback
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
 * @return {string}
 * @private
 */
app.ProfileController.prototype.formatDistance_ = function(dist) {

  if (dist > 1000) {
    return parseFloat((dist / 1000).toPrecision(3)) +
        ' ' + 'km';
  }

  return parseFloat(dist.toPrecision(3)) +
      ' ' + 'm';
};


/**
 * Format the elevation text.
 * @param {number} elevation
 * @return {string}
 * @private
 */
app.ProfileController.prototype.formatElevation_ = function(elevation) {

  return parseFloat((elevation / 100).toPrecision(3)) +
      ' ' + 'm';
};

app.module.controller('AppProfileController', app.ProfileController);

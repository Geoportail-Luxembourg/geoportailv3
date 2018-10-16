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
goog.provide('app.measure.MeasureController');

goog.require('app.module');
goog.require('ngeo.misc.decorate');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureAzimut');
goog.require('ngeo.interaction.MeasureLength');
goog.require('ol.Object');
goog.require('ol.events');
goog.require('ol.interaction.Property');
goog.require('ol.proj');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');


/**
 * @param {string} appMeasureTemplateUrl Url to measure template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.measureDirective = function(appMeasureTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appMeasureMap',
      'active': '=appMeasureActive'
    },
    controller: 'AppMeasureController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMeasureTemplateUrl
  };
};


app.module.directive('appMeasure', app.measureDirective);


/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.$q} $q The q service.
 * @param {angular.$http} $http Angular http service.
 * @param {angular.$compile} $compile The compile provider.
 * @param {gettext} gettext Gettext service.
 * @param {app.GetProfile} appGetProfile The profile service.
 * interaction service.
 * @param {string} elevationServiceUrl The url of the service.
 * @param {app.Activetool} appActivetool The activetool service.
 * @param {angular.$filter} $filter Angular filter service.
 * @constructor
 * @export
 * @ngInject
 */
app.MeasureController = function($scope, $q, $http, $compile, gettext,
    appGetProfile, elevationServiceUrl,
    appActivetool, $filter) {

  /**
   * @type {app.Activetool}
   * @private
   */
  this.appActivetool_ = appActivetool;

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {app.GetProfile}
   * @private
   */
  this.getProfile_ = appGetProfile;

  /**
   * @type {string}
   * @private
   */
  this.elevationServiceUrl_ = elevationServiceUrl;

  var sketchStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.4)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(0, 0, 0, 0.5)',
      lineDash: [10, 10],
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 5,
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.7)'
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.4)'
      })
    })
  });

  var style = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 204, 51, 0.3)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(255, 204, 51, 1)',
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: 'rgba(255, 204, 51, 0.3)'
      })
    })
  });

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];


  var helpMsg = gettext('Click to start drawing profile');
  var contMsg = gettext('Click to continue drawing the line<br>' +
      'Double-click or click last point to finish');
  var measureProfile = new ngeo.interaction.MeasureLength(
    $filter('ngeoUnitPrefix'),
    {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle
    });

  /**
   * @type {app.interaction.MeasureProfile}
   */
  this['measureProfile'] = measureProfile;
  measureProfile.setActive(false);
  ngeo.misc.decorate.interaction(measureProfile);
  this.map_.addInteraction(measureProfile);

  helpMsg = gettext('Click to start drawing length');
  var measureLength = new ngeo.interaction.MeasureLength(
    $filter('ngeoUnitPrefix'),
    {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle
    });

  /**
   * @type {array<object>}
   */
  this['profileData'] = undefined;

  /**
   * @type {ngeo.interaction.MeasureLength}
   */
  this['measureLength'] = measureLength;

  measureLength.setActive(false);
  ngeo.misc.decorate.interaction(measureLength);
  this.map_.addInteraction(measureLength);

  helpMsg = gettext('Click to start drawing area');
  contMsg = gettext('Click to continue drawing the polygon<br>' +
      'Double-click or click last point to finish');
  var measureArea = new ngeo.interaction.MeasureArea(
    $filter('ngeoUnitPrefix'),
    {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle,
      style: style
    });

  /**
   * @type {ngeo.interaction.MeasureArea}
   */
  this['measureArea'] = measureArea;

  measureArea.setActive(false);
  ngeo.misc.decorate.interaction(measureArea);
  this.map_.addInteraction(measureArea);

  helpMsg = gettext('Click to start drawing azimut');
  contMsg = gettext('Click to finish');
  /** @type {ngeo.interaction.MeasureAzimut} */
  var measureAzimut = new ngeo.interaction.MeasureAzimut(
    $filter('ngeoUnitPrefix'), $filter('ngeoNumber'),
    {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle,
      style: style
    });

  /**
   * @type {ngeo.interaction.MeasureAzimut}
   */
  this['measureAzimut'] = measureAzimut;

  measureAzimut.setActive(false);
  ngeo.misc.decorate.interaction(measureAzimut);
  this.map_.addInteraction(measureAzimut);

  ol.events.listen(measureAzimut, 'measureend',
      goog.bind(function(evt) {
        var geometryCollection =
            /** @type {ol.geom.GeometryCollection} */
            (evt.detail.feature.getGeometry());

        var radius =
            /** @type {ol.geom.LineString} */
            (geometryCollection.getGeometries()[0]);
        var radiusCoordinates = radius.getCoordinates();
        $q.all([this.getElevation_(radiusCoordinates[0]),
          this.getElevation_(radiusCoordinates[1])]
        ).then(goog.bind(function(data) {
          if (data[0].data['dhm'] >= 0 && data[1].data['dhm'] >= 0) {
            var el = evt.target.getTooltipElement();
            var elevationOffset = data[1].data['dhm'] - data[0].data['dhm'];
            el.innerHTML += '<br> &Delta;h : ' +
                parseInt(elevationOffset / 100, 0) + 'm';
          }
        }, this));
      }, this));

  ol.events.listen(measureProfile, 'measureend',
      function(evt) {
        var geom = /** @type {ol.geom.LineString} */
            (evt.detail.feature.getGeometry());
        this.getProfile_(geom).then(
            goog.bind(function(resp) {
              this['profileData'] = resp;
            }, this));
      }, this);

  ol.events.listen(measureProfile, ol.Object.getChangeEventType('active'),
      /**
       * @param {ol.Object.Event} evt Change active event.
       */
      function(evt) {
        if (!measureProfile.getActive()) {
          this['profileData'] = undefined;
          $scope.$applyAsync();
        }
      }, this);

  // Watch the "active" property, and disable the measure interactions
  // when "active" gets set to false.
  $scope.$watch(goog.bind(function() {
    return this['active'];
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      this['measureLength'].setActive(false);
      this['measureArea'].setActive(false);
      this['measureAzimut'].setActive(false);
      this['measureProfile'].setActive(false);
      this.appActivetool_.measureActive = false;
    } else {
      this.appActivetool_.measureActive = false;
    }
  }, this));
  ol.events.listen(this['measureLength'], ol.Object.getChangeEventType(
    ol.interaction.Property.ACTIVE),
    this.onChangeActive_, this);
  ol.events.listen(this['measureArea'], ol.Object.getChangeEventType(
    ol.interaction.Property.ACTIVE),
    this.onChangeActive_, this);
  ol.events.listen(this['measureAzimut'], ol.Object.getChangeEventType(
    ol.interaction.Property.ACTIVE),
    this.onChangeActive_, this);
  ol.events.listen(this['measureProfile'], ol.Object.getChangeEventType(
    ol.interaction.Property.ACTIVE),
    this.onChangeActive_, this);
};


/**
 * @param {ol.Object.Event} event The event.
 * @private
 */
app.MeasureController.prototype.onChangeActive_ = function(event) {
  if (this['measureLength'].getActive() ||
      this['measureArea'].getActive() ||
      this['measureAzimut'].getActive() ||
      this['measureProfile'].getActive()) {
    this.appActivetool_.measureActive = true;
  } else {
    this.appActivetool_.measureActive = false;
  }
};


/**
 * @param {ol.Coordinate} coordinates The coordinate.
 * @return {angular.$q.Promise} The promise.
 * @private
 */
app.MeasureController.prototype.getElevation_ = function(coordinates) {
  var eastnorth =
      /** @type {ol.Coordinate} */ (ol.proj.transform(
      coordinates,
      this.map_.getView().getProjection(),
      'EPSG:2169'));

  return this.$http_.get(this.elevationServiceUrl_, {
    params: {'lon': eastnorth[0], 'lat': eastnorth[1]}
  });
};

app.module.controller('AppMeasureController', app.MeasureController);

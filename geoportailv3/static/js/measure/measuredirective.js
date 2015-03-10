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
goog.provide('app.measureDirective');

goog.require('app');
goog.require('app.interaction.MeasureProfile');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.btngroupDirective');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureAzimut');
goog.require('ngeo.interaction.MeasureLength');
goog.require('ol.source.Vector');


/**
 * @param {string} appMeasureTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.measureDirective = function(appMeasureTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appMeasureMap',
      'active': '=appMeasureActive',
      'profiledata': '=appProfiledata',
      'profileOpen': '=appProfileOpen'
    },
    controller: 'AppMeasureController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMeasureTemplateUrl
  };
};


app.module.directive('appMeasure', app.measureDirective);



/**
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$q} $q
 * @param {angular.$http} $http Angular http service.
 * @param {ngeo.DecorateInteraction} ngeoDecorateInteraction Decorate
 *     interaction service.
 * @param {string} elevationServiceUrl the url of the service
 * @constructor
 * @export
 * @ngInject
 */
app.MeasureController = function($scope, $q, $http, ngeoDecorateInteraction,
    elevationServiceUrl) {

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

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

  var measureProfile = new app.interaction.MeasureProfile({
    sketchStyle: sketchStyle
  });

  /**
   * @type {app.interaction.MeasureProfile}
   */
  this['measureProfile'] = measureProfile;
  measureProfile.setActive(false);
  ngeoDecorateInteraction(measureProfile);
  map.addInteraction(measureProfile);

  var measureLength = new ngeo.interaction.MeasureLength({
    sketchStyle: sketchStyle
  });

  /**
   * @type {ngeo.interaction.MeasureLength}
   */
  this['measureLength'] = measureLength;

  measureLength.setActive(false);
  ngeoDecorateInteraction(measureLength);
  this.map_.addInteraction(measureLength);

  var measureArea = new ngeo.interaction.MeasureArea({
    sketchStyle: sketchStyle,
    style: style
  });

  /**
   * @type {ngeo.interaction.MeasureArea}
   */
  this['measureArea'] = measureArea;

  measureArea.setActive(false);
  ngeoDecorateInteraction(measureArea);
  this.map_.addInteraction(measureArea);

  /** @type {ngeo.interaction.MeasureAzimut} */
  var measureAzimut = new ngeo.interaction.MeasureAzimut({
    sketchStyle: sketchStyle,
    style: style
  });

  /**
   * @type {ngeo.interaction.MeasureAzimut}
   */
  this['measureAzimut'] = measureAzimut;

  measureAzimut.setActive(false);
  ngeoDecorateInteraction(measureAzimut);
  this.map_.addInteraction(measureAzimut);

  goog.events.listen(measureAzimut, ngeo.MeasureEventType.MEASUREEND,
      goog.bind(function(evt) {
        var geometryCollection =
            /** @type {ol.geom.GeometryCollection} */
            (evt.feature.getGeometry());

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


  goog.events.listen(measureProfile.drawInteraction, ol.DrawEventType.DRAWEND,
      function(evt) {
        var geom = /** @type {ol.geom.Geometry} */ (evt.feature.getGeometry());
        var encOpt = {
          dataProjection: 'EPSG:2169',
          featureProjection: this['map'].getView().getProjection()
        };
        var req = $.param({
          'geom': new ol.format.GeoJSON().writeGeometry(geom, encOpt),
          'nbPoints': 100,
          'layers': 'dhm'
        });
        var config = {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        };
        this['profileOpen'] = true;
        $http.post('profile.json', req, config).then(
            angular.bind(this, function(resp) {
              this['profiledata'] = resp.data['profile'];
            }));
      },
      false,
      this);

  $scope.$watch(goog.bind(function() {
    return this['measureProfile'].getActive();
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      this['profileOpen'] = false;
    }
  }, this));

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
    }
  }, this));
};


/**
 * @param {ol.Coordinate} coordinates
 * @return {angular.$q.Promise}
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

/**
 * @module app.measure.MeasureController
 */
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

import appModule from '../module.js';
import {interactionDecoration} from 'ngeo/misc/decorate.js';
import ngeoInteractionMeasureArea from 'ngeo/interaction/MeasureArea.js';
import ngeoInteractionMeasureAzimut from 'ngeo/interaction/MeasureAzimut.js';
import ngeoInteractionMeasureLength from 'ngeo/interaction/MeasureLength.js';
import draw from '../draw/DrawController.js';
import {getChangeEventType} from 'ol/Object.js';
import {listen} from 'ol/events.js';
import {transform} from 'ol/proj.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleText from 'ol/style/Text.js';
import olStyleStyle from 'ol/style/Style.js';
import olLayerVector from 'ol/layer/Vector.js';
import olSourceVector from 'ol/source/Vector.js';
import olFeature from 'ol/Feature.js';
import { fromCircle } from 'ol/geom/Polygon';


/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.$q} $q The q service.
 * @param {angular.$http} $http Angular http service.
 * @param {angular.$compile} $compile The compile provider.
 * @param {gettext} gettext Gettext service.
 * @param {!angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {app.GetProfile} appGetProfile The profile service.
 * interaction service.
 * @param {string} elevationServiceUrl The url of the service.
 * @param {app.Activetool} appActivetool The activetool service.
 * @param {angular.$filter} $filter Angular filter service.
 * @constructor
 * @export
 * @ngInject
 */
const exports = function($scope, $q, $http, $compile, gettext,
    gettextCatalog, appGetProfile, elevationServiceUrl,
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

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  var sketchStyle_ = new olStyleStyle({
    fill: new olStyleFill({
      color: 'rgba(255, 255, 255, 0.4)'
    }),
    stroke: new olStyleStroke({
      color: 'rgba(0, 0, 0, 0.5)',
      lineDash: [10, 10],
      width: 2
    }),
    image: new olStyleCircle({
      radius: 5,
      stroke: new olStyleStroke({
        color: 'rgba(0, 0, 0, 0.7)'
      }),
      fill: new olStyleFill({
        color: 'rgba(255, 255, 255, 0.4)'
      })
    }),
    text: new olStyleText({
      font: '12px Calibri,sans-serif',
      fill: new olStyleFill({
        color: 'rgba(255, 255, 255, 1)'
      }),
      stroke: new olStyleStroke({
        color: 'rgba(0, 0, 0, 0.8)',
        width: 3
      }),
      overflow: true
    })
  });

  const clearText = text => {
    text = text.replace('&nbsp;', ' ')
    text = text.replace('<sup>2</sup>', '²')
    text = text.replace('<br>', '\n')
    return text.startsWith('NaN') ? '' : text
  }
  const generateStyle = baseStyle => f => {
    const geomType = f.getGeometry().getType()

    if (['Point', 'Circle'].includes(geomType)) {
      return baseStyle;
    }
    if (this['measureArea'].getActive() && (geomType !== 'Polygon')) {
      return baseStyle;
    }
    // Clone style because text style should not be shared
    const style = baseStyle.clone()
    const getCollectionStyle = (s, transform) => {
      let clone = s.clone()
      clone.getText().setText('')
      let geometries = f.getGeometry().getGeometries()
      let radius = geometries.find(g => g.getType() === 'LineString')
      let circle = geometries.find(g => g.getType() === 'Circle')
      s.setGeometry(radius);
      clone.setGeometry(transform ? fromCircle(circle, 64) : circle);
      return [ clone, s ]
    }

    // once interaction is deactivated, one cannot access to its tooltip,
    // we have to store measure text on `measureend`
    if (f.get('text')) {
      style.getText().setText(f.get('text'))
      if (geomType === 'GeometryCollection') {
        return getCollectionStyle(style, true)
      }
      return style
    }

    let text
    try {
      text = (this[
        geomType === 'LineString' ? 'measureLength' :
        geomType === 'Polygon' ? 'measureArea' :
        geomType === 'GeometryCollection' ? 'measureAzimut' : ''
      ].getTooltipElement() || this['measureProfile'].getTooltipElement()).innerHTML
    } catch {
      text = ''
    }

    style.getText().setText(clearText(text))
    if (geomType === 'GeometryCollection') {
      return getCollectionStyle(style)
    }
    return style
  }
  let sketchStyle = generateStyle(sketchStyle_)

  let style_ = new olStyleStyle({
    fill: new olStyleFill({
      color: 'rgba(255, 204, 51, 0.2)'
    }),
    stroke: new olStyleStroke({
      color: 'rgba(255, 204, 51, 1)',
      width: 2
    }),
    image: new olStyleCircle({
      radius: 7,
      fill: new olStyleFill({
        color: 'rgba(255, 204, 51, 0.3)'
      })
    }),
    text: new olStyleText({
      font: 'bold 12px Calibri,sans-serif',
      fill: new olStyleFill({
        color: 'rgb(0 0 0)'
      }),
      stroke: new olStyleStroke({
        color: 'rgba(255, 204, 51, 1)',
        width: 4
      }),
      overflow: true
    })
  });
  var style = generateStyle(style_)

  const layer = new olLayerVector({
    source: new olSourceVector(),
    style: style,
    metadata: {
      hidden: true
    }
  })
  this.map_.addLayer(layer)

  var helpMsg = gettext('Click to start drawing profile');
  var contMsg = gettext('Click to continue drawing the line<br>' +
      'Double-click or click last point to finish');
  var measureProfile = new ngeoInteractionMeasureLength(
    $filter('ngeoUnitPrefix'),
    gettextCatalog, {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle,
      style: style
    });

  /**
   * @type {app.interaction.MeasureProfile}
   */
  this['measureProfile'] = measureProfile;
  measureProfile.setActive(false);
  interactionDecoration(measureProfile);
  this.map_.addInteraction(measureProfile);

  helpMsg = gettext('Click to start drawing length');
  var measureLength = new ngeoInteractionMeasureLength(
    $filter('ngeoUnitPrefix'),
    gettextCatalog, {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle,
      style: style,
      layer: layer
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
  interactionDecoration(measureLength);
  this.map_.addInteraction(measureLength);

  helpMsg = gettext('Click to start drawing area');
  contMsg = gettext('Click to continue drawing the polygon<br>' +
      'Double-click or click last point to finish');

  /**
   * @type {ol.layer.Vector}
   */
  this['layer'] = layer

  /**
   * @type {ol.Feature}
   */
  this['persistedFeature'] = undefined

  var measureArea = new ngeoInteractionMeasureArea(
    $filter('ngeoUnitPrefix'),
    gettextCatalog, {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle,
      style: style,
      layer: layer
    });

  this['removeFeatures'] = function() {
    this['persistedFeature'] = undefined
    layer.getSource().clear()
  }

  /**
   * @type {ngeo.interaction.MeasureArea}
   */
  this['measureArea'] = measureArea;

  measureArea.setActive(false);
  interactionDecoration(measureArea);
  this.map_.addInteraction(measureArea);

  helpMsg = gettext('Click to start drawing azimut');
  contMsg = gettext('Click to finish');
  /** @type {ngeo.interaction.MeasureAzimut} */
  var measureAzimut = new ngeoInteractionMeasureAzimut(
    $filter('ngeoUnitPrefix'), $filter('ngeoNumber'),
    {
      startMsg: $compile('<div translate>' + helpMsg + '</div>')($scope)[0],
      continueMsg: $compile('<div translate>' + contMsg + '</div>')($scope)[0],
      sketchStyle: sketchStyle,
      style: style,
      layer: layer
    });

  /**
   * @type {ngeo.interaction.MeasureAzimut}
   */
  this['measureAzimut'] = measureAzimut;

  measureAzimut.setActive(false);
  interactionDecoration(measureAzimut);
  this.map_.addInteraction(measureAzimut);

  listen(measureAzimut, 'measureend',
      function(evt) {
        this['persistedFeature'] = evt.detail.feature
        this['persistedFeature'].set('text',
          clearText(this['measureAzimut'].getTooltipElement().innerHTML))
        var geometryCollection =
            /** @type {ol.geom.GeometryCollection} */
            (evt.detail.feature.getGeometry());

        var radius =
            /** @type {ol.geom.LineString} */
            (geometryCollection.getGeometries()[0]);
        var radiusCoordinates = radius.getCoordinates();
        $q.all([this.getElevation_(radiusCoordinates[0]),
          this.getElevation_(radiusCoordinates[1])]
        ).then(function(data) {
          if (data[0].data['dhm'] >= 0 && data[1].data['dhm'] >= 0) {
            var el = measureAzimut.getTooltipElement();
            var elevationOffset = data[1].data['dhm'] - data[0].data['dhm'];
            this['persistedFeature'].set('text',
              this['persistedFeature'].get('text') + 
              '\nΔh : ' + parseInt(elevationOffset, 0) + 'm')
            layer.changed()
          }
        }.bind(this));
      }.bind(this));

  listen(measureProfile, 'measureend',
      function(evt) {
        this['persistedFeature'] = evt.detail.feature
        this['persistedFeature'].set('text',
          clearText(this['measureProfile'].getTooltipElement().innerHTML))
        var geom = /** @type {ol.geom.LineString} */
            (evt.detail.feature.getGeometry());
        this.getProfile_(geom).then(
            function(resp) {
              this['profileData'] = resp;
            }.bind(this));
      }, this);

  listen(measureLength, 'measureend', evt => {
    this['persistedFeature'] = evt.detail.feature
    this['persistedFeature'].set('text',
      clearText(this['measureLength'].getTooltipElement().innerHTML))
  })
  listen(measureArea, 'measureend', evt => {
    this['persistedFeature'] = evt.detail.feature
    this['persistedFeature'].set('text',
      clearText(this['measureArea'].getTooltipElement().innerHTML))
  })


  listen(measureProfile, getChangeEventType('active'),
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
  $scope.$watch(function() {
    return this['active'];
  }.bind(this), function(newVal) {
    if (newVal === false) {
      this['measureLength'].setActive(false);
      this['measureArea'].setActive(false);
      this['measureAzimut'].setActive(false);
      this['measureProfile'].setActive(false);
      this.appActivetool_.measureActive = false;
    } else {
      this.appActivetool_.measureActive = false;
    }
  }.bind(this));
  listen(this['measureLength'], getChangeEventType(
    'active'),
    this.onChangeActive_, this);
  listen(this['measureArea'], getChangeEventType(
    'active'),
    this.onChangeActive_, this);
  listen(this['measureAzimut'], getChangeEventType(
    'active'),
    this.onChangeActive_, this);
  listen(this['measureProfile'], getChangeEventType(
    'active'),
    this.onChangeActive_, this);
};


/**
 * @param {ol.Object.Event} event The event.
 * @private
 */
exports.prototype.onChangeActive_ = function(event) {
  if (this['measureLength'].getActive() ||
      this['measureArea'].getActive() ||
      this['measureAzimut'].getActive() ||
      this['measureProfile'].getActive()) {
    this.appActivetool_.measureActive = true;
    this['layer'].getSource().clear()
  } else {
    this.appActivetool_.measureActive = false;
      if (this['persistedFeature']) {
        this['layer'].getSource().addFeature(this['persistedFeature'])
      }
  }
};


/**
 * @param {ol.Coordinate} coordinates The coordinate.
 * @return {angular.$q.Promise} The promise.
 * @private
 */
exports.prototype.getElevation_ = function(coordinates) {
  var eastnorth =
      /** @type {ol.Coordinate} */ (transform(
      coordinates,
      this.map_.getView().getProjection(),
      'EPSG:2169'));

  return this.$http_.get(this.elevationServiceUrl_, {
    params: {'lon': eastnorth[0], 'lat': eastnorth[1]}
  });
};

appModule.controller('AppMeasureController', exports);


export default exports;

/**
 * @fileoverview This file provides a draw directive. This directive is used
 * to create a draw panel in the page.
 *
 * Example:
 *
 * <app-draw app-draw-map="::mainCtrl.map"
 *           app-draw-queryactive="mainCtrl.queryActive"
 *           app-draw-active="mainCtrl.drawOpen"></app-draw>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.DrawController');
goog.provide('app.DrawEventType');
goog.provide('app.drawDirective');


goog.require('app');
goog.require('app.DrawnFeatures');
goog.require('app.FeaturePopup');
goog.require('app.Mymaps');
goog.require('app.SelectedFeatures');
goog.require('goog.asserts');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.Location');
goog.require('ngeo.format.FeatureHash');
goog.require('ol.CollectionEventType');
goog.require('ol.FeatureStyleFunction');
goog.require('ol.events.condition');
goog.require('ol.geom.GeometryType');
goog.require('ol.interaction.Draw');
goog.require('ol.interaction.Modify');
goog.require('ol.interaction.Select');
goog.require('ol.style.RegularShape');


/**
 * @enum {string}
 */
app.DrawEventType = {
  PROPERTYMODIFYEND: 'propertymodifyend'
};


/**
 * @param {string} appDrawTemplateUrl Url to draw template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.drawDirective = function(appDrawTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appDrawMap',
      'active': '=appDrawActive',
      'queryActive': '=appDrawQueryactive'
    },
    controller: 'AppDrawController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appDrawTemplateUrl
  };
};


app.module.directive('appDraw', app.drawDirective);



/**
 * @param {!angular.Scope} $scope Scope.
 * @param {ngeo.DecorateInteraction} ngeoDecorateInteraction Decorate
 *     interaction service.
 * @param {ngeo.Location} ngeoLocation Location service.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {app.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @constructor
 * @export
 * @ngInject
 */
app.DrawController = function($scope, ngeoDecorateInteraction, ngeoLocation,
    ngeoFeatureOverlayMgr, appFeaturePopup, appDrawnFeatures,
    appSelectedFeatures, appMymaps) {

  /**
   * @type {ol.Map}
   * @export
   */
  this.map;

  /**
   * @type {boolean}
   * @export
   */
  this.active;

  /**
   * @type {number}
   * @private
   */
  this.featureSeq_ = 0;

  /**
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {app.FeaturePopup}
   * @private
   */
  this.featurePopup_ = appFeaturePopup;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ngeo.format.FeatureHash}
   * @private
   */
  this.fhFormat_ = new ngeo.format.FeatureHash({
    encodeStyles: false,
    properties: (
        /**
         * @param {ol.Feature} feature Feature.
         * @return {Object.<string, (string|number)>} Properties to encode.
         */
        function(feature) {
          // Do not encode the __editable__ and __selected__ properties.
          var properties = feature.getProperties();
          delete properties['__editable__'];
          delete properties['__selected__'];
          for (var key in properties) {
            if (goog.isNull(properties[key])) {
              delete properties[key];
            }
          }
          return properties;
        })
  });

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = app.DrawController.createStyleFunction();

  var drawPoint = new ol.interaction.Draw({
    features: this.drawnFeatures_,
    type: ol.geom.GeometryType.POINT
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawPoint = drawPoint;

  drawPoint.setActive(false);
  ngeoDecorateInteraction(drawPoint);
  this.map.addInteraction(drawPoint);
  goog.events.listen(drawPoint, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawPoint, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

  var drawLine = new ol.interaction.Draw({
    features: this.drawnFeatures_,
    type: ol.geom.GeometryType.LINE_STRING
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawLine = drawLine;

  drawLine.setActive(false);
  ngeoDecorateInteraction(drawLine);
  this.map.addInteraction(drawLine);
  goog.events.listen(drawLine, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawLine, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

  var drawPolygon = new ol.interaction.Draw({
    features: this.drawnFeatures_,
    type: ol.geom.GeometryType.POLYGON
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawPolygon = drawPolygon;

  drawPolygon.setActive(false);
  ngeoDecorateInteraction(drawPolygon);
  this.map.addInteraction(drawPolygon);
  goog.events.listen(drawPolygon, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawPolygon, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);


  // Watch the "active" property, and disable the draw interactions
  // when "active" gets set to false.
  $scope.$watch(goog.bind(function() {
    return this.active;
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      this.drawPoint.setActive(false);
      this.drawLine.setActive(false);
      this.drawPolygon.setActive(false);
      this['queryActive'] = true;
    } else {
      this['queryActive'] = false;
    }
  }, this));

  goog.events.listen(appDrawnFeatures, ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEvent} evt
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        goog.events.listen(feature, app.DrawEventType.PROPERTYMODIFYEND,
            this.onFeaturePropertyChange_, undefined, this);
      }, undefined, this);

  goog.events.listen(appDrawnFeatures, ol.CollectionEventType.REMOVE,
      /**
       * @param {ol.CollectionEvent} evt
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        if (feature.get('__source__') == 'mymaps') {
          if (this.appMymaps_.isEditable()) {
            this.appMymaps_.deleteFeature(feature);
          }
        } else {
          this.onFeatureDelete_(evt);
        }
        goog.events.unlisten(feature, app.DrawEventType.PROPERTYMODIFYEND,
            this.onFeaturePropertyChange_, undefined, this);
      }, undefined, this);

  var selectInteraction = new ol.interaction.Select({
    features: appSelectedFeatures,
    filter: goog.bind(function(feature, layer) {
      return this.drawnFeatures_.getArray().indexOf(feature) != -1;
    }, this)
  });
  this.map.addInteraction(selectInteraction);

  /**
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteraction_ = selectInteraction;

  appFeaturePopup.init(this.map, selectInteraction.getFeatures());

  goog.events.listen(appSelectedFeatures, ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEvent} evt
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', true);
      });

  goog.events.listen(appSelectedFeatures, ol.CollectionEventType.REMOVE,
      /**
       * @param {ol.CollectionEvent} evt
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', false);
      });

  goog.events.listen(selectInteraction,
      ol.interaction.SelectEventType.SELECT,
      /**
       * @param {ol.interaction.SelectEvent} evt
       */
      function(evt) {
        if (evt.selected.length > 0) {
          var feature = evt.selected[0];

          if (goog.isDefAndNotNull(feature.get('__source__')) &&
              feature.get('__source__') == 'mymaps') {
            if (this.appMymaps_.isEditable()) {
              this.modifyInteraction_.setActive(true);
            } else {
              this.modifyInteraction_.setActive(false);
            }
          } else {
            this.modifyInteraction_.setActive(true);
          }
          this.featurePopup_.show(feature, evt.mapBrowserEvent.coordinate);
        } else {
          this.featurePopup_.hide();
        }
        $scope.$apply();
      }, true, this);

  var modifyInteraction = new ol.interaction.Modify({
    features: appSelectedFeatures
  });
  this.map.addInteraction(modifyInteraction);
  goog.events.listen(modifyInteraction, ol.ModifyEventType.MODIFYEND,
      this.onFeaturePropertyChange_, false, this);

  /**
   * @type {ol.interaction.Modify}
   * @private
   */
  this.modifyInteraction_ = modifyInteraction;

  var drawOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();
  drawOverlay.setFeatures(appDrawnFeatures);

  this.drawFeaturesInUrl_();
};


/**
 * Decode the features encoded in the URL and add them to the collection
 * of drawn features.
 * @private
 */
app.DrawController.prototype.drawFeaturesInUrl_ = function() {
  var encodedFeatures = this.ngeoLocation_.getParam('features');
  if (goog.isDef(encodedFeatures)) {
    var features = this.fhFormat_.readFeatures(encodedFeatures);
    goog.asserts.assert(!goog.isNull(features));
    for (var i = 0; i < features.length; ++i) {
      var feature = features[i];
      var opacity = /** @type {string} */ (feature.get('opacity'));
      feature.set('opacity', +opacity);
      var stroke = /** @type {string} */ (feature.get('stroke'));
      feature.set('stroke', +stroke);
      var size = /** @type {string} */ (feature.get('size'));
      feature.set('size', +size);
      var angle = /** @type {string} */ (feature.get('angle'));
      feature.set('angle', +angle);
      var isLabel = /** @type {string} */ (feature.get('is_label'));
      feature.set('is_label', isLabel === 'true');
      feature.set('__editable__', true);
      feature.set('__source__', 'url');
      feature.setStyle(this.featureStyleFunction_);
    }
    this.drawnFeatures_.extend(features);
  }
};


/**
 * @param {ol.ObjectEvent} event
 * @private
 */
app.DrawController.prototype.onChangeActive_ = function(event) {
  var active = this.drawPoint.getActive() || this.drawLine.getActive() ||
      this.drawPolygon.getActive();
  this.selectInteraction_.setActive(!active);
};


/**
 * @param {ol.interaction.DrawEvent} event
 * @private
 */
app.DrawController.prototype.onDrawEnd_ = function(event) {
  var feature = event.feature;
  feature.set('name', 'element ' + (++this.featureSeq_));
  feature.set('__editable__', true);
  feature.set('color', '#ed1c24');
  feature.set('opacity', 0.2);
  feature.set('stroke', 1.25);
  feature.set('size', 10);
  feature.set('angle', 0);
  feature.set('is_label', false);
  feature.set('linestyle', 'plain');
  feature.set('symbol_id', 'circle');
  feature.setStyle(this.featureStyleFunction_);

  if (this.appMymaps_.isEditable()) {
    feature.set('__source__', 'mymaps');
    this.saveFeatureInMymaps_(feature);
  }

  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(goog.bind(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }, this), 0);


  // Encode the features in the URL.
  // warning: the drawn feature is not yet in the collection when the
  // "drawend" event is triggered. So we create a new array and append
  // the drawn feature to that array.
  var features = this.drawnFeatures_.getArray().slice();
  features.push(feature);
  this.encodeFeaturesInUrl_(features);

  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(feature);
  this.featurePopup_.show(feature);
};


/**
 * @param {goog.events.Event} event Event.
 * @private
 */
app.DrawController.prototype.onFeaturePropertyChange_ = function(event) {
  this.scope_.$applyAsync(goog.bind(function() {
    var features = this.drawnFeatures_.getArray();
    if (this.appMymaps_.isEditable()) {
      var feature = event.feature;
      if (!goog.isDef(feature) && goog.isDef(event.features)) {
        feature = event.features.getArray()[0];
      }
      if (!goog.isDefAndNotNull(feature)) {
        feature = event.target;
      }
      feature.set('__source__', 'mymaps');
      this.saveFeatureInMymaps_(feature);
    }
    this.encodeFeaturesInUrl_(features);
  }, this));
};


/**
 * @param {goog.events.Event} event Event.
 * @private
 */
app.DrawController.prototype.onFeatureDelete_ = function(event) {
  this.scope_.$applyAsync(goog.bind(function() {
    var features = this.drawnFeatures_.getArray();
    this.encodeFeaturesInUrl_(features);
  }, this));
};


/**
 * @param {ol.Feature} feature Feature to encode in the URL.
 * @private
 */
app.DrawController.prototype.saveFeatureInMymaps_ = function(feature) {
  var currentFeature = feature;
  if (this.appMymaps_.isEditable()) {
    this.appMymaps_.saveFeature(feature, this.map.getView().getProjection())
      .then(goog.bind(function(resp) {
          var featureId = resp['id'];
          currentFeature.set('id', featureId);
        }, this));
  }
};


/**
 * @param {Array.<ol.Feature>} features Features to encode in the URL.
 * @private
 */
app.DrawController.prototype.encodeFeaturesInUrl_ = function(features) {
  var featuresToEncode = features.filter(function(feature) {
    return feature.get('__source__') != 'mymaps';
  });

  if (featuresToEncode.length > 0) {
    this.ngeoLocation_.updateParams({
      'features': this.fhFormat_.writeFeatures(featuresToEncode)
    });
  } else {
    this.ngeoLocation_.deleteParam('features');
  }

};


/**
 * @return {ol.FeatureStyleFunction}
 * @export
 */
app.DrawController.createStyleFunction = function() {

  var styles = [];

  var vertexStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: 6,
      points: 4,
      angle: Math.PI / 4,
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.5)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 1)'
      })
    }),
    geometry: function(feature) {
      var geom = feature.getGeometry();

      if (geom.getType() == ol.geom.GeometryType.POINT) {
        return;
      }

      var coordinates;
      if (geom instanceof ol.geom.LineString) {
        coordinates = feature.getGeometry().getCoordinates();
        return new ol.geom.MultiPoint(coordinates);
      } else if (geom instanceof ol.geom.Polygon) {
        coordinates = feature.getGeometry().getCoordinates()[0];
        return new ol.geom.MultiPoint(coordinates);
      } else {
        return feature.getGeometry();
      }
    }
  });

  var fillStyle = new ol.style.Fill();

  return function(resolution) {

    // clear the styles
    styles.length = 0;

    if (this.get('__editable__') && this.get('__selected__')) {
      styles.push(vertexStyle);
    }

    // goog.asserts.assert(goog.isDef(this.get('__style__'));
    var color = this.get('color') || '#FF0000';
    var rgb = goog.color.hexToRgb(color);
    var opacity = this.get('opacity');
    if (!goog.isDefAndNotNull(opacity)) {
      opacity = 1;
    }
    var fillColor = goog.color.alpha.rgbaToRgbaStyle(rgb[0], rgb[1], rgb[2],
        opacity);
    fillStyle.setColor(fillColor);

    var lineDash;
    if (this.get('linestyle')) {
      switch (this.get('linestyle')) {
        case 'dashed':
          lineDash = [10, 10];
          break;
        case 'dotted':
          lineDash = [1, 6];
          break;
      }
    }

    var stroke;

    if (this.get('stroke') > 0) {
      stroke = new ol.style.Stroke({
        color: color,
        width: this.get('stroke'),
        lineDash: lineDash
      });
    }
    var imageOptions = {
      fill: fillStyle,
      stroke: new ol.style.Stroke({
        color: color,
        width: this.get('size') / 7
      }),
      radius: this.get('size')
    };
    var image = new ol.style.Circle(imageOptions);
    if (this.get('symbol_id') && this.get('symbol_id') != 'circle') {
      goog.object.extend(imageOptions, ({
        points: 4,
        angle: Math.PI / 4,
        rotation: this.get('angle')
      }));
      image = new ol.style.RegularShape(
          /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
    }

    if (this.get('text')) {
      return [new ol.style.Style({
        text: new ol.style.Text(/** @type {olx.style.TextOptions} */ ({
          text: this.get('name'),
          font: this.get('size') + 'px Sans-serif',
          rotation: this.get('angle'),
          fill: new ol.style.Fill({
            color: color
          }),
          stroke: new ol.style.Stroke({
            color: 'white',
            width: 2
          })
        }))
      })];
    } else {
      styles.push(new ol.style.Style({
        image: image,
        fill: fillStyle,
        stroke: stroke
      }));
    }

    return styles;
  };
};

app.module.controller('AppDrawController', app.DrawController);

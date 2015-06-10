goog.provide('app.queryDirective');

goog.require('app.VectorOverlay');
goog.require('app.VectorOverlayMgr');


/**
 * @typedef {{point: Array.<ol.style.Style>, default: Array.<ol.style.Style>}}
 */
app.QueryStyles;


/**
 * @param {string} appQueryTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.queryDirective = function(appQueryTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appQueryMap',
      'infoOpen': '=appQueryOpen',
      'appSelector': '=appQueryAppselector'
    },
    controller: 'AppQueryController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appQueryTemplateUrl
  };
};
app.module.directive('appQuery', app.queryDirective);



/**
 * @constructor
 * @param {angular.$timeout} $timeout
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$http} $http Angular $http service
 * @param {app.VectorOverlayMgr} appVectorOverlayMgr Vector overlay manager.
 * @param {string} appQueryTemplatesPath Path
 *                 to find the intterogation templates.
 * @param {string} getInfoServiceUrl
 * @param {string} getRemoteTemplateServiceUrl
 * @export
 * @ngInject
 */
app.QueryController = function($timeout, $scope, $http,
    appVectorOverlayMgr, appQueryTemplatesPath, getInfoServiceUrl,
    getRemoteTemplateServiceUrl) {

  /**
   * @type {?Object<number, number>}
   * @private
   */
  this.stopPixel_ = null;

  /**
   * @type {?Object<number, number>}
   * @private
   */
  this.startPixel_ = null;


  /**
   * @type {number}
   * @private
   */
  this.pointerDownTime_ = 0;

  /**
   * @type {number}
   * @private
   */
  this.pointerUpTime_ = 0;

  /**
   * @type {string}
   * @private
   */
  this.getInfoServiceUrl_ = getInfoServiceUrl;

  /** @type {Array.<Object>} */
  this['content'] = [];

  /**
   * @type {angular.$http}
   * @private
   */
  this.http_ = $http;

  /**
   * @type {string}
   * @private
   */
  this.templatePath_ = appQueryTemplatesPath;
  /**
   * @type {string}
   * @private
   */
  this.remoteTemplateUrl_ = getRemoteTemplateServiceUrl;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  var defaultFill = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });
  var circleStroke = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  var image = new ol.style.Circle({
    radius: 10,
    fill: defaultFill,
    stroke: circleStroke
  });

  var defaultStyle = [
    new ol.style.Style({
      fill: new ol.style.Fill({
        color: [255, 255, 0, 0.6]
      })
    }),
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'white',
        width: 5
      })
    }),
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 3
      })
    })
  ];

  /** @type {app.QueryStyles} */
  var styles = {
    point: [new ol.style.Style({
      image: image
    })],
    default: defaultStyle
  };

  /**
   * The draw overlay
   * @type {app.VectorOverlay}
   * @private
   */
  this.vectorOverlay_ = appVectorOverlayMgr.getVectorOverlay();

  this.vectorOverlay_.setStyle(
      /**
       * @param {ol.Feature} feature Feature.
       * @param {number} resolution Resolution.
       * @return {Array.<ol.style.Style>} Array of styles.
       */
      function(feature, resolution) {
        var geometryType = feature.getGeometry().getType();
        return geometryType == ol.geom.GeometryType.POINT ||
            geometryType == ol.geom.GeometryType.MULTI_POINT ?
            styles.point : styles.default;
      });

  $scope.$watch(goog.bind(function() {
    return this['appSelector'];
  }, this), goog.bind(function(newVal) {
    if (newVal != 'query') {
      this['content'] = [];
      this.clearFeatures_();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this['infoOpen'];
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal === false) {
      this['appSelector'] = undefined;
      this['content'] = [];
      this.clearFeatures_();
    }
  }, this));

  goog.events.listen(this.map_,
      ol.MapBrowserEvent.EventType.SINGLECLICK, function(evt) {
        if (evt.originalEvent instanceof MouseEvent) {
          this.singleclickEvent_.apply(this, [evt]);
        } else {
          if (this.pointerUpTime_ - this.pointerDownTime_ < 499) {
            var deltaX = Math.abs(this.startPixel_[0] - this.stopPixel_[0]);
            var deltaY = Math.abs(this.startPixel_[1] - this.stopPixel_[1]);
            if (deltaX + deltaY < 6) {
              this.singleclickEvent_.apply(this, [evt]);
              this.startPixel_ = null;
              this.stopPixel_ = null;
            }
          }
        }
      }, false, this);

  goog.events.listen(this.map_,
      ol.MapBrowserEvent.EventType.POINTERDOWN, function(evt) {
        if (!(evt.originalEvent instanceof MouseEvent)) {
          this.pointerDownTime_ = new Date().getTime();
          this.startPixel_ = evt.pixel;
        }
      }, false, this);

  goog.events.listen(this.map_,
      ol.MapBrowserEvent.EventType.POINTERUP, function(evt) {
        if (!(evt.originalEvent instanceof MouseEvent)) {
          this.pointerUpTime_ = new Date().getTime();
          this.stopPixel_ = evt.pixel;
        }
      }, false, this);

  goog.events.listen(this.map_, ol.MapBrowserEvent.EventType.POINTERMOVE,
      function(evt) {
        var pixel = this.map_.getEventPixel(evt.originalEvent);
        var hit = this.map_.forEachLayerAtPixel(pixel, function(layer) {
          if (goog.isDefAndNotNull(layer)) {
            var metadata = layer.get('metadata');
            if (goog.isDefAndNotNull(metadata)) {
              if (goog.isDefAndNotNull(metadata['is_queryable']) &&
                  metadata['is_queryable']) {
                return true;
              }
            }
          }
          return false;
        });
        this.map_.getTargetElement().style.cursor = hit ? 'pointer' : '';
      }, false, this);
};


/**
 * @param {goog.events.Event} evt The map event
 * @private
 */
app.QueryController.prototype.singleclickEvent_ = function(evt) {
  var layers = this.map_.getLayers().getArray();
  var layersList = [];
  var layerLabel = {};
  for (var i = 0; i < layers.length; i++) {
    var metadata = layers[i].get('metadata');
    if (goog.isDefAndNotNull(metadata)) {
      if (metadata['is_queryable'] == 'true') {
        var queryableId = layers[i].get('queryable_id');
        layersList.push(queryableId);
        layerLabel[queryableId] = layers[i].get('label');
      }
    }
  }
  if (layersList.length > 0) {
    var buffer = 10;
    var ll = ol.proj.transform(
        this.map_.getCoordinateFromPixel(
        [evt.pixel[0] - buffer, evt.pixel[1] - buffer]),
        this.map_.getView().getProjection(), 'EPSG:2169');
    var ur = ol.proj.transform(
        this.map_.getCoordinateFromPixel(
        [evt.pixel[0] + buffer, evt.pixel[1] + buffer]),
        this.map_.getView().getProjection(), 'EPSG:2169');
    var box = ll.concat(ur);

    this.http_.get(
        this.getInfoServiceUrl_,
        {params: {
          'layers': layersList.join(),
          'box': box.join()
        }}).then(
        goog.bind(function(resp) {
          goog.array.forEach(resp.data, function(item) {
            item['layerLabel'] = layerLabel[item.layer];
          });
          this['content'] = resp.data;
          this['infoOpen'] = true;
          this['appSelector'] = 'query';
          this.clearFeatures_();
          this.lastHighlightedFeatures_ = [];
          for (var i = 0; i < resp.data.length; i++) {
            this.lastHighlightedFeatures_.push.apply(
                this.lastHighlightedFeatures_,
                resp.data[i].features
            );
          }
          this.highlightFeatures_(this.lastHighlightedFeatures_);
        }, this));
  }
};


/**
 * @private
 */
app.QueryController.prototype.clearFeatures_ = function() {
  this.vectorOverlay_.clear();
};


/**
 * provides the template path according to the fact
 * that the template for the current layer is remote or not
 * @param {{remote_template: boolean, template: string, layer: string}} layer
 * @return {string} the template path.
 * @export
 */
app.QueryController.prototype.getTemplatePath = function(layer) {
  if (layer['remote_template'] === true) {
    return this.remoteTemplateUrl_ + '?layer=' + layer['layer'];
  }
  return this.templatePath_ + '/' + layer['template'];
};


/**
 * @param {Array<string>} features the features to highlight
 * @private
 */
app.QueryController.prototype.highlightFeatures_ = function(features) {
  if (goog.isDefAndNotNull(features)) {
    var encOpt = /** @type {olx.format.ReadOptions} */ ({
      dataProjection: 'EPSG:2169',
      featureProjection: this.map_.getView().getProjection()
    });
    var jsonFeatures = (new ol.format.GeoJSON()).readFeatures({
      'type': 'FeatureCollection',
      'features': features}, encOpt);
    for (var i = 0; i < jsonFeatures.length; ++i) {
      this.vectorOverlay_.addFeature(jsonFeatures[i]);
    }
  }
};
app.module.controller('AppQueryController',
                      app.QueryController);

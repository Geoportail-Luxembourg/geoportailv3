goog.provide('app.QueryController');
goog.provide('app.queryDirective');

goog.require('ngeo.FeatureOverlay');
goog.require('ngeo.FeatureOverlayMgr');


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
      'appSelector': '=appQueryAppselector',
      'queryActive': '=appQueryActive',
      'language': '=appQueryLanguage'
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
 * @param {angular.$sce} $sce Angular $sce service
 * @param {angular.$timeout} $timeout
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$http} $http Angular $http service
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {string} appQueryTemplatesPath Path
 *                 to find the intterogation templates.
 * @param {string} getInfoServiceUrl
 * @param {string} getRemoteTemplateServiceUrl
 * @param {string} downloadmeasurementUrl
 * @param {string} downloadsketchUrl
 * @export
 * @ngInject
 */
app.QueryController = function($sce, $timeout, $scope, $http,
    ngeoFeatureOverlayMgr, appQueryTemplatesPath, getInfoServiceUrl,
    getRemoteTemplateServiceUrl, downloadmeasurementUrl, downloadsketchUrl) {

  /**
   * @type {Array}
   * @private
   */
  this.responses_ = [];

  /**
   * @type {angular.$sce}
   * @private
   */
  this.sce_ = $sce;

  /**
   * @const
   * @type {string}
   * @private
   */
  this.QUERYPANEL_ = 'query';

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
   * @type {string}
   * @private
   */
  this.downloadmeasurementUrl_ = downloadmeasurementUrl;

  /**
   * @type {string}
   * @private
   */
  this.downloadsketchUrl_ = downloadsketchUrl;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {boolean}
   * @private
   */
  this.isQuerying_ = false;

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
        color: '#ffffff',
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
   * @type {ngeo.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  this.featureOverlay_.setStyle(
      /**
       * @param {ol.Feature|ol.render.Feature} feature Feature.
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
    if (newVal != this.QUERYPANEL_) {
      this.clearQueryResult_(newVal);
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this['infoOpen'];
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal === false) {
      this.clearQueryResult_(undefined);
    }
  }, this));

  goog.events.listen(this.map_.getLayers(),
      ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEvent} e Collection event.
       */
      function(e) {
        if (this['appSelector'] == this.QUERYPANEL_) {
          this.clearQueryResult_(undefined);
        }
      }, undefined, this);

  goog.events.listen(this.map_,
      ol.MapBrowserEvent.EventType.SINGLECLICK, function(evt) {
        if (!this['queryActive'] || this.isQuerying_) return;

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
        if (evt.dragging || this.isQuerying_) {
          return;
        }
        if (!this['queryActive']) {
          this.map_.getViewport().style.cursor = '';
        } else {
          var pixel = this.map_.getEventPixel(evt.originalEvent);
          var hit = this.map_.forEachLayerAtPixel(pixel, function(layer) {
            if (goog.isDefAndNotNull(layer)) {
              var metadata = layer.get('metadata');
              if (goog.isDefAndNotNull(metadata)) {
                if (goog.isDefAndNotNull(metadata['is_queryable']) &&
                    metadata['is_queryable'] &&
                    layer.getVisible() && layer.getOpacity() > 0) {
                  return true;
                }
              }
            }
            return false;
          });
          this.map_.getViewport().style.cursor = hit ? 'pointer' : '';
        }
      }, false, this);
};


/**
 * @param {string | undefined} appSelector the current app using the info panel
 * @private
 */
app.QueryController.prototype.clearQueryResult_ = function(appSelector) {
  this['appSelector'] = appSelector;
  this['content'] = [];
  this.clearFeatures_();
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
      if (metadata['is_queryable'] == 'true' &&
          layers[i].getVisible() && layers[i].getOpacity() > 0) {
        var queryableId = layers[i].get('queryable_id');
        layersList.push(queryableId);
        layerLabel[queryableId] = layers[i].get('label');
      }
    }
  }
  if (layersList.length > 0) {
    var bigBuffer = 20;
    var smallBuffer = 1;

    var lb = ol.proj.transform(
        this.map_.getCoordinateFromPixel(
        [evt.pixel[0] - bigBuffer, evt.pixel[1] + bigBuffer]),
        this.map_.getView().getProjection(), 'EPSG:2169');
    var rt = ol.proj.transform(
        this.map_.getCoordinateFromPixel(
        [evt.pixel[0] + bigBuffer, evt.pixel[1] - bigBuffer]),
        this.map_.getView().getProjection(), 'EPSG:2169');
    var big_box = lb.concat(rt);

    lb = ol.proj.transform(
        this.map_.getCoordinateFromPixel(
        [evt.pixel[0] - smallBuffer, evt.pixel[1] + smallBuffer]),
        this.map_.getView().getProjection(), 'EPSG:2169');
    rt = ol.proj.transform(
        this.map_.getCoordinateFromPixel(
        [evt.pixel[0] + smallBuffer, evt.pixel[1] - smallBuffer]),
        this.map_.getView().getProjection(), 'EPSG:2169');
    var small_box = lb.concat(rt);

    this.isQuerying_ = true;
    this.map_.getViewport().style.cursor = 'wait';
    this['content'] = '';
    this.http_.get(
        this.getInfoServiceUrl_,
        {params: {
          'layers': layersList.join(),
          'box1': big_box.join(),
          'box2': small_box.join()
        }}).then(
        goog.bind(function(resp) {
          if (evt.originalEvent.shiftKey) {
            goog.array.forEach(resp.data, function(item) {
              item['layerLabel'] = layerLabel[item.layer];
              var found = false;
              for (var iLayer = 0; iLayer < this.responses_.length; iLayer++) {
                if (this.responses_[iLayer].layer == item.layer) {
                  found = true;
                  var removed = false;
                  for (var iItem = 0; iItem < item.features.length; iItem++) {
                    for (var iFeatures = 0;
                         iFeatures < this.responses_[iLayer].features.length;
                         iFeatures++) {
                      if (this.responses_[iLayer].features[iFeatures]['fid'] ==
                          item.features[iItem]['fid']) {
                        removed = true;
                        this.responses_[iLayer].features.splice(iFeatures, 1);
                        break;
                      }
                    }
                    if (!removed) {
                      this.responses_[iLayer].features =
                          this.responses_[iLayer].features.concat(
                          item.features[iItem]);
                    }
                  }
                  break;
                }
              }
              if (!found) {
                this.responses_.push(item);
              }
            },this);
          }else {
            this.responses_ = resp.data;
            goog.array.forEach(resp.data, function(item) {
              item['layerLabel'] = layerLabel[item.layer];
            });
          }
          this.clearQueryResult_(this.QUERYPANEL_);
          this['content'] = this.responses_;
          if (this.responses_.length > 0) this['infoOpen'] = true;
          else this['infoOpen'] = false;
          this.lastHighlightedFeatures_ = [];
          for (var i = 0; i < this.responses_.length; i++) {
            this.lastHighlightedFeatures_.push.apply(
                this.lastHighlightedFeatures_,
                this.responses_[i].features
            );
          }
          this.highlightFeatures_(this.lastHighlightedFeatures_);
          this.isQuerying_ = false;
          this.map_.getViewport().style.cursor = '';
        }, this),
        goog.bind(function(error) {
          this.clearQueryResult_(this.QUERYPANEL_);
          this['infoOpen'] = false;
          this.map_.getViewport().style.cursor = '';
          this.isQuerying_ = false;
        }, this));
  }
};


/**
 * @private
 */
app.QueryController.prototype.clearFeatures_ = function() {
  this.featureOverlay_.clear();
};


/**
 * has the object at least one attribute
 * @param {Object} feature
 * @return {boolean} true if attribute is present.
 * @export
 */
app.QueryController.prototype.hasAttributes = function(feature) {
  if (feature['attributes'] && Object.keys(feature['attributes']).length > 0) {
    return true;
  }
  return false;
};


/**
 * Has the object at least one attribute.
 * @param {Object} feature
 * @param {string} name The name of the attribute.
 * @return {boolean} true Return if attribute is present.
 * @export
 */
app.QueryController.prototype.hasFeatureAttribute = function(feature, name) {
  if (feature['attributes'] && Object.keys(feature['attributes']).length > 0 &&
      !!feature['attributes'][name]) {
    return true;
  }
  return false;
};


/**
 * has the object at least one attribute
 * @param {Array} features
 * @param {string} attr Attribute to join
 * @param {string} sep the join separator
 * @return {string} the string with joined attributes
 * @export
 */
app.QueryController.prototype.joinAttributes = function(features, attr, sep) {
  return goog.array.map(features, function(feature) {
    return feature.attributes[attr];
  }).join(sep);
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
 * trust an url
 * @param {string} url url to be trusted
 * @return {*} the trusted url.
 * @export
 */
app.QueryController.prototype.getTrustedUrl = function(url) {
  return this.sce_.trustAsResourceUrl(url);
};


/**
 * returns a trusted html content
 * @param {string} content content to be trusted
 * @return {*} the trusted content.
 * @export
 */
app.QueryController.prototype.trustAsHtml = function(content) {
  return this.sce_.trustAsHtml('' + content);
};


/**
 * returns a trusted url according to the current language
 * @param {string} urlFr French url to be trusted
 * @param {string} urlDe German url to be trusted
 * @param {string} urlEn English url to be trusted
 * @param {string} urlLb Luxembourgish url to be trusted
 * @return {*} the trusted url.
 * @export
 */
app.QueryController.prototype.getTrustedUrlByLang = function(urlFr,
    urlDe, urlEn, urlLb) {
  if (this['language'] == 'fr') {
    return this.sce_.trustAsResourceUrl(urlFr);
  } else if (this['language'] == 'de') {
    return this.sce_.trustAsResourceUrl(urlDe);
  } else if (this['language'] == 'en') {
    return this.sce_.trustAsResourceUrl(urlEn);
  } else if (this['language'] == 'lb') {
    return this.sce_.trustAsResourceUrl(urlLb);
  }
  return this.sce_.trustAsResourceUrl(urlFr);
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
      this.featureOverlay_.addFeature(jsonFeatures[i]);
    }
  }
};


/**
 * @return {string} get the URL.
 * @export
 */
app.QueryController.prototype.getDownloadMeasurementUrl = function() {
  return this.downloadmeasurementUrl_;
};


/**
 * @return {string} get the URL.
 * @export
 */
app.QueryController.prototype.getDownloadsketchUrl = function() {
  return this.downloadsketchUrl_;
};

app.module.controller('AppQueryController',
                      app.QueryController);

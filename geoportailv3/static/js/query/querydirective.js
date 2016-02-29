goog.provide('app.QueryController');
goog.provide('app.queryDirective');

goog.require('app.profileDirective');
goog.require('ngeo');
goog.require('ngeo.FeatureOverlay');
goog.require('ngeo.FeatureOverlayMgr');


/**
 * @typedef {{point: Array.<ol.style.Style>, default: Array.<ol.style.Style>}}
 */
app.QueryStyles;


/**
 * @typedef {{active: boolean}}
 */
app.ShowProfile;


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
      'language': '=appQueryLanguage',
      'hiddenContent': '=appQueryHiddenInfo'
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
 * @param {app.GetProfile} appGetProfile
 * @param {app.StateManager} appStateManager
 * @param {string} appQueryTemplatesPath Path
 *                 to find the intterogation templates.
 * @param {string} getInfoServiceUrl
 * @param {string} getRemoteTemplateServiceUrl
 * @param {string} downloadmeasurementUrl
 * @param {string} downloadsketchUrl
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {app.Themes} appThemes
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode
 * @param {Document} $document Document.
 * @export
 * @ngInject
 */
app.QueryController = function($sce, $timeout, $scope, $http,
    ngeoFeatureOverlayMgr, appGetProfile, appStateManager,
    appQueryTemplatesPath, getInfoServiceUrl, getRemoteTemplateServiceUrl,
    downloadmeasurementUrl, downloadsketchUrl, gettextCatalog, appThemes,
    appGetLayerForCatalogNode, $document) {

  /**
   * @private
   * @type {Document}
   */
  this.$document_ = $document;

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.translate_ = gettextCatalog;

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

  /** @type {Array.<Object>}
   * @export
   */
  this.content = [];

  /**
   * @type {angular.$http}
   * @private
   */
  this.http_ = $http;

  /**
   * @type {app.GetProfile}
   * @private
   */
  this.getProfile_ = appGetProfile;
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

  ol.events.listen(this.map_.getLayers(),
      ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEvent} e Collection event.
       */
      function(e) {
        if (this['appSelector'] == this.QUERYPANEL_) {
          this.clearQueryResult_(undefined);
        }
      }, this);

  ol.events.listen(this.map_,
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
      }, this);

  ol.events.listen(this.map_,
      ol.MapBrowserEvent.EventType.POINTERDOWN, function(evt) {
        if (!(evt.originalEvent instanceof MouseEvent)) {
          this.pointerDownTime_ = new Date().getTime();
          this.startPixel_ = evt.pixel;
        }
      }, this);

  ol.events.listen(this.map_,
      ol.MapBrowserEvent.EventType.POINTERUP, function(evt) {
        if (!(evt.originalEvent instanceof MouseEvent)) {
          this.pointerUpTime_ = new Date().getTime();
          this.stopPixel_ = evt.pixel;
        }
      }, this);

  ol.events.listen(this.map_, ol.MapBrowserEvent.EventType.POINTERMOVE,
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
      }, this);
  // Load info window if fid has a valid value
  var fid = appStateManager.getInitialValue('fid');
  if (this.isFIDValid_(fid)) {
    this.getFeatureInfoById_(fid);
  }
};


/**
 * @param {Object} feature
 * @return {{id: string, geom: ol.geom.MultiLineString}}
 * @private
 */
app.QueryController.prototype.filterValidProfileFeatures_ = function(feature) {
  var validGeomArray = /** @type {Array} */ ([]);
  var encOpt = /** @type {olx.format.ReadOptions} */ ({
    dataProjection: 'EPSG:2169',
    featureProjection: this.map_.getView().getProjection()
  });
  var activeFeature = /** @type {ol.Feature} */
      ((new ol.format.GeoJSON()).readFeature(feature, encOpt));
  switch (activeFeature.getGeometry().getType()) {
    case ol.geom.GeometryType.GEOMETRY_COLLECTION:
      var geomCollection = /** @type {ol.geom.GeometryCollection} */
          (activeFeature.getGeometry());
      goog.array.forEach(geomCollection.getGeometriesArray(),
          function(geometry) {
            if (geometry.getType() === ol.geom.GeometryType.LINE_STRING) {
              var linestringGeom = /** @type {ol.geom.LineString} */ (geometry);
              validGeomArray.push(linestringGeom.getCoordinates());
            }
          });
      break;
    case ol.geom.GeometryType.MULTI_LINE_STRING:
      var geomMultiLineString = /** @type {ol.geom.MultiLineString} */
          (activeFeature.getGeometry());
      validGeomArray = geomMultiLineString.getCoordinates();
      break;
    case ol.geom.GeometryType.LINE_STRING:
      var geomLineString = /** @type {ol.geom.LineString} */
          (activeFeature.getGeometry());
      validGeomArray.push(geomLineString.getCoordinates());
      break;
  }
  var id = /** {string} */ (feature['fid']);
  return {id: id, geom: new ol.geom.MultiLineString(validGeomArray)};
};


/**
 * @param {string | undefined} appSelector the current app using the info panel
 * @private
 */
app.QueryController.prototype.clearQueryResult_ = function(appSelector) {
  this['appSelector'] = appSelector;
  this.content = [];
  this.clearFeatures_();
};


/**
 * @param {Array} element
 * @return {Array} array
 * @private
 */
app.QueryController.getAllChildren_ = function(element) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      goog.array.extend(array, app.QueryController.getAllChildren_(
          element[i].children)
      );
    } else {
      element[i].id = element[i].id;
      array.push(element[i]);
    }
  }
  return array;
};


/**
 * @param {string|undefined} fid The feature Id.
 * @private
 */
app.QueryController.prototype.getFeatureInfoById_ = function(fid) {
  var splittedFid = fid.split('_');
  var layersList = [splittedFid[0]];
  var layerLabel = {};
  var flatCatalogue = [];

  this.appThemes_.getThemesObject().then(
      goog.bind(function(themes) {
        for (var i = 0; i < themes.length; i++) {
          var theme = themes[i];
          goog.array.extend(flatCatalogue,
              app.QueryController.getAllChildren_(theme.children)
          );
        }
        var node = goog.array.find(flatCatalogue, function(catItem) {
          return catItem.id == splittedFid[0];
        });
        if (goog.isDefAndNotNull(node)) {
          var layer = this.getLayerFunc_(node);
          this.map_.addLayer(layer);
        }

        if (layersList.length > 0) {
          this.isQuerying_ = true;
          this.map_.getViewport().style.cursor = 'wait';
          this.content = [];
          this.http_.get(
              this.getInfoServiceUrl_,
              {params: {
                'fid': fid
              }}).then(
              goog.bind(function(resp) {
                var env = this.findBootstrapEnvironment_();
                var showInfo = false;
                if (env !== 'xs') {
                  showInfo = true;
                  this['hiddenContent'] = false;
                } else {
                  this['hiddenContent'] = true;
                }
                this.showInfo_(false, resp, layerLabel, showInfo, true);
              }, this),
              goog.bind(function(error) {
                this.clearQueryResult_(this.QUERYPANEL_);
                this['infoOpen'] = false;
                this.map_.getViewport().style.cursor = '';
                this.isQuerying_ = false;
              }, this));
        }
      }, this));
};


/**
 * @param {ol.events.Event} evt The map event
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
    this.content = [];
    this.http_.get(
        this.getInfoServiceUrl_,
        {params: {
          'layers': layersList.join(),
          'box1': big_box.join(),
          'box2': small_box.join()
        }}).then(
        goog.bind(function(resp) {
          this.showInfo_(evt.originalEvent.shiftKey, resp,
              layerLabel, true, false);
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
 * @param {boolean} shiftKey Is shift key pressed.
 * @param {Object} resp The response from webservice.
 * @param {Object} layerLabel The layerLabel object.
 * @param {boolean} openInfoPanel True if info panel should be opened.
 * @param {boolean} fit True if the map is centered on the object.
 * @private
 */
app.QueryController.prototype.showInfo_ = function(shiftKey, resp, layerLabel,
    openInfoPanel, fit) {
  if (shiftKey) {
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
    goog.array.forEach(this.responses_, function(item) {
      item['layerLabel'] = layerLabel[item.layer];
    }, this);
  }
  goog.array.forEach(this.responses_, function(item) {
    if (item['template'] === 'mymaps.html') {
      goog.array.forEach(item.features, function(feature) {
        var validGeom = this.filterValidProfileFeatures_(feature);
        if (validGeom.geom.getLineStrings().length > 0) {
          feature['attributes']['showProfile'] =
              /** @type {app.ShowProfile} */ ({active: true});
          this.getProfile_(validGeom.geom, validGeom.id)
        .then(goog.bind(function(profile) {
                goog.array.forEach(this.responses_, function(item) {
                  if (item['template'] === 'mymaps.html') {
                    goog.array.forEach(item['features'],
                        function(feature) {
                          if (feature['fid'] === profile[0]['id']) {
                            feature['attributes']['showProfile'] =
                                /** @type {app.ShowProfile} */
                                ({active: true});
                            feature['attributes']['profile'] = profile;
                          }
                        }, this);
                  }
                }, this);
              }, this));
        }
      }, this);
    }
  }, this);
  this.clearQueryResult_(this.QUERYPANEL_);
  this.content = this.responses_;
  if (this.responses_.length > 0) this['infoOpen'] = openInfoPanel;
  else this['infoOpen'] = false;
  this.lastHighlightedFeatures_ = [];
  for (var i = 0; i < this.responses_.length; i++) {
    this.lastHighlightedFeatures_.push.apply(
        this.lastHighlightedFeatures_,
        this.responses_[i].features
    );
  }
  this.highlightFeatures_(this.lastHighlightedFeatures_, fit);
  this.isQuerying_ = false;
  this.map_.getViewport().style.cursor = '';
};


/**
 * @private
 */
app.QueryController.prototype.clearFeatures_ = function() {
  this.featureOverlay_.clear();
};


/**
 * Has the object at least one attribute.
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
 * Has the object a valid geoportailv3 featureId.
 * @param {Object} feature
 * @return {boolean} true if fid is valid.
 * @export
 */
app.QueryController.prototype.hasValidFID = function(feature) {
  if (this.isFIDValid_(feature['fid'])) {
    return true;
  }
  return false;
};


/**
 * Has the fid a valid geoportail v3 syntax.
 * @param {string|undefined} fid
 * @return {boolean} True if fid is valid.
 * @private
 */
app.QueryController.prototype.isFIDValid_ = function(fid) {
  if (!!fid && fid.split('_').length === 2) {
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
 * @param {Array<string>} features The features to highlight.
 * @param {boolean} fit True to fit to the features.
 * @private
 */
app.QueryController.prototype.highlightFeatures_ = function(features, fit) {
  if (goog.isDefAndNotNull(features)) {
    var encOpt = /** @type {olx.format.ReadOptions} */ ({
      dataProjection: 'EPSG:2169',
      featureProjection: this.map_.getView().getProjection()
    });
    var jsonFeatures = (new ol.format.GeoJSON()).readFeatures({
      'type': 'FeatureCollection',
      'features': features}, encOpt);

    if (jsonFeatures.length > 0) {
      var extent = jsonFeatures[0].getGeometry().getExtent();
      for (var i = 0; i < jsonFeatures.length; ++i) {
        extent = ol.extent.extend(extent,
            jsonFeatures[i].getGeometry().getExtent());
        this.featureOverlay_.addFeature(jsonFeatures[i]);
      }
      if (fit) {
        var mapSize = /** @type {ol.Size} */ (this.map_.getSize());
        this.map_.getView().fit(extent, mapSize,
            /** @type {olx.view.FitOptions} */ ({maxZoom: 17}));
      }
    }
  }
};


/**
 * @return {string} Get the URL.
 * @export
 */
app.QueryController.prototype.getDownloadMeasurementUrl = function() {
  return this.downloadmeasurementUrl_;
};


/**
 * @return {string} Get the URL.
 * @export
 */
app.QueryController.prototype.getDownloadsketchUrl = function() {
  return this.downloadsketchUrl_;
};


/**
 * @param {Object} attributes The  attributes to sort.
 * @return {Array<Object>} The ordered attributes.
 * @export
 */
app.QueryController.prototype.translateKeys =
    function(attributes) {
  var results = [];

  angular.forEach(attributes, function(value, key) {
    results.push({'key': this.translate_.getString('f_' + key),
      'value': value});
  }, this);


  return results;
};


/**
 * @return {string} The current device env.
 * @private
 */
app.QueryController.prototype.findBootstrapEnvironment_ =
    function() {
  var envs = ['xs', 'sm', 'md', 'lg'];

  var el = $('<div>');
  angular.element(this.$document_[0].body).append(el);

  for (var i = envs.length - 1; i >= 0; i--) {
    var env = envs[i];
    el.addClass('hidden-' + env);
    if (el.is(':hidden')) {
      el.remove();
      return env;
    }
  }
  return envs[0];
};

app.module.controller('AppQueryController',
                      app.QueryController);

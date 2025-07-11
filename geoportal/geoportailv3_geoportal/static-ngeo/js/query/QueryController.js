/**
 * @module app.query.QueryController
 */
import appModule from '../module.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';
import appEventsThemesEventType from '../events/ThemesEventType.js';
import {listen} from 'ol/events.js';
import {extend as arrayExtend} from 'ol/array.js';
import {extend as extentExtend} from 'ol/extent.js';
import olFeature from 'ol/Feature.js';
import olFormatGeoJSON from 'ol/format/GeoJSON.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomMultiLineString from 'ol/geom/MultiLineString.js';
import olLayerVector from 'ol/layer/Vector.js';
import {transform} from 'ol/proj.js';
import olSourceVector from 'ol/source/Vector.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleStyle from 'ol/style/Style.js';
import { useProfileInfosv3Store, storeToRefs, urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";

/**
 * @constructor
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {angular.$timeout} $timeout The timeout service.
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$http} $http Angular $http service.
 * @param {app.GetProfile} appGetProfile The profile service.
 * @param {string} appQueryTemplatesPath Path
 *                 to find the intterogation templates.
 * @param {string} getInfoServiceUrl The infoservice url.
 * @param {string} getRemoteTemplateServiceUrl The remote template service.
 * @param {string} downloadmeasurementUrl The url to download measurements.
 * @param {string} downloadsketchUrl The url to download sketches.
 * @param {string} downloadPdfUrl The url to download pdf.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {app.Themes} appThemes The themes service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode Tje layer
 * catalog service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {string} mymapsImageUrl URL to "mymaps" Feature service.
 * @param {app.Export} appExport The export service.
 * @param {app.Activetool} appActivetool The activetool service.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {string} appAuthtktCookieName The authentication cookie name.
 * @param {app.Notify} appNotify Notify service.
 * @param {string} downloadresourceUrl The url to download a resource.
 * @param {string} qrServiceUrl The qr service url.
 * @param {string} previewMesurementUrl The preview service url.
 * @param {app.LotChasse} appLotChasse The selected lot de chasse.
 * @export
 * @ngInject
 */
const exports = function($sce, $timeout, $scope, $http,
    appGetProfile,
    appQueryTemplatesPath, getInfoServiceUrl, getRemoteTemplateServiceUrl,
    downloadmeasurementUrl, downloadsketchUrl, downloadPdfUrl, gettextCatalog,
    appThemes, appGetLayerForCatalogNode, appGetDevice, mymapsImageUrl,
    appExport, appActivetool, appSelectedFeatures, appDrawnFeatures,
    appAuthtktCookieName, appNotify, downloadresourceUrl, qrServiceUrl,
    previewMesurementUrl, appLotChasse) {


  this.timeout_ = $timeout;

  /**
   * @type {Array<string>}
   * @private
   */
  this.curThemesName = [];

  /**
   * @type {string}
   * @private
   */
  this.downloadPdfUrl_ = downloadPdfUrl;

  /**
   * @type {app.LotChasse}
   * @private
   */
  this.appLotChasse_ = appLotChasse;

  /**
   * @type {boolean}
   * @export
   */
  this.isDownloadable = false;

  /**
   * @type {string}
   * @export
   */
  this.previewDescription = '';

  /**
   * @type {string}
   * @export
   */
  this.previewParcelId = '';

  /**
   * @type {string}
   * @export
   */
  this.previewDocumentId = '';

  /**
   * @type {string}
   * @export
   */
  this.previewTownCode = '';

  /**
   * @type {string}
   * @export
   */
  this.previewFilename = '';

  /**
   * @type {boolean}
   * @export
   */
  this.preview = false;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {string}
   * @private
   */
  this.appAuthtktCookieName_ = appAuthtktCookieName;

  /**
   * @type {app.draw.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {app.Activetool}
   * @private
   */
  this.appActivetool_ = appActivetool;

  /**
   * @type {app.Export}
   * @private
   */
  this.appExport_ = appExport;

  /**
   * @type {string}
   * @private
   */
  this.mymapsImageUrl_ = mymapsImageUrl;

  /**
   * @private
   * @type {app.GetDevice}
   */
  this.appGetDevice_ = appGetDevice;

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
   * @export
   */
  this.proxyresourceUrl = downloadresourceUrl;

  /**
   * @type {string}
   * @export
   */
  this.qrServiceUrl = qrServiceUrl;

  /**
   * @type {string}
   * @export
   */
  this.previewMesurementUrl = previewMesurementUrl;

  /**
   * @type {string}
   * @private
   */
  this.downloadsketchUrl_ = downloadsketchUrl;

  /**
   * @type {boolean}
   * @private
   */
  this.isLongPress_ = false;

  /**
   * @type {angular.$q.Promise|undefined}
   */
  this.holdPromise;

  /**
   * @type {boolean}
   * @private
   */
  this.isQuerying_ = false;

  /**
   * The features layer.
   * @type {ol.layer.Vector}
   * @private
   */
  this.featureLayer_ = new olLayerVector({
    source: new olSourceVector(),
    zIndex: 1000,
    'altitudeMode': 'clampToGround'
  });
  var defaultFill = new olStyleFill({
    color: [255, 255, 0, 0.6]
  });
  var circleStroke = new olStyleStroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  var image = new olStyleCircle({
    radius: 10,
    fill: defaultFill,
    stroke: circleStroke
  });

  this.featureLayer_.setStyle(
      /**
       * @param {ol.Feature|ol.render.Feature} feature Feature.
       * @param {number} resolution Resolution.
       * @return {Array.<ol.style.Style>} Array of styles.
       */
      function(feature, resolution) {
        var lineColor = /** @type {string} */(feature.get('color') || '#ffcc33');
        var lineWidth = /** @type {number} */ (feature.get('width') || 3);
        var defaultStyle = [
          new olStyleStyle({
            fill: new olStyleFill({
              color: [255, 255, 0, 0.6]
            })
          }),
          new olStyleStyle({
            stroke: new olStyleStroke({
              color: '#ffffff',
              width: 5
            })
          }),
          new olStyleStyle({
            stroke: new olStyleStroke({
              color: lineColor,
              width: lineWidth
            })
          })
        ];

        var geometryType = feature.getGeometry().getType();
        return geometryType == olGeomGeometryType.POINT ||
            geometryType == olGeomGeometryType.MULTI_POINT ?
            [new olStyleStyle({image: image})] : defaultStyle;
      });

  $scope.$watch(function() {
    return this['appSelector'];
  }.bind(this), function(newVal) {
    if (newVal != this.QUERYPANEL_) {
      this.clearQueryResult_(newVal);
    }
  }.bind(this));

  $scope.$watch(function() {
    return this['infoOpen'];
  }.bind(this), function(newVal, oldVal) {
    if (newVal === false) {
      this.clearQueryResult_(undefined);
    }
  }.bind(this));

  listen(appThemes, appEventsThemesEventType.LOAD,
      /**
       * @param {ol.events.Event} evt Event.
       */
      (function(evt) {
        this.curThemesName = [];
        this.appThemes_.getThemesPromise().then((root) => {
          root.themes.forEach(function(theme) {
            this.curThemesName.push(theme.name);
          }, this);
        });
      }), this);
};

exports.prototype.$onInit = function() {
  this.map_ = this['map'];
  this.map_.addLayer(this.featureLayer_);

  this.map_.getViewport()
  .addEventListener('contextmenu', function(event) {
    event.preventDefault(); // disable right-click menu on browsers
    this.timeout_.cancel(this.holdPromise);
    this.isLongPress_ = true;
  }.bind(this));

  listen(this.map_, 'pointerdown', function(evt) {
    this.isLongPress_ = false;
    this.startPixel_ = evt.pixel;
    this.pointerDownTime_ = new Date().getTime();

    this.timeout_.cancel(this.holdPromise);
  }, this);

  listen(this.map_, 'pointerup', function(evt) {
    // skip click handler on ol controls since they are handled directly in V4
    const target = evt.originalEvent.target;
    if (target && typeof target.closest === 'function' && target.closest('.ol-control')) {
      return;
    }
    this.timeout_.cancel(this.holdPromise);
    var tempTime = new Date().getTime();
    if ((tempTime - this.pointerUpTime_) <= 499) {
      return;
    }
    this.pointerUpTime_ = tempTime;
    this.stopPixel_ = evt.pixel;
    if (!this.isLongPress_ &&
        !(evt.originalEvent instanceof MouseEvent)) {
      if (this.pointerUpTime_ - this.pointerDownTime_ > 499) {
        this.isLongPress_ = true;
      }
    }
    if (this.isLongPress_ || evt.originalEvent.which === 3) {
      this.isLongPress_ = false;
      return;
    }
    if (this['routingOpen'] ||
        this['lidarOpen'] ||
        this.drawnFeatures_.modifyInteraction.getActive() ||
        this.drawnFeatures_.modifyCircleInteraction.getActive() ||
        this.appActivetool_.isActive() || this.isQuerying_) {
      return;
    }
    this.holdPromise = this.timeout_(function() {
      var found = false;
      var isQueryMymaps = (this['layersOpen'] || this['mymapsOpen']) &&
          this.drawnFeatures_.getCollection().getLength() > 0;
      if (isQueryMymaps) {
        let editing = false;
        this.selectedFeatures_.getArray().forEach(function(feature) {
          if (feature.get('__editable__')) {
            editing = true;
          }
        });
        if (!editing) {
          this.selectedFeatures_.clear();
          var result = this.selectMymapsFeature_(evt.pixel);
          if (result) {
            found = true;
          }
        }
      }
      if (!found) {
        var deltaX = Math.abs(this.startPixel_[0] - this.stopPixel_[0]);
        var deltaY = Math.abs(this.startPixel_[1] - this.stopPixel_[1]);
        if (deltaX + deltaY < 6) {
          this.singleclickEvent_.apply(this, [evt, !isQueryMymaps]);
          this.startPixel_ = null;
          this.stopPixel_ = null;
        }
      }
    }.bind(this), 500, false);
  }, this);

  listen(this.map_, 'pointermove', function(evt) {
    if (evt.dragging || this.isQuerying_) {
      return;
    }
    if (this.appActivetool_.isActive()) {
      this.map_.getViewport().style.cursor = '';
    } else {
      var pixel = this.map_.getEventPixel(evt.originalEvent);
      var hit = false;
      try {
        hit = this.map_.forEachLayerAtPixel(pixel, function(layer) {
          if (layer !== undefined && layer !== null) {
            var metadata = layer.get('metadata');
            if (metadata !== undefined && metadata !== null) {
              if (metadata['is_queryable'] && layer.getVisible() && layer.getOpacity() > 0) {
                return true;
              }
            }
          }
          return false;
        }, this, function(layer) {
          if (!layer.getSource()) {
            return false;
          }
          return true;
        });
      } catch (error) {
        hit = false;
      }
      this.map_.getViewport().style.cursor = hit ? 'pointer' : '';
    }
  }, this);

  var fid = urlStorage.getItem('fid');
  if (this.isFIDValid_(fid)) {
    this.getFeatureInfoById_(fid);
  }
  urlStorage.removeItem('fid');
};


/**
 * @param {Array<number>} pixel The pixel.
 * @return {boolean} True if something is selected.
 * @private
 */
exports.prototype.selectMymapsFeature_ = function(pixel) {
  var selected = [];
  var opt = {
    hitTolerance: 5
  };
  var ol3dm = this.map_.get('ol3dm');
  if (ol3dm.is3dEnabled()) {
    var picked = ol3dm.getCesiumScene().drillPick(
      new Cesium.Cartesian2(pixel[0], pixel[1])
    );
    picked.forEach(function(pick) {
      if (pick && pick.primitive.olFeature) {
        selected.push(pick.primitive.olFeature);
      }
    });
  } else {
    this.map_.forEachFeatureAtPixel(pixel, function(feature, layer) {
      if (this.drawnFeatures_.getArray().indexOf(feature) != -1)  {
        selected.push(feature);
        return false;
      }
      return true;
    }.bind(this), opt);
  }
  if (selected.length > 0) {
    this.selectedFeatures_.push(selected.pop());
  }

  return this.selectedFeatures_.getLength() !== 0;
};


/**
 * @param {Object} feature The feature.
 * @return {{id: string, geom: ol.geom.MultiLineString}} An object.
 * @private
 */
exports.prototype.filterValidProfileFeatures_ = function(feature) {
  var validGeomArray = /** @type {Array} */ ([]);
  var encOpt = /** @type {olx.format.ReadOptions} */ ({
    dataProjection: 'EPSG:2169',
    featureProjection: this.map_.getView().getProjection()
  });
  var activeFeature = /** @type {ol.Feature} */
      ((new olFormatGeoJSON()).readFeature(feature, encOpt));
  switch (activeFeature.getGeometry().getType()) {
    case olGeomGeometryType.GEOMETRY_COLLECTION:
      var geomCollection = /** @type {ol.geom.GeometryCollection} */
          (activeFeature.getGeometry());
      geomCollection.getGeometriesArray().forEach(
          function(geometry) {
            if (geometry.getType() === olGeomGeometryType.LINE_STRING) {
              var linestringGeom = /** @type {ol.geom.LineString} */ (geometry);
              validGeomArray.push(linestringGeom.getCoordinates());
            }
          });
      break;
    case olGeomGeometryType.MULTI_LINE_STRING:
      var geomMultiLineString = /** @type {ol.geom.MultiLineString} */
          (activeFeature.getGeometry());
      validGeomArray = geomMultiLineString.getCoordinates();
      break;
    case olGeomGeometryType.LINE_STRING:
      var geomLineString = /** @type {ol.geom.LineString} */
          (activeFeature.getGeometry());
      validGeomArray.push(geomLineString.getCoordinates());
      break;
    default:
      break;
  }
  var id = /** {string} */ (feature['fid']);
  return {id: id, geom: new olGeomMultiLineString(validGeomArray)};
};


/**
 * @param {string | undefined} appSelector the current app using the info panel
 * @private
 */
exports.prototype.clearQueryResult_ = function(appSelector) {
  this['appSelector'] = appSelector;
  this.content = [];
  this.clearFeatures_();
};


/**
 * @param {Array} element The element.
 * @return {Array} array The children.
 * @private
 */
exports.getAllChildren_ = function(element) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      arrayExtend(array, exports.getAllChildren_(
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
 * @param {string|undefined} fid The comma separated list of feature id.
 * @private
 */
exports.prototype.getFeatureInfoById_ = function(fid) {
  var fids = fid.split(',');
  fids.forEach(function(curFid) {
    var splittedFid = curFid.split('_');
    var layersList = [splittedFid[0]];
    var layerLabel = {};

    this.appThemes_.getFlatCatalog().then(
        function(flatCatalogue) {

          if (layersList.length > 0) {
            this.isQuerying_ = true;
            this.map_.getViewport().style.cursor = 'wait';
            this.content = [];
            this.http_.get(
                this.getInfoServiceUrl_,
              {params: {
                'fid': curFid
              }}).then(
                function(resp) {
                  this['appSelector'] = this.QUERYPANEL_;
                  var showInfo = false;
                  if (!this.appGetDevice_.testEnv('xs')) {
                    showInfo = true;
                    this['hiddenContent'] = false;
                  } else {
                    this['hiddenContent'] = true;
                  }
                  var node = flatCatalogue.find(function(catItem) {
                    return catItem.id == splittedFid[0];
                  });
                  if (node !== undefined && node !== null) {
                    var layer = this.getLayerFunc_(node);
                    var foundLayer = this.map.getLayers().getArray().find(function(curLayer) {
                      if (curLayer.get('queryable_id') === layer.get('queryable_id')) {
                        return true;
                      }
                      return false;
                    });
                    var idx = this.map.getLayers().getArray().indexOf(foundLayer);
                    if (idx === -1) {
                      this.map_.addLayer(layer);
                    }
                    layerLabel[splittedFid[0]] = layer.get('label');
                  }
                  this.showInfo_(true, resp, layerLabel, showInfo, true);
                }.bind(this),
                function(error) {
                  this.clearQueryResult_(this.QUERYPANEL_);
                  this['infoOpen'] = false;
                  this.map_.getViewport().style.cursor = '';
                  this.isQuerying_ = false;
                }.bind(this));
          }
        }.bind(this));
  }, this);
};


/**
 * @param {ol.events.Event} evt The map event.
 * @param {boolean} infoMymaps True if mymaps has to be checked.
 * @private
 */
exports.prototype.singleclickEvent_ = function(evt, infoMymaps) {
  var layers = this.map_.getLayers().getArray();
  var layersList = [];
  var layerLabel = {};
  var layersTimeList = [];
  for (var i = layers.length - 1; i >= 0; i--) {
    var metadata = layers[i].get('metadata');
    if (metadata !== undefined && metadata !== null) {
      if (metadata['is_queryable'] && layers[i].getVisible() && layers[i].getOpacity() > 0) {
        var queryableId = layers[i].get('queryable_id');
        layersList.push(queryableId);
        layerLabel[queryableId] = layers[i].get('label');
        //const time = layers[i].get('time');
        //layersTimeList.push(time.minValue+"/"+time.maxValue);
        const time = layers[i].get('current_time');
        if (time !== undefined) {
          layersTimeList.push(time); 
        }
      }
    }
  }
  if (layersList.length > 0) {
    var resolution = this.map_.getView().getResolution();
    var bigBuffer = 20 * resolution;
    var smallBuffer = 1 * resolution;

    var point = transform(evt.coordinate,
        this.map_.getView().getProjection(), 'EPSG:2169');
    var big_box = [
      [point[0] - bigBuffer, point[1] + bigBuffer],
      [point[0] + bigBuffer, point[1] - bigBuffer]
    ];
    var small_box = [
      [point[0] - smallBuffer, point[1] + smallBuffer],
      [point[0] + smallBuffer, point[1] - smallBuffer]
    ];

    this.isQuerying_ = true;
    this.map_.getViewport().style.cursor = 'wait';

    this.content = [];
    var params = {
      'layers': layersList.join(),
      'box1': big_box.join(),
      'box2': small_box.join(),
      'srs': 'EPSG:3857',
      'zoom': this.map_.getView().getZoom(),
      'time': layersTimeList.join()
    };
    if (!this.map_.get('ol3dm').is3dEnabled()) {
      var size = this.map_.getSize();
      var extent = this.map_.getView().calculateExtent(size);
      var bbox = extent.join(',');
      $.extend(params, {
        'BBOX': bbox,
        'WIDTH': size[0],
        'HEIGHT': size[1],
        'X': evt.pixel[0],
        'Y': evt.pixel[1]
      });
    }
    this.http_.get(this.getInfoServiceUrl_, {params: params})
      .then(function(resp) {
        if (resp.data.length > 0) {
          this.showInfo_(evt.originalEvent.shiftKey, resp,
              layerLabel, true, false);
        } else {
          this.isQuerying_ = false;
          this.map_.getViewport().style.cursor = '';
          this.lastHighlightedFeatures_ = [];
          this.highlightFeatures_(this.lastHighlightedFeatures_, false);
          this.clearQueryResult_(this.QUERYPANEL_);
          if (infoMymaps) {
            if (!this.selectMymapsFeature_(evt.pixel)) {
              this['infoOpen'] = false;
            }
          } else {
            this['infoOpen'] = false;
          }
        }
      }.bind(this),
      function(error) {
        this.clearQueryResult_(this.QUERYPANEL_);
        this['infoOpen'] = false;
        this.map_.getViewport().style.cursor = '';
        this.isQuerying_ = false;
      }.bind(this));
  } else {
    if (infoMymaps) {
      this.selectMymapsFeature_(evt.pixel);
    }
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
exports.prototype.showInfo_ = function(shiftKey, resp, layerLabel,
    openInfoPanel, fit) {
  if (shiftKey) {
    resp.data.forEach(function(item) {
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
    }, this);
  } else {
    this.responses_ = resp.data;
    this.responses_.forEach(function(item) {
      item['layerLabel'] = layerLabel[item.layer];
    }, this);
  }

  this.responses_.forEach(function(item) {
    if (item['has_profile']) {
      item.features.forEach(function(feature) {
        var validGeom = this.filterValidProfileFeatures_(feature);
        if (validGeom.geom.getLineStrings().length > 0) {
          feature['attributes']['showProfile'] =
              /** @type {app.query.ShowProfile} */ ({active: true});

          const profileStore = useProfileInfosv3Store();
          const { activePositioning_v3 } = storeToRefs(profileStore);

          this.getProfile_(validGeom.geom, validGeom.id).then(function(profile) {

            feature['attributes']['showProfile'] = /** @type {app.query.ShowProfile} */ ({active: true});

            activePositioning_v3.value = true;
            // v4 Update profile data for v4 component
            profileStore.setProfileData(this['map'], new olFeature(validGeom.geom), profile, validGeom['id'])
          }.bind(this));
        }
      }, this);
    }
  }, this);
  this.clearQueryResult_(this.QUERYPANEL_);
  this.content = this.responses_.filter(function(item, index, arr) {
    if ('features' in item && item.features.length > 0) {
      return true;
    }
    return false;
  }, this);
  if (this.responses_.length > 0) {
    this['infoOpen'] = openInfoPanel;
  } else {
    this['infoOpen'] = false;
  }
  this.lastHighlightedFeatures_ = [];
  for (var i = 0; i < this.responses_.length; i++) {
    this.lastHighlightedFeatures_.push(
      ...this.responses_[i].features
    );
  }
  this.highlightFeatures_(this.lastHighlightedFeatures_, fit);
  this.isQuerying_ = false;
  this.map_.getViewport().style.cursor = '';
};


/**
 * @private
 */
exports.prototype.clearFeatures_ = function() {
  this.featureLayer_.getSource().clear();
};


/**
 * Has the object at least one attribute.
 * @param {Object} feature The feature.
 * @return {boolean} true if attribute is present.
 * @export
 */
exports.prototype.hasAttributes = function(feature) {
  if (feature['attributes'] && Object.keys(feature['attributes']).length > 0) {
    return true;
  }
  return false;
};


/**
 * Has the object a valid geoportailv3 featureId.
 * @param {Object} feature The feature.
 * @return {boolean} true if fid is valid.
 * @export
 */
exports.prototype.hasValidFID = function(feature) {
  if ('fid' in feature && this.isFIDValid_(feature['fid'])) {
    return true;
  }
  return false;
};


/**
 * Has the fid a valid geoportail v3 syntax.
 * @param {string|undefined} fid The comma separated list of feature id.
 * @return {boolean} True if all fids are valid.
 * @private
 */
exports.prototype.isFIDValid_ = function(fid) {
  var valid = true;
  if (fid === undefined || fid === null) {
    return false;
  }
  var fids = fid.split(',');
  fids.forEach(function(curFid) {
    if (!(!!curFid && curFid.split('_').length >= 2)) {
      valid = false;
    }
  }, this);
  return valid;
};


/**
 * Has the object at least one attribute.
 * @param {Object} feature The feature.
 * @param {string} name The name of the attribute.
 * @return {boolean} true Return if attribute is present.
 * @export
 */
exports.prototype.hasFeatureAttribute = function(feature, name) {
  if (feature['attributes'] && Object.keys(feature['attributes']).length > 0 &&
      !!feature['attributes'][name]) {
    return true;
  }
  return false;
};


/**
 * @param {Array} features The feature.
 * @param {string} attr Attribute to join.
 * @param {string} sep The join separator.
 * @return {string} The string with joined attributes.
 * @export
 */
exports.prototype.joinAttributes = function(features, attr, sep) {
  return features.map(function(feature) {
    return feature.attributes[attr];
  }).join(sep);
};


/**
 * provides the template path according to the fact
 * that the template for the current layer is remote or not
 * @param {{remote_template: boolean, template: string, layer: string}} layer
 * The layer.
 * @return {string} the template path.
 * @export
 */
exports.prototype.getTemplatePath = function(layer) {
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
exports.prototype.getTrustedUrl = function(url) {
  return this.sce_.trustAsResourceUrl(url);
};


/**
 * Get a trusted preview url.
 * @return {*} The trusted url.
 * @export
 */
exports.prototype.getPreviewUrl = function() {
  return this.sce_.trustAsResourceUrl(
    this.previewMesurementUrl + '?document_id=' +
    this.previewDocumentId);
};

/**
 * Open the feedback anf tool.
 * @param {string} lot The lot number.
 * @export
 */
exports.prototype.openFeedbackAnf = function(lot) {
  this.appLotChasse_.setLotChasse(lot);
  this['infoOpen'] = false;
  this['feedbackAnfOpen'] = true;
};


/**
 * Format the Date.
 * @param {string} datetime the string representation of datetime.
 * @export
 */
exports.prototype.formatDate = function(datetime) {
  return new Date(Date.parse(datetime)).toLocaleDateString("en-GB");
}

/**
 * Open preview mesurement popup.
 * @param {string} document_id The unique document id.
 * @param {string} description The measurement description.
 * @param {string} numMeasurement The measurement number.
 * @param {string} parcelId The id of the parcel.
 * @param {boolean} isDownloadable True if the current user is authorize to download the originale document.
 * @export
 */
exports.prototype.openPreviewMesurage = function(document_id, description, numMeasurement, parcelId, isDownloadable) {
  this.isDownloadable = isDownloadable;
  this.preview = true;
  this.previewDescription = description.trim() + ' - No ' + numMeasurement;
  this.previewParcelId = parcelId;
  this.previewDocumentId = document_id;
};


/**
 * returns a trusted html content
 * @param {string} content content to be trusted
 * @return {*} the trusted content.
 * @export
 */
exports.prototype.trustAsHtml = function(content) {
  if (typeof content !== 'string') {
    return content;
  }
  return this.sce_.trustAsHtml('' + content);
};


/**
 * returns a trusted url according to the current language
 * If an url is not defined then use french as default.
 * That means, at least french url should be defined.
 * @param {string} urlFr French url to be trusted.
 * @param {string} urlDe German url to be trusted.
 * @param {string} urlEn English url to be trusted.
 * @param {string} urlLb Luxembourgish url to be trusted.
 * @return {*} the trusted url.
 * @export
 */
exports.prototype.getTrustedUrlByLang = function(urlFr,
    urlDe, urlEn, urlLb) {
  if (this['language'] == 'fr') {
    return this.sce_.trustAsResourceUrl(urlFr);
  } else if (this['language'] == 'de') {
    if (urlDe !== null && urlDe !== undefined) {
      return this.sce_.trustAsResourceUrl(urlDe);
    } else {
      return this.sce_.trustAsResourceUrl(urlFr);
    }
  } else if (this['language'] == 'en') {
    if (urlEn !== null && urlEn !== undefined) {
      return this.sce_.trustAsResourceUrl(urlEn);
    } else {
      return this.sce_.trustAsResourceUrl(urlFr);
    }
  } else if (this['language'] == 'lb') {
    if (urlLb !== null && urlLb !== undefined) {
      return this.sce_.trustAsResourceUrl(urlLb);
    } else {
      return this.sce_.trustAsResourceUrl(urlFr);
    }
  }
  return this.sce_.trustAsResourceUrl(urlFr);
};


/**
 * @param {Array<string>} features The features to highlight.
 * @param {boolean} fit True to fit to the features.
 * @private
 */
exports.prototype.highlightFeatures_ = function(features, fit) {
  if (features !== undefined && features !== null) {
   if (this.map_.getLayers().getArray().indexOf(this.featureLayer_) === -1) {
        this.map_.addLayer(this.featureLayer_);
      }
    var encOpt = /** @type {olx.format.ReadOptions} */ ({
      dataProjection: 'EPSG:2169',
      featureProjection: this.map_.getView().getProjection()
    });
    var jsonFeatures = (new olFormatGeoJSON()).readFeatures({
      'type': 'FeatureCollection',
      'features': features}, encOpt);

    if (jsonFeatures.length > 0) {
      var extent = jsonFeatures[0].getGeometry().getExtent();
      for (var i = 0; i < jsonFeatures.length; ++i) {
        extent = extentExtend(extent,
            jsonFeatures[i].getGeometry().getExtent());
        var curFeature = jsonFeatures[i];
        if (curFeature.getId() == null) {
          curFeature.setId(undefined);
        }
        if (curFeature.getGeometry().getType() ==
            olGeomGeometryType.GEOMETRY_COLLECTION) {
          var geomCollection = /** @type {ol.geom.GeometryCollection} */
            (curFeature.getGeometry());
          geomCollection.getGeometriesArray().forEach(
              function(geometry) {
                var newFeature = curFeature.clone();
                newFeature.setGeometry(geometry);
                this.featureLayer_.getSource().addFeature(newFeature);
              }.bind(this));
        } else {
          this.featureLayer_.getSource().addFeature(curFeature);
        }
      }
      if (fit) {
        this.map_.getView().fit(extent, /** @type {olx.view.FitOptions} */ ({
          size: /** @type {ol.Size} */ (this.map_.getSize()),
          maxZoom: 17
        }));
      }
    }
  }
};


/**
 * @param {string} key The key to find.
 * @param {Object} attributes The attributes to translate.
 * @param {number | undefined} minLength The minimum length of the value to be considered as existing.
 * @return {boolean} True if the property is in the attributes.
 * @export
 */
exports.prototype.hasProperty = function(key, attributes, minLength) {
  if (minLength == undefined) {
    minLength = 0;
  }
  return (key in attributes && ('' + attributes[key]).length > minLength);
};


/**
 * @return {string} Get the URL.
 * @export
 */
exports.prototype.getDownloadMeasurementUrl = function() {
  return this.downloadmeasurementUrl_;
};


/**
 * @return {string} Get the URL.
 * @export
 */
exports.prototype.getDownloadPdfUrl = function() {
  return this.downloadPdfUrl_;
};


/**
 * @return {string} Get the URL.
 * @export
 */
exports.prototype.getDownloadsketchUrl = function() {
  return this.downloadsketchUrl_;
};


/**
 * @param {Object} attributes The  attributes to translate.
 * @return {Array<Object>} The translated attributes.
 * @export
 */
exports.prototype.translateKeys =
    function(attributes) {
      var results = [];

      angular.forEach(attributes, function(value, key) {
        if (key !== 'showProfile') {
          results.push({'key': this.translate_.getString('f_' + key),
            'value': value});
        }
      }, this);
      return results;
    };

/**
 * @param {Object} attributes The attributes to prefix.
 * @param {string} prefix The prefix.
 * @return {Array<Object>} The attributes with prefix.
 * @export
 */
exports.prototype.prefixKeys =
    function(attributes, prefix) {
      var results = [];
      angular.forEach(attributes, function(value, key) {
        if (key !== 'showProfile') {
          results.push({'key': prefix + key, 'value': value});
        }
      }, this);
      return results;
    };

/**
 * @param {Object} elem The attributes.
 * @param {String} layerid the layer id
 * @return {Boolean} True if we should display this attribute.
 * @export
 */
exports.prototype.showAttributesByLang =
    function(elem, layerid) {
      var key = elem['key'];
      var value = elem['value'];
      var ok = false;
      if (layerid == '2407' && (key == 'f_Cl_erosion' ||
        key == 'f_Erosion_kl' || key == 'f_Erosion_Cl' || 
        key == 'f_Erosioun_K')) {
          if (this['language'] == 'fr' && key == 'f_Cl_erosion') {
            ok = true;
          } else if (this['language'] == 'de' && key == 'f_Erosion_kl') {
            ok = true;
          } else if (this['language'] == 'en' && key == 'f_Erosion_Cl') {
            ok = true;
          } else if (this['language'] == 'lb' && key == 'f_Erosioun_K') {
            ok = true;
          }
      } else if (layerid == '2714' && (key == 'f_LABEL_eng' ||
        key == 'f_LC_class_name_fr' || key == 'f_LC_class_name_de' || 
        key == 'f_LC_class_name')) {
          if (this['language'] == 'fr' && key == 'f_LC_class_name_fr') {
            ok = true;
          } else if (this['language'] == 'de' && key == 'f_LC_class_name_de') {
            ok = true;
          } else if (this['language'] == 'en' && key == 'f_LABEL_eng') {
            ok = true;
          } else if (this['language'] == 'lb' && key == 'f_LC_class_name') {
            ok = true;
          }
      } else if (layerid == '2444' && (key == 'f_Betriebsform' ||
        key == 'f_Forme_d_entreprise' || key == 'f_Operation_Form' || 
        key == 'f_Form_vun_Geschaeft')) {
          if (this['language'] == 'fr' && key == 'f_Forme_d_entreprise') {
            ok = true;
          } else if (this['language'] == 'de' && key == 'f_Betriebsform') {
            ok = true;
          } else if (this['language'] == 'en' && key == 'f_Operation_Form') {
            ok = true;
          } else if (this['language'] == 'lb' && key == 'f_Form_vun_Geschaeft') {
            ok = true;
          }
      } else if (key.endsWith('_FR') || key.endsWith('_DE') ||
          key.endsWith('_EN') || key.endsWith('_LU') ||
          key.endsWith('_LB')) {
        if (this['language'] == 'fr') {
          if (key.endsWith('_FR')) {
            ok = true;
          }
        } else if (this['language'] == 'de') {
          if (key.endsWith('_DE')) {
            ok = true;
          }
        } else if (this['language'] == 'en') {
          if (key.endsWith('_EN')) {
            ok = true;
          }
        } else if (this['language'] == 'lb') {
          if (key.endsWith('_LB') || key.endsWith('_LU')) {
            ok = true;
          }
        }
      } else {
        ok = true;
      }
      return ok;
    };

/**
 * Get the path to the Mymaps Resource.
 * @param {?string | undefined} resource The resource.
 * @return {string} The path to the Mymaps Resource.
 * @export
 */
exports.prototype.getMymapsPath = function(resource) {
  if (resource) {
    if (resource.startsWith('data:image')) {
      return resource;
    }
    if (resource.startsWith('/') &&
        this.mymapsImageUrl_.endsWith('/')) {
      resource = '.' + resource;
    }
    return this.mymapsImageUrl_ + resource;
  }
  return '';
};

/**
 * Returns the url to the qrcode of the mymaps.
 * @param {string} mapId The mymaps id.
 * @return {string} The url to qrcode.
 * @export
 */
exports.prototype.getQrCodeForMymapsUrl = function(mapId) {
  if (mapId !== undefined) {
    return this.qrServiceUrl + '?url=' + this.mymapsImageUrl_ + '?map_id=' + mapId;
  }
  return '';
};

/**
 * Check if the value is empty.
 * @param {?string | undefined} value The value to test.
 * @return {boolean} True if is empty.
 * @export
 */
exports.prototype.isEmpty = function(value) {
  if (value === undefined || value === null) {
    return true;
  }
  return String(value).length === 0;
};


/**
 * Export the feature
 * @param {Object} feature The fetaure.
 * @param {string} name The file name.
 * @param {boolean} isTrack True if gpx should export tracks instead of routes.
 * @export
 */
exports.prototype.exportGpx = function(feature, name, isTrack) {
  var encOpt_ = /** @type {olx.format.ReadOptions} */({
    dataProjection: 'EPSG:2169',
    featureProjection: this.map_.getView().getProjection()
  });
  if ('attributes' in feature && !('properties' in feature)) {
    feature['properties'] = feature['attributes'];
  }
  var activeFeature = /** @type {ol.Feature} */
      ((new olFormatGeoJSON()).readFeature(feature, encOpt_));
  if (name === undefined) {
    name = 'kml';
  }
  this.appExport_.exportGpx([activeFeature], name, isTrack);
};


/**
 * Check if the value is a link.
 * @param {*} value The value to test.
 * @return {boolean} True if is a link.
 * @export
 */
exports.prototype.isLink = function(value) {
  return String(value).toLowerCase().indexOf('http://') === 0 ||
      String(value).toLowerCase().indexOf('https://') === 0;
};


/**
 * Export the feature
 * @param {Object} feature The fetaure.
 * @param {string} name The file name.
 * @export
 */
exports.prototype.exportKml = function(feature, name) {
  if (name === undefined) {
    name = 'kml';
  }
  this.appExport_.exportKml(feature, name);
};


/**
 * Translate and join the elements of the array.
 * @param {Array.<string>} array The array to join.
 * @param {string} prefix The prefix to use for translation.
 * @return {string} The joined and translated text.
 * @export
 */
exports.prototype.translateAndjoin = function(array, prefix) {
  if (array !== undefined) {
    var res = [];
    array.forEach(function(elem) {
      res.push(this.translate_.getString(prefix + '_' + elem));
    }.bind(this));
    return res.join(', ');
  }
  return '';
};


/**
 * Get a cookie value
 * @param {string} cname The cookie name.
 * @return {string} The value.
 * @private
 */
exports.prototype.getCookie_ = function(cname) {
  var name = cname + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      var value = c.substring(name.length, c.length);
      if (value.indexOf('"') === 0) {
        value = value.substring(1, value.length - 1);
      }
      return value;
    }
  }
  return '';
};


/**
 * Order an "Affaire"
 * @param {string} numCommune The commune number.
 * @param {string} numMesurage The measurement number.
 * @export
 */
exports.prototype.orderAffaire = function(numCommune, numMesurage) {
    const isIpv6 = location.search.includes('ipv6=true');
    const domain = (isIpv6) ? "app.geoportail.lu" : "geoportail.lu";

  this.http_.get(
    'https://shop.' + domain + '/Portail/commande/webservices/orderAffaireV3.jsp',
    {params: {
      'numCommune': numCommune,
      'numMesurage': numMesurage,
      'ticket': this.getCookie_(this.appAuthtktCookieName_)
    }}).then(function() {
      var msg = this.translate_.getString('Fichier GML commandé.');
      this.notify_(msg, appNotifyNotificationType.INFO);
    }.bind(this));
};

/**
 * Show tracing Geometry
 * @param {string} geom Geoson multilinestring string in 3857.
 * @param {string} color The line color. If undefined then use the default one.
 * @param {number} width The line width. If undefined then use the default one.
 * @export
 */
exports.prototype.showGeom = function(geom, color, width) {
  this.featureLayer_.getSource().clear();
  this.highlightFeatures_(this.lastHighlightedFeatures_, false);
  if (geom !== undefined) {
    var feature = /** @type {ol.Feature} */
      ((new olFormatGeoJSON()).readFeature(geom));
    if (color !== undefined) {
      feature.set('color', color);
    }
    if (width !== undefined) {
      feature.set('width', width);
    }
    this.featureLayer_.getSource().addFeature(feature);
    this.map_.getView().fit(feature.getGeometry().getExtent());
  }
};

/**
 * Open the legend panel.
 * @export
 */
exports.prototype.openLegendPanel = function() {
  this['legendsOpen'] = true;
};

/**
 * Close the legend panel.
 * @export
 */
exports.prototype.closeLegendPanel = function() {
  this['legendsOpen'] = false;
};


/**
 * Check if the theme is available for user
 * @param {String} currentTheme The theme to check.
 * @return {angular.$q.Promise} Promise.
 * @export
 */
exports.prototype.isThemeAvailable = function(currentTheme) {
  return this.curThemesName.indexOf(currentTheme) >= 0;
};

appModule.controller('AppQueryController',
                      exports);


export default exports;

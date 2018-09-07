/**
 * @module lux.MyMap
 */
import luxUtil from './util.js';
import ngeoInteractionMeasure from 'ngeo/interaction/Measure.js';
import ngeoProfileD3Elevation from 'ngeo/profile/d3Elevation.js';
import olFormatGeoJSON from 'ol/format/GeoJSON.js';
import olInteractionSelect from 'ol/interaction/Select.js';
import olLayerVector from 'ol/layer/Vector.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleIcon from 'ol/style/Icon.js';
import olStyleRegularShape from 'ol/style/RegularShape.js';
import olStyleStyle from 'ol/style/Style.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleText from 'ol/style/Text.js';
import olSourceVector from 'ol/source/Vector.js';
import olFormatKML from 'ol/format/KML.js';
import olFormatGPX from 'ol/format/GPX.js';
import olStyleCircle from 'ol/style/Circle.js';
import olEvents from 'ol/events.js';
import olObj from 'ol/obj.js';
import olOverlay from 'ol/Overlay.js';
import olEventsEventType from 'ol/events/EventType.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomPolygon from 'ol/geom/Polygon.js';
import olGeomMultiPoint from 'ol/geom/MultiPoint.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olMapBrowserEventType from 'ol/MapBrowserEventType.js';
import olGeomGeometryLayout from 'ol/geom/GeometryLayout.js';
import olFeature from 'ol/Feature.js';
import olExtent from 'ol/extent.js';
import olGeomMultiLineString from 'ol/geom/MultiLineString.js';

/**
 * @classdesc
 * A mymap layer manager.
 *
 * @constructor
 * @param {luxx.MyMapOptions} options The options.
 * @api stable
 */
const exports = function(options) {

  /**
   * @type {string}
   * @private
   */
  this.id_ = options.mapId;
  console.assert(this.id_ != undefined, 'mapId must be defined');


  /**
   * @type {ol.interaction.Select|null}
   * @private
   */
  this.selectInteraction_ = null;

  /**
   * @type {Element|undefined}
   * @private
   */
  this.profileContainer_;

  if (options.profileTarget) {
    this.profileContainer_ = document.getElementById(options.profileTarget);
  }

  this.selection_ = null;

  this.profile_ = null;

  this.featureOverlay_ = new olSourceVector();

  /**
   * @type {ol.geom.LineString}
   * @private
   */
  this.line_ = null;

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
   * @type {function(Array<ol.Feature>)|undefined}
   * @private
   */
  this.onload_ = options.onload;

  /**
   * @private
   * @type {ol.format.KML}
   */
  this.kmlFormat_ = new olFormatKML();

  /**
   * @private
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new olFormatGPX();

  this.mymapsSymbolUrl_ = [luxUtil.mymapsUrl, 'symbol/'].join('/');
  this.arrowUrl_ = [luxUtil.mymapsUrl, 'getarrow'].join('/');
  this.exportGpxUrl_ = [luxUtil.mymapsUrl, 'exportgpxkml'].join('/');
  this.exportCsvUrl_ = luxUtil.exportCsvUrl;

  /**
   * @private
   * @type {ol.source.Vector}
   */
  this.sourceFeatures_;
};

/**
 * Set the map
 * @param {lux.Map} map The map in which to load the mymap features.
 * @export
 * @api
 */
exports.prototype.setMap = function(map) {

  /**
   * @type {lux.Map}
   * @private
   */
  this.map_ = map;

  var layer = new olLayerVector({
    source: this.featureOverlay_
  });

  layer.setStyle([
    new olStyleStyle({
      image: new olStyleCircle({
        radius: 6,
        fill: new olStyleFill({color: '#ff0000'})
      })
    }),
    new olStyleStyle({
      image: new olStyleCircle({
        radius: 5,
        fill: new olStyleFill({color: '#ffffff'})
      })
    })]);
  layer.setMap(this.map_);

  // FIXME change the bg layer adequately

  this.loadFeatures_();
};

/**
 * Load the features.
 * @private
 */
exports.prototype.loadFeatures_ = function() {

  var url = [luxUtil.mymapsUrl, 'features', this.id_].join('/');
  fetch(url).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    var format = new olFormatGeoJSON();
    this.sourceFeatures_ = new olSourceVector();
    var vector = new olLayerVector({
      source: this.sourceFeatures_
    });
    this.map_.addLayer(vector);
    var features = format.readFeatures(json, {
      dataProjection: 'EPSG:2169',
      featureProjection: 'EPSG:3857'
    });
    if (this.onload_) {
      this.onload_.call(this, features);
    }
    var featureStyleFunction = this.createStyleFunction_(this.map_);
    features.forEach(function(feature) {
      feature.setStyle(featureStyleFunction);
    });
    this.sourceFeatures_.addFeatures(features);

    var size = /** @type {Array<number>} */ (this.map_.getSize());
    this.map_.getView().fit(this.sourceFeatures_.getExtent(), {size: size});

    this.selectInteraction_ = new olInteractionSelect({
      layers: [vector]
    });
    this.map_.addInteraction(this.selectInteraction_);
    olEvents.listen(
      this.selectInteraction_,
      'select',
      this.onFeatureSelected_, this);
  }.bind(this));
};

/**
 * @param {ol.interaction.Select.Event} event The select event.
 * @private
 */
exports.prototype.onFeatureSelected_ = function(event) {
  var features = event.selected;

  if (this.popup_) {
    this.map_.removeOverlay(this.popup_);
    this.popup_ = null;
  }

  if (!features.length) {
    return;
  }
  var feature = features[0];
  var properties = feature.getProperties();

  var content = document.createElement('DIV');
  var title = document.createElement('H3');
  title.innerHTML = properties['name'];
  content.appendChild(title);

  if (properties.description) {
    var description = document.createElement('P');
    description.appendChild(properties.description);
  }
  if (properties.thumbnail) {
    var link = document.createElement('A');
    link.setAttribute('href', luxUtil.baseUrl + properties.image);
    link.setAttribute('target', '_blank');

    var thumb = document.createElement('IMG');
    thumb.setAttribute('src', luxUtil.baseUrl + properties.thumbnail);

    link.appendChild(thumb);
    content.appendChild(link);
  }
  this.getMeasures(feature).forEach(function(element) {
    content.appendChild(element);
  });

  var element = luxUtil.buildPopupLayout(content, function() {});

  this.popup_ = new olOverlay({
    element: element,
    positioning: 'bottom-center',
    offset: [0, -20],
    insertFirst: false,
    autoPan: true
  });

  var closeBtn = element.querySelectorAll('.lux-popup-close')[0];
  olEvents.listen(closeBtn, olEventsEventType.CLICK, function() {
    this.map_.removeOverlay(this.popup_);
    this.popup_ = null;
    this.selectInteraction_.getFeatures().clear();
  }.bind(this));

  this.map_.addOverlay(this.popup_);
  this.popup_.setPosition(event.mapBrowserEvent.coordinate);
};

/**
 * @param {ol.Map} curMap The current map.
 * @return {ol.FeatureStyleFunction} The Function to style.
 * @private
 */
exports.prototype.createStyleFunction_ = function(curMap) {

  var styles = [];

  var vertexStyle = new olStyleStyle({
    image: new olStyleRegularShape({
      radius: 6,
      points: 4,
      angle: Math.PI / 4,
      fill: new olStyleFill({
        color: [255, 255, 255, 0.5]
      }),
      stroke: new olStyleStroke({
        color: [0, 0, 0, 1]
      })
    }),
    geometry: function(feature) {
      var geom = feature.getGeometry();

      var coordinates;
      if (geom instanceof olGeomLineString) {
        coordinates = geom.getCoordinates();
        return new olGeomMultiPoint(coordinates);
      } else if (geom instanceof olGeomPolygon) {
        coordinates = geom.getCoordinates()[0];
        return new olGeomMultiPoint(coordinates);
      } else {
        return geom;
      }
    }
  });

  var fillStyle = new olStyleFill();
  var symbolUrl = this.mymapsSymbolUrl_;
  var arrowUrl = this.arrowUrl_;
  return function(resolution) {

    // clear the styles
    styles.length = 0;

    if (this.get('__editable__') && this.get('__selected__')) {
      styles.push(vertexStyle);
    }

    var color = this.get('color') || '#FF0000';
    var r = parseInt(color.substr(1, 2), 16);
    var g = parseInt(color.substr(3, 2), 16);
    var b = parseInt(color.substr(5, 2), 16);
    var rgbColor = [r, g, b];
    var opacity = this.get('opacity');
    if (opacity === undefined) {
      opacity = 1;
    }
    var rgbaColor = rgbColor.slice(0);
    rgbColor.push(1);
    rgbaColor.push(opacity);

    fillStyle.setColor(rgbaColor);
    if (this.getGeometry().getType() === olGeomGeometryType.LINE_STRING &&
        this.get('showOrientation') === true) {
      var prevArrow, distance;
      var arrowColor = this.get('arrowcolor');
      if (arrowColor === undefined || arrowColor === null) {
        arrowColor = color;
      }
      this.getGeometry().forEachSegment(function(start, end) {
        var arrowPoint = new olGeomPoint(
            [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]);
        var dx = end[0] - start[0];
        var dy = end[1] - start[1];

        if (prevArrow != undefined) {
          var pt1 = curMap.getPixelFromCoordinate(arrowPoint.getCoordinates()),
              pt2 = curMap.getPixelFromCoordinate(prevArrow.getCoordinates()),
              w = pt2[0] - pt1[0],
              h = pt2[1] - pt1[1];
          distance = Math.sqrt(w * w + h * h);
        }
        if (!prevArrow || distance > 600) {
          var coloredArrowUrl = arrowUrl + '?color=' + arrowColor.replace('#', '');
          // arrows
          styles.push(new olStyleStyle({
            geometry: arrowPoint,
            image: new olStyleIcon(/** @type {olx.style.IconOptions} */ ({
              rotation: Math.PI / 2 - Math.atan2(dy, dx),
              src: coloredArrowUrl
            }))
          }));
          prevArrow = arrowPoint;
        }
      });
    }
    var lineDash;
    if (this.get('linestyle')) {
      switch (this.get('linestyle')) {
        case 'dashed':
          lineDash = [10, 10];
          break;
        case 'dotted':
          lineDash = [1, 6];
          break;
        default:
          break;
      }
    }

    var stroke;
    var featureStroke = this.get('stroke');
    if (featureStroke > 0) {
      if (!this.get('__editable__') && this.get('__selected__')) {
        featureStroke = featureStroke + 3;
      }
      stroke = new olStyleStroke({
        color: rgbColor,
        width: featureStroke,
        lineDash: lineDash
      });
    }

    var featureSize = this.get('size');
    if (!this.get('__editable__') && this.get('__selected__')) {
      featureSize = featureSize + 3;
    }
    var imageOptions = {
      fill: fillStyle,
      stroke: new olStyleStroke({
        color: rgbColor,
        width: featureSize / 7
      }),
      radius: featureSize
    };
    var image = null;
    if (this.get('symbolId')) {
      olObj.assign(imageOptions, {
        src: symbolUrl + this.get('symbolId'),
        scale: featureSize / 100,
        rotation: this.get('angle')
      });
      image = new olStyleIcon(imageOptions);
    } else {
      var shape = this.get('shape');
      if (!shape) {
        this.set('shape', 'circle');
        shape = 'circle';
      }
      if (shape === 'circle') {
        image = new olStyleCircle(imageOptions);
      } else if (shape === 'square') {
        olObj.assign(imageOptions, ({
          points: 4,
          angle: Math.PI / 4,
          rotation: this.get('angle')
        }));
        image = new olStyleRegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (shape === 'triangle') {
        olObj.assign(imageOptions, ({
          points: 3,
          angle: 0,
          rotation: this.get('angle')
        }));
        image = new olStyleRegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (shape === 'star') {
        olObj.assign(imageOptions, ({
          points: 5,
          angle: Math.PI / 4,
          rotation: this.get('angle'),
          radius2: featureSize
        }));
        image = new olStyleRegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (this.get('shape') == 'cross') {
        olObj.assign(imageOptions, ({
          points: 4,
          angle: 0,
          rotation: this.get('angle'),
          radius2: 0
        }));
        image = new olStyleRegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      }
    }

    if (this.get('isLabel')) {
      return [new olStyleStyle({
        text: new olStyleText(/** @type {olx.style.TextOptions} */ ({
          text: this.get('name'),
          textAlign: 'start',
          font: 'normal ' + featureSize + 'px Sans-serif',
          rotation: this.get('angle'),
          fill: new olStyleFill({
            color: rgbColor
          }),
          stroke: new olStyleStroke({
            color: [255, 255, 255],
            width: 2
          })
        }))
      })];
    } else {
      styles.push(new olStyleStyle({
        image: image,
        fill: fillStyle,
        stroke: stroke
      }));
    }

    return styles;
  };
};

/**
 * @param {ol.Feature} feature The feature.
 * @return {Array<Element>} The formatted measure.
 */
exports.prototype.getMeasures = function(feature) {
  var elements = [];
  var geom = feature.getGeometry();
  var projection = this.map_.getView().getProjection();
  console.assert(projection);
  if (geom.getType() === olGeomGeometryType.POLYGON ||
      geom.getType() === olGeomGeometryType.LINE_STRING) {
    var lengthEl = document.createElement('P');

    console.assert(geom instanceof olGeomLineString ||
        geom instanceof olGeomPolygon);

    var coordinates = (geom.getType() === olGeomGeometryType.POLYGON) ?
      /** @type{ol.geom.Polygon}*/(geom).getCoordinates()[0] : /** @type{ol.geom.LineString}*/(geom).getCoordinates();
    var length = ngeoInteractionMeasure.getFormattedLength(
      new olGeomLineString(coordinates),
      /** @type{!ol.proj.Projection} */(projection),
      undefined,
      function(measure) {
        return measure.toString();
      }
    );
    lengthEl.appendChild(document.createTextNode(luxUtil.translate('Length:') + ' ' + length));
    elements.push(lengthEl);
  }
  if (geom.getType() === olGeomGeometryType.POLYGON) {
    var areaEl = document.createElement('P');

    console.assert(geom instanceof olGeomPolygon);

    var area = ngeoInteractionMeasure.getFormattedArea(
      /** @type{!ol.geom.Polygon} */(geom),
      /** @type{!ol.proj.Projection} */(projection),
      undefined,
      function(measure) {
        return measure.toString();
      }
    );
    areaEl.appendChild(document.createTextNode(luxUtil.translate('Area:') + ' ' + area));
    elements.push(areaEl);
  }
  if (geom.getType() === olGeomGeometryType.POLYGON &&
      !!feature.get('isCircle')) {
    var radiusEl = document.createElement('P');
    console.assert(geom instanceof olGeomPolygon);
    var center = olExtent.getCenter(geom.getExtent());
    var line = new olGeomLineString([center, /** @type{ol.geom.Polygon} */(geom).getLastCoordinate()]);
    var radius = ngeoInteractionMeasure.getFormattedLength(
      line,
      /** @type{!ol.proj.Projection} */(projection),
      undefined,
      function(measure) {
        return measure.toString();
      }
    );
    radiusEl.appendChild(document.createTextNode(luxUtil.translate('Rayon:') + ' ' + radius));
    elements.push(radiusEl);
  }
  if (geom.getType() === olGeomGeometryType.POINT &&
      !feature.get('isLabel')) {
    var elevationEl = document.createElement('P');

    console.assert(geom instanceof olGeomPoint);

    elevationEl.appendChild(document.createTextNode('N/A'));
    luxUtil.getElevation(/** @type{!ol.geom.Point} */ (geom).getCoordinates()).then(
      function(json) {
        if (json['dhm'] > 0) {
          elevationEl.appendChild(document.createTextNode(luxUtil.translate('Elevation') + ': ' +
              parseInt(json['dhm'], 0).toString() + ' m'));
        }
      }
    );
    elements.push(elevationEl);
  }

  var links = document.createElement('P');
  links.classList.add('lux-popup-links');

  var link = document.createElement('A');
  link.setAttribute('href', 'javascript:void(0);');
  link.appendChild(document.createTextNode(luxUtil.translate('Zoom to')));
  links.appendChild(link);
  olEvents.listen(link, olEventsEventType.CLICK, function() {
    var size = /** @type {Array<number>} */ (this.map_.getSize());
    var extent = /** @type {Array<number>} */ (geom.getExtent());
    this.map_.getView().fit(extent, {size: size});
  }.bind(this));

  if (this.profileContainer_ &&
      geom.getType() === olGeomGeometryType.LINE_STRING) {
    console.assert(geom instanceof olGeomLineString);
    link = document.createElement('A');
    link.setAttribute('href', 'javascript:void(0);');
    link.appendChild(document.createTextNode(luxUtil.translate('Profile')));
    links.appendChild(link);

    olEvents.listen(link, olEventsEventType.CLICK, function() {
      console.assert(geom instanceof olGeomLineString);
      console.assert(this.profileContainer_ instanceof Element);
      this.loadProfile(
        /** @type{ol.geom.LineString} */ (geom),
        /** @type{Element} */ (this.profileContainer_), true);
      var closeBtn = this.profileContainer_.querySelectorAll(
        '.lux-profile-header .lux-profile-close')[0];
      closeBtn.style.display = 'block';
      olEvents.listen(closeBtn, olEventsEventType.CLICK, function() {
        this.hideProfile_();
      }.bind(this));
    }.bind(this));

  }

  link = document.createElement('A');
  link.setAttribute('href', 'javascript:void(0);');
  link.appendChild(document.createTextNode(luxUtil.translate('Exporter KMl')));

  links.appendChild(link);
  olEvents.listen(link, olEventsEventType.CLICK, function() {
    this.exportKml_(feature, undefined);
  }.bind(this));

  link = document.createElement('A');
  link.setAttribute('href', 'javascript:void(0);');
  link.appendChild(document.createTextNode(luxUtil.translate('Exporter GPX')));

  links.appendChild(link);
  olEvents.listen(link, olEventsEventType.CLICK, function() {
    this.exportGpx_(feature, undefined);
  }.bind(this));

  elements.push(links);
  return elements;
};

/**
 * @param {Element} target The target in which to load the profile.
 * @param {boolean|undefined} opt_addCloseBtn Whether to add a close button or
 *     not.
 * @private
 */
exports.prototype.initProfile_ = function(target, opt_addCloseBtn) {
  while (target.firstChild) {
    target.removeChild(target.firstChild);
  }

  target.classList.add('lux-profile');

  var header = document.createElement('DIV');
  header.setAttribute('class', 'lux-profile-header');

  if (opt_addCloseBtn) {
    var closeBtn = document.createElement('BUTTON');
    closeBtn.setAttribute('class', 'lux-profile-close');

    closeBtn.innerHTML = '&times;';
    header.appendChild(closeBtn);
  }

  var metadata = document.createElement('SPAN');
  metadata.setAttribute('class', 'lux-profile-metadata');

  header.appendChild(metadata);

  var exportCSV = document.createElement('BUTTON');
  exportCSV.innerHTML = luxUtil.translate('Export csv');
  olEvents.listen(exportCSV, olEventsEventType.CLICK, function() {
    this.exportCSV_();
  }.bind(this));
  header.appendChild(exportCSV);

  target.appendChild(header);

  var content = document.createElement('DIV');
  content.setAttribute('class', 'lux-profile-content');
  target.appendChild(content);

  this.selection_ = d3.select(content);

  /**
   * @param {Object} item The item.
   * @return {number} The elevation.
   */
  var z = function(item) {
    if ('values' in item && 'dhm' in item['values']) {
      return parseFloat((item['values']['dhm']).toPrecision(5));
    }
    return 0;
  };

  /**
    * @param {Object} item The item.
    * @return {number} The distance.
    */
  var dist = function(item) {
    if ('dist' in item) {
      return item['dist'];
    }
    return 0;
  };

  olEvents.listen(this.map_, olMapBrowserEventType.POINTERMOVE,
      /**
       * @param {ol.MapBrowserPointerEvent} evt Map browser event.
       */
      function(evt) {
        if (evt.dragging || (this.line_ === null)) {
          return;
        }
        var coordinate = this.map_.getEventCoordinate(evt.originalEvent);
        this.snapToGeometry_(coordinate, this.line_);
      }, this);

  var linesConfiguration = {
    'line1': {
      style: {},
      zExtractor: z
    }
  };

  this.profile_ = ngeoProfileD3Elevation({
    linesConfiguration: linesConfiguration,
    distanceExtractor: dist,
    hoverCallback: this.profileHoverCallback_.bind(this),
    outCallback: function() {
      this.removeMeasureTooltip_();
      this.featureOverlay_.clear();
    }.bind(this)
  });
};

/**
 * Clears the data in the profile and hide it.
 * @private
 */
exports.prototype.hideProfile_ = function() {
  if (!this.profileContainer_) {
    return;
  }

  this.selection_.datum(null).call(this.profile_);
  this.line_ = null;
  this.profileContainer_.classList.remove('lux-profile-active');
};

/**
 * It loads the profile into an HTML element.
 * @param {ol.geom.LineString} geom The line geometry.
 * @param {Element|string} target The target in which to load the profile.
 * @param {boolean|undefined} opt_addCloseBtn Whether to add a close button or
 *     not. Default is false.
 * @export
 * @api
 */
exports.prototype.loadProfile = function(geom, target, opt_addCloseBtn) {
  if (typeof target === 'string') {
    target = document.getElementById(target);
  }
  this.profileContainer_ = target;
  this.initProfile_(target, opt_addCloseBtn);

  console.assert(geom instanceof olGeomLineString,
      'geometry should be a linestring');

  target.classList.add('lux-profile-active');

  var encOpt = {
    dataProjection: 'EPSG:2169',
    featureProjection: 'EPSG:3857'
  };
  var params = {
    'geom': new olFormatGeoJSON().writeGeometry(geom, encOpt),
    'nbPoints': 100,
    'layer': 'dhm',
    'id': null
  };
  // convert to URL GET params
  /**
   * @type {string}
   */
  var body = Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');

  /**
   * @type {!RequestInit}
   */
  var request = ({
    method: 'POST',
    headers: /** @type {HeadersInit} */ ({
      'Content-Type': 'application/x-www-form-urlencoded'
    }),
    body: body
  });

  fetch(luxUtil.profileUrl, request
  ).then(function(resp) {
    return resp.json();
  }).then(function(data) {
    // display the chart
    this.selection_.datum(data.profile).call(this.profile_);

    // compute the line geometry and elevation gain/loss
    var elevationGain = 0;
    var elevationLoss = 0;
    var cumulativeElevation = 0;
    var lastElevation;
    var i;
    var len = data.profile.length;
    var lineString = new olGeomLineString([], olGeomGeometryLayout.XYM);
    for (i = 0; i < len; i++) {
      var p = data.profile[i];
      p = new olGeomPoint([p['x'], p['y']]);
      p.transform('EPSG:2169', this.map_.getView().getProjection());
      lineString.appendCoordinate(
          p.getCoordinates().concat(data.profile[i]['dist']));

      var curElevation = (data.profile[i]['values']['dhm']);
      if (lastElevation !== undefined) {
        var elevation = curElevation - lastElevation;
        cumulativeElevation = cumulativeElevation + elevation;
        if (elevation > 0) {
          elevationGain = elevationGain + elevation;
        } else {
          elevationLoss = elevationLoss + elevation;
        }
      }
      lastElevation = curElevation;
    }
    this.line_ = lineString;

    var metadata = this.profileContainer_.querySelectorAll(
      '.lux-profile-header .lux-profile-metadata')[0];
    metadata.innerHTML = '&Delta; + ' + this.formatElevationGain_(elevationGain, 'm');
    metadata.innerHTML += '&nbsp;&nbsp;&Delta; -' + this.formatElevationGain_(-1 * elevationLoss, 'm');
    metadata.innerHTML += '&nbsp;&nbsp;&Delta;' + this.formatElevationGain_(cumulativeElevation,
        'm');
  }.bind(this));
};

/**
 * @private
 */
exports.prototype.exportCSV_ = function() {
  var csv = 'dist,MNT,y,x\n';
  this.selection_.datum().forEach(function(item) {
    csv += item['dist'] + ',' +
          (item['values']['dhm']) + ',' +
          item['x'] + ',' +
          item['y'] + '\n';
  });

  var csvInput = document.createElement('INPUT');
  csvInput.type = 'hidden';
  csvInput.name = 'csv';
  csvInput.value = csv;

  var nameInput = document.createElement('INPUT');
  nameInput.type = 'hidden';
  nameInput.name = 'name';
  nameInput.value = 'mnt';

  var form = document.createElement('FORM');
  form.method = 'POST';
  form.action = this.exportCsvUrl_;
  form.appendChild(nameInput);
  form.appendChild(csvInput);
  document.body.appendChild(form);
  form.submit();
  form.remove();
};


/**
 * Creates a new measure tooltip
 * @private
 */
exports.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = document.createElement('DIV');
  this.measureTooltipElement_.classList.add('lux-tooltip', 'lux-tooltip-measure');
  this.measureTooltip_ = new olOverlay({
    element: this.measureTooltipElement_,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  this.map_.addOverlay(this.measureTooltip_);
};

/**
 * Destroy the measure tooltip
 * @private
 */
exports.prototype.removeMeasureTooltip_ = function() {
  if (this.measureTooltipElement_ !== null) {
    this.measureTooltipElement_.parentNode.removeChild(
        this.measureTooltipElement_);
    this.measureTooltipElement_ = null;
    this.measureTooltip_ = null;
  }
};

/**
 * @param {Object} point The point.
 * @param {number} dist The distance.
 * @param {string} xUnits The x unit.
 * @param {Object} elevation The elevation.
 * @param {string} yUnits The y unit.
 * @private
 */
exports.prototype.profileHoverCallback_ = function(point, dist, xUnits, elevation, yUnits) {
  this.featureOverlay_.clear();
  var curPoint = new olGeomPoint([point['x'], point['y']]);
  curPoint.transform('EPSG:2169', this.map_.getView().getProjection());
  var positionFeature = new olFeature({
    geometry: curPoint
  });
  this.featureOverlay_.addFeature(positionFeature);
  this.createMeasureTooltip_();
  this.measureTooltipElement_.innerHTML = this.distanceLabel_ +
      this.formatDistance_(dist, xUnits) +
      '<br>' +
      this.elevationLabel_ +
      this.formatElevation_(elevation['line1'], yUnits);
  this.measureTooltip_.setPosition(curPoint.getCoordinates());
};

/**
 * Format the distance text.
 * @param {number} dist The distance.
 * @param {string} units The unit.
 * @return {string} The formatted distance.
 * @private
 */
exports.prototype.formatDistance_ = function(dist, units) {
  return parseFloat(dist.toPrecision(3)) + ' ' + units;
};


/**
 * Format the elevation text.
 * @param {Object} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} The elevation text.
 * @private
 */
exports.prototype.formatElevation_ = function(elevation, units) {
  return parseFloat(elevation.toPrecision(4)) + ' ' + units;
};

/**
 * Format the elevation gain text.
 * @param {number} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} the elevation gain text.
 * @private
 */
exports.prototype.formatElevationGain_ =
    function(elevation, units) {
      return parseFloat(parseInt(elevation, 10)) + ' ' + units;
    };

/**
 * @param {ol.Coordinate} coordinate The current pointer coordinate.
 * @param {ol.geom.Geometry|undefined} geom The geometry to snap to.
 * @private
 */
exports.prototype.snapToGeometry_ = function(coordinate, geom) {
  var closestPoint = geom.getClosestPoint(coordinate);
  // compute distance to line in pixels
  var dx = closestPoint[0] - coordinate[0];
  var dy = closestPoint[1] - coordinate[1];
  var viewResolution = this.map_.getView().getResolution();
  var distSqr = dx * dx + dy * dy;
  var pixelDistSqr = distSqr / (viewResolution * viewResolution);
  // Check whether dist is lower than 8 pixels
  if (pixelDistSqr < 64) {
    this.profile_.highlight(closestPoint[2]);
  } else {
    this.profile_.clearHighlight();
  }
};

/**
 * Export the mymaps as a KML file.
 * @param {string | undefined} filename The filename.
 * @export
 */
exports.prototype.exportMymapsAsKml = function(filename) {
  this.exportKml_(this.sourceFeatures_.getFeatures(), filename);
};

/**
 * Export a KML file
 * @param {ol.Feature | Array.<ol.Feature>} feature The feature to export.
 * @param {string | undefined} filename The filename.
 * @private
 */
exports.prototype.exportKml_ = function(feature, filename) {
  var features = feature;
  if (features instanceof olFeature) {
    features = [feature];
  }
  if (filename === undefined) {
    filename = /** @type {string} */(features[0].get('name'));
  }
  var kml = this.kmlFormat_.writeFeatures(features, {
    dataProjection: 'EPSG:4326',
    featureProjection: this.map_.getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      this.sanitizeFilename_(filename));
};

/**
 * Export the mymaps as a Gpx file.
 * @param {string | undefined} filename The filename.
 * @export
 */
exports.prototype.exportMymapsAsGpx = function(filename) {
  this.exportGpx_(this.sourceFeatures_.getFeatures(), filename);
};

/**
 * Export a Gpx file.
 * @param {ol.Feature | Array.<ol.Feature>} feature The feature to export.
 * @param {string | undefined} filename The filename.
 * @private
 */
exports.prototype.exportGpx_ = function(feature, filename) {
  // LineString geometries, and tracks from MultiLineString
  var features = feature;
  if (features instanceof olFeature) {
    features = [feature];
  }
  if (filename === undefined) {
    filename = /** @type {string} */(features[0].get('name'));
  }
  var explodedFeatures = this.exploseFeature_(features);
  explodedFeatures = this.changeLineToMultiline_(explodedFeatures);
  var gpx = this.gpxFormat_.writeFeatures(
    this.orderFeaturesForGpx_(explodedFeatures),
    {
      dataProjection: 'EPSG:4326',
      featureProjection: this.map_.getView().getProjection()
    });
  this.exportFeatures_(gpx, 'gpx',
      this.sanitizeFilename_(filename));
};


/**
 * @param {string} doc The document to export/download.
 * @param {string} format The document format.
 * @param {string} filename File name for the exported document.
 * @private
 */
exports.prototype.exportFeatures_ = function(doc, format, filename) {

  var formatInput = document.createElement('INPUT');
  formatInput.type = 'hidden';
  formatInput.name = 'format';
  formatInput.value = format;

  var nameInput = document.createElement('INPUT');
  nameInput.type = 'hidden';
  nameInput.name = 'name';
  nameInput.value = filename;

  var docInput = document.createElement('INPUT');
  docInput.type = 'hidden';
  docInput.name = 'doc';
  docInput.value = doc;

  var form = document.createElement('FORM');
  form.method = 'POST';
  form.action = this.exportGpxUrl_;
  form.appendChild(formatInput);
  form.appendChild(nameInput);
  form.appendChild(docInput);
  document.body.appendChild(form);
  form.submit();
  form.remove();
};


/**
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 * @private
 */
exports.prototype.sanitizeFilename_ = function(name) {
  name = name.replace(/\s+/g, '_'); // Replace white space with _.
  return name.replace(/[^a-z0-9\-\_]/gi, ''); // Strip any special charactere.
};


/**
 * Explose the feature into multiple features if the geometry is a
 * collection of geometries.
 * @param {Array.<ol.Feature>} features The features to explose.
 * @return {Array.<ol.Feature>} The exploded features.
 * @private
 */
exports.prototype.exploseFeature_ = function(features) {
  var explodedFeatures = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.GEOMETRY_COLLECTION:
        var geomCollection = /** @type {ol.geom.GeometryCollection} */
            (feature.getGeometry());
        geomCollection.getGeometriesArray().forEach(
            function(curGeom) {
              var newFeature = feature.clone();
              newFeature.setGeometry(curGeom);
              explodedFeatures.push(newFeature);
            });
        break;
      case olGeomGeometryType.MULTI_LINE_STRING:
        var multiLineString = /** @type {ol.geom.MultiLineString} */
            (feature.getGeometry());
        multiLineString.getLineStrings().forEach(
            function(curGeom) {
              var newFeature = feature.clone();
              newFeature.setGeometry(curGeom);
              explodedFeatures.push(newFeature);
            });
        break;

      default :
        explodedFeatures.push(feature);
        break;
    }
  });
  return explodedFeatures;
};


/**
 * Change each line contained in the array into multiline geometry.
 * @param {Array.<ol.Feature>} features The features to change.
 * @return {Array.<ol.Feature>} The changed features.
 * @private
 */
exports.prototype.changeLineToMultiline_ = function(features) {
  var changedFeatures = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.LINE_STRING:
        var geom = /** @type {ol.geom.LineString} */ (feature.getGeometry());
        var multilineFeature = feature.clone();
        multilineFeature.setGeometry(
            new olGeomMultiLineString([geom.getCoordinates()]));
        changedFeatures.push(multilineFeature);
        break;
      default :
        changedFeatures.push(feature);
        break;
    }
  });
  return changedFeatures;
};


/**
 * Order the feature to have the right GPX order.
 * An optional instance of <meta />
 * An arbitrary number of instances of <wpt />
 * An arbitrary number of instances of <rte />
 * An arbitrary number of instances of <trk />
 * An optional instance of <extensions />
 * @param {Array.<ol.Feature>} features The features to sort.
 * @return {Array.<ol.Feature>} The sorted features.
 * @private
 */
exports.prototype.orderFeaturesForGpx_ = function(features) {

  var points = [];
  var lines = [];
  var others = [];
  features.forEach(function(feature) {
    switch (feature.getGeometry().getType()) {
      case olGeomGeometryType.POINT:
        points.push(feature);
        break;
      case olGeomGeometryType.LINE_STRING:
        lines.push(feature);
        break;
      default :
        others.push(feature);
        break;
    }
  });

  return points.concat(lines, others);
};


export default exports;

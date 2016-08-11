goog.provide('lux.MyMap');

goog.require('goog.dom');
goog.require('ngeo.interaction.Measure');
goog.require('ol.format.GeoJSON');
goog.require('ol.interaction.Select');
goog.require('ol.layer.Vector');
goog.require('ol.style.Fill');
goog.require('ol.style.Icon');
goog.require('ol.style.RegularShape');
goog.require('ol.style.Style');
goog.require('ol.style.Stroke');
goog.require('ol.style.Text');

/**
 * @classdesc
 * A mymap layer manager.
 *
 * @constructor
 * @param {string} id The uuid of the mymap to load.
 * @param {lux.Map} map The map in which to load the mymap features.
 */
lux.MyMap = function(id, map) {

  /**
   * @type {lux.Map} The reference to the map.
   * @private
   */
  this.map_ = map;

  /**
   * @type {string} The uuid.
   * @private
   */
  this.id_ = id;

  var url = [lux.mymapsUrl, 'map', id].join('/');
  fetch(url).then(function(resp) {
    return resp.json();
  }).then(function(json) {

    // FIXME change the bg layer adequately

    this.loadFeatures_();

  }.bind(this));
};

/**
 * Load the features.
 * @private
 */
lux.MyMap.prototype.loadFeatures_ = function() {

  var url = [lux.mymapsUrl, 'features', this.id_].join('/');
  fetch(url).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    var format = new ol.format.GeoJSON();
    var source = new ol.source.Vector();
    var vector = new ol.layer.Vector({
      source: source
    });
    this.map_.addLayer(vector);
    var features = format.readFeatures(json, {
      dataProjection: 'EPSG:2169',
      featureProjection: 'EPSG:3857'
    });
    var featureStyleFunction = this.createStyleFunction(this.map_);
    features.forEach(function(feature) {
      feature.setStyle(featureStyleFunction);
    });
    source.addFeatures(features);

    this.map_.getView().fit(source.getExtent(), this.map_.getSize());

    var select = new ol.interaction.Select({
      layers: [vector]
    });
    this.map_.addInteraction(select);

    ol.events.listen(select, ol.interaction.SelectEventType.SELECT,
      this.onFeatureSelected, this);
  }.bind(this));
};

/**
 * @param {ol.interaction.SelectEvent} event The select event.
 */
lux.MyMap.prototype.onFeatureSelected = function(event) {
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

  var content = goog.dom.createElement(goog.dom.TagName.DIV);
  var title = goog.dom.createElement(goog.dom.TagName.H3);
  title.innerHTML = properties['name'];
  goog.dom.append(content, title);

  var description = goog.dom.createDom(goog.dom.TagName.P, {
    html: properties.description
  });
  goog.dom.append(content, description);

  goog.dom.append(content, this.getMeasures(feature));

  if (properties.thumbnail) {
    var link = goog.dom.createDom(goog.dom.TagName.A, {
      href: lux.baseUrl + properties.image,
      target: '_blank'
    });
    var thumb = goog.dom.createDom(goog.dom.TagName.IMG, {
      src: lux.baseUrl + properties.thumbnail
    });
    goog.dom.append(link, thumb);
    goog.dom.append(content, link);
  }

  var element = lux.buildPopupLayout_(content, true);

  this.popup_ = new ol.Overlay({
    element: element,
    position: event.mapBrowserEvent.coordinate,
    positioning: 'bottom-center',
    offset: [0, -20],
    insertFirst: false
  });

  var closeBtn = element.querySelectorAll('.lux-popup-close')[0];
  ol.events.listen(closeBtn, ol.events.EventType.CLICK, function() {
    this.map_.removeOverlay(this.popup_);
  }.bind(this));

  this.map_.addOverlay(this.popup_);
};

/**
 * @param {ol.Map} curMap The current map.
 * @return {ol.FeatureStyleFunction} The Function to style.
 * @export
 *
 * Taken from 'mymapsservice.js'
 */
lux.MyMap.prototype.createStyleFunction = function(curMap) {

  var styles = [];

  var vertexStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: 6,
      points: 4,
      angle: Math.PI / 4,
      fill: new ol.style.Fill({
        color: [255, 255, 255, 0.5]
      }),
      stroke: new ol.style.Stroke({
        color: [0, 0, 0, 1]
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
  var symbolUrl = this.mymapsSymbolUrl_;

  return function(resolution) {

    // clear the styles
    styles.length = 0;

    if (this.get('__editable__') && this.get('__selected__')) {
      styles.push(vertexStyle);
    }

    // goog.asserts.assert(goog.isDef(this.get('__style__'));
    var color = this.get('color') || '#FF0000';
    var rgbColor = goog.color.hexToRgb(color);
    var opacity = this.get('opacity');
    if (!goog.isDef(opacity)) {
      opacity = 1;
    }
    var rgbaColor = goog.array.clone(rgbColor);
    rgbColor.push(1);
    rgbaColor.push(opacity);

    fillStyle.setColor(rgbaColor);
    if (this.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING &&
        this.get('showOrientation') === true) {
      var prevArrow, distance;
      this.getGeometry().forEachSegment(function(start, end) {
        var arrowPoint = new ol.geom.Point(
            [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]);
        var dx = end[0] - start[0];
        var dy = end[1] - start[1];

        var arrowOptions = {
          fill: new ol.style.Fill({
            color: rgbColor
          }),
          stroke: new ol.style.Stroke({
            color: rgbColor,
            width: 1
          }),
          radius: 10,
          points: 3,
          angle: 0,
          rotation: (90 * Math.PI / 180) + (-1 * Math.atan2(dy, dx))
        };

        if (prevArrow) {
          var pt1 = curMap.getPixelFromCoordinate(arrowPoint.getCoordinates()),
              pt2 = curMap.getPixelFromCoordinate(prevArrow.getCoordinates()),
              w = pt2[0] - pt1[0],
              h = pt2[1] - pt1[1];
          distance = Math.sqrt(w * w + h * h);
        }
        if (!prevArrow || distance > 40) {
          // arrows
          styles.push(new ol.style.Style({
            geometry: arrowPoint,
            image: new ol.style.RegularShape(arrowOptions)
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

    if (this.get('stroke') > 0) {
      stroke = new ol.style.Stroke({
        color: rgbColor,
        width: this.get('stroke'),
        lineDash: lineDash
      });
    }
    var imageOptions = {
      fill: fillStyle,
      stroke: new ol.style.Stroke({
        color: rgbColor,
        width: this.get('size') / 7
      }),
      radius: this.get('size')
    };
    var image = null;
    if (this.get('symbolId')) {
      goog.object.extend(imageOptions, {
        src: symbolUrl + this.get('symbolId'),
        scale: this.get('size') / 100,
        rotation: this.get('angle')
      });
      image = new ol.style.Icon(imageOptions);
    } else {
      var shape = this.get('shape');
      if (!shape) {
        this.set('shape', 'circle');
        shape = 'circle';
      }
      if (shape === 'circle') {
        image = new ol.style.Circle(imageOptions);
      } else if (shape === 'square') {
        goog.object.extend(imageOptions, ({
          points: 4,
          angle: Math.PI / 4,
          rotation: this.get('angle')
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (shape === 'triangle') {
        goog.object.extend(imageOptions, ({
          points: 3,
          angle: 0,
          rotation: this.get('angle')
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (shape === 'star') {
        goog.object.extend(imageOptions, ({
          points: 5,
          angle: Math.PI / 4,
          rotation: this.get('angle'),
          radius2: this.get('size')
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (this.get('shape') == 'cross') {
        goog.object.extend(imageOptions, ({
          points: 4,
          angle: 0,
          rotation: this.get('angle'),
          radius2: 0
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      }
    }

    if (this.get('isLabel')) {
      return [new ol.style.Style({
        text: new ol.style.Text(/** @type {olx.style.TextOptions} */ ({
          text: this.get('name'),
          textAlign: 'start',
          font: 'normal ' + this.get('size') + 'px Sans-serif',
          rotation: this.get('angle'),
          fill: new ol.style.Fill({
            color: rgbColor
          }),
          stroke: new ol.style.Stroke({
            color: [255, 255, 255],
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

/**
 * @param {ol.Feature} feature The feature.
 * @return {string} The formatted measure.
 */
lux.MyMap.prototype.getMeasures = function(feature) {
  var elements = [];
  var element;
  var geom = feature.getGeometry();
  if (geom.getType() === ol.geom.GeometryType.POLYGON ||
      geom.getType() === ol.geom.GeometryType.LINE_STRING) {
    element = goog.dom.createDom(goog.dom.TagName.P);

    var coordinates = (geom.getType() === ol.geom.GeometryType.POLYGON) ?
      geom.getCoordinates()[0] : geom.getCoordinates();
    var length = ngeo.interaction.Measure.getFormattedLength(
      new ol.geom.LineString(coordinates),
      this.map_.getView().getProjection(),
      null
    );
    goog.dom.setTextContent(element, length);
    elements.push(element);
  }
  return elements;
};

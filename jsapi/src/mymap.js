goog.provide('lux.MyMap');

goog.require('goog.dom');
goog.require('goog.dom.query');
goog.require('goog.color');
goog.require('goog.events');
goog.require('ngeo.interaction.Measure');
goog.require('ngeo.profile');
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
 * @param {luxx.MyMapOptions} options The options.
 * @api stable
 */
lux.MyMap = function(options) {

  /**
   * @type {string}
   * @private
   */
  this.id_ = options.mapId;
  goog.asserts.assert(this.id_ != undefined, 'mapId must be defined');


  /**
   * @type {ol.interaction.Select|null}
   * @private
   */
  this.selectInteraction_ = null;

  /**
   * @type {Element|undefined}
   */
  this.profileContainer_;

  if (options.profileTarget) {
    this.profileContainer_ = document.getElementById(options.profileTarget);
  }

  this.selection_ = null;

  this.profile_ = null;

  this.featureOverlay_ = new ol.source.Vector();

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
   */
  this.onload_ = options.onload;

  /**
   * @private
   * @type {ol.format.KML}
   */
  this.kmlFormat_ = new ol.format.KML();

  /**
   * @private
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new ol.format.GPX();

  this.mymapsSymbolUrl_ = [lux.mymapsUrl, 'symbol/'].join('/');
};

/**
 * Set the map
 * @param {lux.Map} map The map in which to load the mymap features.
 * @export
 * @api
 */
lux.MyMap.prototype.setMap = function(map) {

  /**
   * @type {lux.Map}
   * @private
   */
  this.map_ = map;

  var layer = new ol.layer.Vector({
    source: this.featureOverlay_
  });

  layer.setStyle([
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({color: '#ff0000'})
      })
    }),
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({color: '#ffffff'})
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
    if (this.onload_) {
      this.onload_.call(this, features);
    }
    var featureStyleFunction = this.createStyleFunction_(this.map_);
    features.forEach(function(feature) {
      feature.setStyle(featureStyleFunction);
    });
    source.addFeatures(features);

    var size = /** @type {Array<number>} */ (this.map_.getSize());
    this.map_.getView().fit(source.getExtent(), size);

    this.selectInteraction_ = new ol.interaction.Select({
      layers: [vector]
    });
    this.map_.addInteraction(this.selectInteraction_);

    ol.events.listen(
      this.selectInteraction_,
      ol.interaction.SelectEventType.SELECT,
      this.onFeatureSelected_, this);
  }.bind(this));
};

/**
 * @param {ol.interaction.SelectEvent} event The select event.
 * @private
 */
lux.MyMap.prototype.onFeatureSelected_ = function(event) {
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

  goog.dom.append(content, this.getMeasures(feature));

  var element = lux.buildPopupLayout(content, function() {});

  this.popup_ = new ol.Overlay({
    element: element,
    positioning: 'bottom-center',
    offset: [0, -20],
    insertFirst: false,
    autoPan: true
  });

  var closeBtn = element.querySelectorAll('.lux-popup-close')[0];
  ol.events.listen(closeBtn, ol.events.EventType.CLICK, function() {
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
lux.MyMap.prototype.createStyleFunction_ = function(curMap) {

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
 * @return {Array<Element>} The formatted measure.
 */
lux.MyMap.prototype.getMeasures = function(feature) {
  var elements = [];
  var geom = feature.getGeometry();
  if (geom.getType() === ol.geom.GeometryType.POLYGON ||
      geom.getType() === ol.geom.GeometryType.LINE_STRING) {
    var lengthEl = goog.dom.createDom(goog.dom.TagName.P);

    goog.asserts.assert(geom instanceof ol.geom.LineString ||
        geom instanceof ol.geom.Polygon);

    var coordinates = (geom.getType() === ol.geom.GeometryType.POLYGON) ?
      geom.getCoordinates()[0] : geom.getCoordinates();
    var length = ngeo.interaction.Measure.getFormattedLength(
      new ol.geom.LineString(coordinates),
      this.map_.getView().getProjection(),
      null,
      function(measure) {
        return measure.toString();
      }
    );
    goog.dom.setTextContent(lengthEl, lux.translate('Length:') + ' ' + length);
    elements.push(lengthEl);
  }
  if (geom.getType() === ol.geom.GeometryType.POLYGON) {
    var areaEl = goog.dom.createDom(goog.dom.TagName.P);

    goog.asserts.assert(geom instanceof ol.geom.Polygon);

    var area = ngeo.interaction.Measure.getFormattedArea(
      geom,
      this.map_.getView().getProjection(),
      null,
      function(measure) {
        return measure.toString();
      }
    );
    goog.dom.setTextContent(areaEl, lux.translate('Area:') + ' ' + area);
    elements.push(areaEl);
  }
  if (geom.getType() === ol.geom.GeometryType.POLYGON &&
      !!feature.get('isCircle')) {
    var radiusEl = goog.dom.createDom(goog.dom.TagName.P);
    goog.asserts.assert(geom instanceof ol.geom.Polygon);
    var center = ol.extent.getCenter(geom.getExtent());
    var line = new ol.geom.LineString([center, geom.getLastCoordinate()]);
    var radius = ngeo.interaction.Measure.getFormattedLength(
      line,
      this.map_.getView().getProjection(),
      null,
      function(measure) {
        return measure.toString();
      }
    );
    goog.dom.setTextContent(radiusEl, lux.translate('Rayon:') + ' ' + radius);
    elements.push(radiusEl);
  }
  if (geom.getType() === ol.geom.GeometryType.POINT &&
      !feature.get('isLabel')) {
    var elevationEl = goog.dom.createDom(goog.dom.TagName.P);

    goog.asserts.assert(geom instanceof ol.geom.Point);

    goog.dom.setTextContent(elevationEl, 'N/A');
    lux.getElevation(geom.getCoordinates()).then(
      function(json) {
        if (json['dhm'] > 0) {
          goog.dom.setTextContent(elevationEl,
              lux.translate('Elevation') + ': ' +
              parseInt(json['dhm'] / 100, 0).toString() + ' m');
        }
      }
    );
    elements.push(elevationEl);
  }

  var links = goog.dom.createDom(goog.dom.TagName.P);
  goog.dom.classlist.add(links, 'lux-popup-links');

  var link = goog.dom.createDom(goog.dom.TagName.A, {
    href: 'javascript:void(0);'
  });
  goog.dom.setTextContent(link, lux.translate('Zoom to'));
  goog.dom.append(links, link);
  goog.events.listen(link, goog.events.EventType.CLICK, function() {
    var size = /** @type {Array<number>} */ (this.map_.getSize());
    var extent = /** @type {Array<number>} */ (geom.getExtent());
    this.map_.getView().fit(extent, size);
  }.bind(this));

  if (this.profileContainer_ &&
      geom.getType() === ol.geom.GeometryType.LINE_STRING) {
    goog.asserts.assert(geom instanceof ol.geom.LineString);
    link = goog.dom.createDom(goog.dom.TagName.A, {
      href: 'javascript:void(0);'
    });
    goog.dom.setTextContent(link, lux.translate('Profile'));
    goog.dom.append(links, link);
    goog.events.listen(link, goog.events.EventType.CLICK, function() {
      goog.asserts.assert(geom instanceof ol.geom.LineString);
      goog.asserts.assert(this.profileContainer_ instanceof Element);
      this.loadProfile(geom, this.profileContainer_, true);
      var closeBtn = this.profileContainer_.querySelectorAll(
        '.lux-profile-header .lux-profile-close')[0];
      closeBtn.style.display = 'block';
      ol.events.listen(closeBtn, ol.events.EventType.CLICK, function() {
        this.hideProfile_();
      }.bind(this));
    }.bind(this));

  }

  link = goog.dom.createDom(goog.dom.TagName.A, {
    href: 'javascript:void(0);'
  });
  goog.dom.setTextContent(link, lux.translate('Exporter KMl'));
  goog.dom.append(links, link);
  goog.events.listen(link, goog.events.EventType.CLICK, function() {
    this.exportKml_(feature);
  }.bind(this));

  link = goog.dom.createDom(goog.dom.TagName.A, {
    href: 'javascript:void(0);'
  });
  goog.dom.setTextContent(link, lux.translate('Exporter GPX'));
  goog.dom.append(links, link);
  goog.events.listen(link, goog.events.EventType.CLICK, function() {
    this.exportGpx_(feature);
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
lux.MyMap.prototype.initProfile_ = function(target, opt_addCloseBtn) {
  goog.dom.removeChildren(target);
  goog.dom.classlist.add(target, 'lux-profile');

  var header = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-profile-header'
  });
  if (opt_addCloseBtn) {
    var closeBtn = goog.dom.createDom(goog.dom.TagName.BUTTON, {
      'class': 'lux-profile-close'
    });
    closeBtn.innerHTML = '&times;';
    header.appendChild(closeBtn);
  }

  var metadata = goog.dom.createDom(goog.dom.TagName.SPAN, {
    'class': 'lux-profile-metadata'
  });
  header.appendChild(metadata);

  var exportCSV = goog.dom.createDom(goog.dom.TagName.BUTTON);
  exportCSV.innerHTML = lux.translate('Export csv');
  ol.events.listen(exportCSV, ol.events.EventType.CLICK, function() {
    this.exportCSV_();
  }.bind(this));
  header.appendChild(exportCSV);

  target.appendChild(header);

  var content = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-profile-content'
  });
  target.appendChild(content);

  this.selection_ = d3.select(content);

  /**
   * @param {Object} item The item.
   * @return {number} The elevation.
   */
  var z = function(item) {
    if ('values' in item && 'dhm' in item['values']) {
      return parseFloat((item['values']['dhm'] / 100).toPrecision(5));
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

  ol.events.listen(this.map_, ol.MapBrowserEvent.EventType.POINTERMOVE,
      /**
       * @param {ol.MapBrowserPointerEvent} evt Map browser event.
       */
      function(evt) {
        if (evt.dragging || goog.isNull(this.line_)) {
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

  this.profile_ = ngeo.profile({
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
lux.MyMap.prototype.hideProfile_ = function() {
  if (!this.profileContainer_) {
    return;
  }

  this.selection_.datum(null).call(this.profile_);
  this.line_ = null;
  goog.dom.classlist.remove(this.profileContainer_, 'lux-profile-active');
};

/**
 * @param {ol.geom.LineString} geom The line geometry.
 * @param {Element|string} target The target in which to load the profile.
 * @param {boolean|undefined} opt_addCloseBtn Whether to add a close button or
 *     not.
 * @export
 * @api
 */
lux.MyMap.prototype.loadProfile = function(geom, target, opt_addCloseBtn) {
  if (goog.isString(target)) {
    target = document.getElementById(target);
  }
  this.profileContainer_ = target;
  this.initProfile_(target, opt_addCloseBtn);

  goog.asserts.assert(geom instanceof ol.geom.LineString,
      'geometry should be a linestring');

  goog.dom.classlist.add(target, 'lux-profile-active');

  var encOpt = {
    dataProjection: 'EPSG:2169',
    featureProjection: 'EPSG:3857'
  };
  var params = {
    'geom': new ol.format.GeoJSON().writeGeometry(geom, encOpt),
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
   * @type {RequestInit}
   */
  var request = ({
    method: 'POST',
    headers: /** @type {HeadersInit} */ ({
      'Content-Type': 'application/x-www-form-urlencoded'
    }),
    body: body
  });

  fetch(lux.profileUrl, request
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
    var lineString = new ol.geom.LineString([], ol.geom.GeometryLayout.XYM);
    for (i = 0; i < len; i++) {
      var p = data.profile[i];
      p = new ol.geom.Point([p['x'], p['y']]);
      p.transform('EPSG:2169', this.map_.getView().getProjection());
      lineString.appendCoordinate(
          p.getCoordinates().concat(data.profile[i]['dist']));

      var curElevation = (data.profile[i]['values']['dhm']) / 100;
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
lux.MyMap.prototype.exportCSV_ = function() {
  var csv = 'dist,MNT,y,x\n';
  this.selection_.datum().forEach(function(item) {
    csv += item['dist'] + ',' +
          (item['values']['dhm']) / 100 + ',' +
          item['x'] + ',' +
          item['y'] + '\n';
  });

  var csvInput = goog.dom.createElement(goog.dom.TagName.INPUT);
  csvInput.type = 'hidden';
  csvInput.name = 'csv';
  csvInput.value = csv;

  var nameInput = goog.dom.createElement(goog.dom.TagName.INPUT);
  nameInput.type = 'hidden';
  nameInput.name = 'name';
  nameInput.value = 'mnt';

  var form = goog.dom.createElement(goog.dom.TagName.FORM);
  form.method = 'POST';
  form.action = 'http://maps.geoportail.lu/main/wsgi/profile/echocsv';
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
lux.MyMap.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = goog.dom.createDom(goog.dom.TagName.DIV);
  goog.dom.classlist.addAll(this.measureTooltipElement_,
      ['lux-tooltip', 'lux-tooltip-measure']);
  this.measureTooltip_ = new ol.Overlay({
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
lux.MyMap.prototype.removeMeasureTooltip_ = function() {
  if (!goog.isNull(this.measureTooltipElement_)) {
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
lux.MyMap.prototype.profileHoverCallback_ = function(point, dist, xUnits, elevation, yUnits) {
  this.featureOverlay_.clear();
  var curPoint = new ol.geom.Point([point['x'], point['y']]);
  curPoint.transform('EPSG:2169', this.map_.getView().getProjection());
  var positionFeature = new ol.Feature({
    geometry: curPoint
  });
  this.featureOverlay_.addFeature(positionFeature);
  this.createMeasureTooltip_();
  this.measureTooltipElement_.innerHTML = this.distanceLabel_ +
      this.formatDistance_(dist, xUnits) +
      '<br>' +
      this.elevationLabel_ +
      this.formatElevation_(elevation, yUnits);
  this.measureTooltip_.setPosition(curPoint.getCoordinates());
};

/**
 * Format the distance text.
 * @param {number} dist The distance.
 * @param {string} units The unit.
 * @return {string} The formatted distance.
 * @private
 */
lux.MyMap.prototype.formatDistance_ = function(dist, units) {
  return parseFloat(dist.toPrecision(3)) + ' ' + units;
};


/**
 * Format the elevation text.
 * @param {Object} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} The elevation text.
 * @private
 */
lux.MyMap.prototype.formatElevation_ = function(elevation, units) {
  return parseFloat(elevation.toPrecision(4)) + ' ' + units;
};

/**
 * Format the elevation gain text.
 * @param {number} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} the elevation gain text.
 * @private
 */
lux.MyMap.prototype.formatElevationGain_ =
    function(elevation, units) {
      return parseFloat(parseInt(elevation, 10)) + ' ' + units;
    };

/**
 * @param {ol.Coordinate} coordinate The current pointer coordinate.
 * @param {ol.geom.Geometry|undefined} geom The geometry to snap to.
 * @private
 */
lux.MyMap.prototype.snapToGeometry_ = function(coordinate, geom) {
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
 * Export a KML file
 * @param {ol.Feature} feature The feature to export.
 * @private
 */
lux.MyMap.prototype.exportKml_ = function(feature) {
  var kml = this.kmlFormat_.writeFeatures([feature], {
    dataProjection: 'EPSG:4326',
    featureProjection: this.map_.getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      this.sanitizeFilename_(/** @type {string} */(feature.get('name'))));
};


/**
 * Export a Gpx file.
 * @param {ol.Feature} feature The feature to export.
 * @private
 */
lux.MyMap.prototype.exportGpx_ = function(feature) {
  // LineString geometries, and tracks from MultiLineString
  var explodedFeatures = this.exploseFeature_([feature]);
  explodedFeatures = this.changeLineToMultiline_(explodedFeatures);
  var gpx = this.gpxFormat_.writeFeatures(
    this.orderFeaturesForGpx_(explodedFeatures),
    {
      dataProjection: 'EPSG:4326',
      featureProjection: this.map_.getView().getProjection()
    });
  gpx = gpx.replace('<gpx ',
      '<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' version="1.1" ' +
      'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 ' +
      'http://www.topografix.com/GPX/1/1/gpx.xsd" creator="geoportail.lu" ');
  this.exportFeatures_(gpx, 'gpx',
      this.sanitizeFilename_(/** @type {string} */(feature.get('name'))));
};


/**
 * @param {string} doc The document to export/download.
 * @param {string} format The document format.
 * @param {string} filename File name for the exported document.
 * @private
 */
lux.MyMap.prototype.exportFeatures_ = function(doc, format, filename) {

  var formatInput = goog.dom.createElement(goog.dom.TagName.INPUT);
  formatInput.type = 'hidden';
  formatInput.name = 'format';
  formatInput.value = format;

  var nameInput = goog.dom.createElement(goog.dom.TagName.INPUT);
  nameInput.type = 'hidden';
  nameInput.name = 'name';
  nameInput.value = filename;

  var docInput = goog.dom.createElement(goog.dom.TagName.INPUT);
  docInput.type = 'hidden';
  docInput.name = 'doc';
  docInput.value = doc;

  var form = goog.dom.createElement(goog.dom.TagName.FORM);
  form.method = 'POST';
  form.action = 'http://maps.geoportail.lu/main/wsgi/mymaps/exportgpxkml';
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
lux.MyMap.prototype.sanitizeFilename_ = function(name) {
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
lux.MyMap.prototype.exploseFeature_ = function(features) {
  var explodedFeatures = [];
  goog.array.forEach(features, function(feature) {
    switch (feature.getGeometry().getType()) {
      case ol.geom.GeometryType.GEOMETRY_COLLECTION:
        var geomCollection = /** @type {ol.geom.GeometryCollection} */
            (feature.getGeometry());
        goog.array.forEach(geomCollection.getGeometriesArray(),
            function(curGeom) {
              var newFeature = feature.clone();
              newFeature.setGeometry(curGeom);
              explodedFeatures.push(newFeature);
            });
        break;
      case ol.geom.GeometryType.MULTI_LINE_STRING:
        var multiLineString = /** @type {ol.geom.MultiLineString} */
            (feature.getGeometry());
        goog.array.forEach(multiLineString.getLineStrings(),
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
lux.MyMap.prototype.changeLineToMultiline_ = function(features) {
  var changedFeatures = [];
  goog.array.forEach(features, function(feature) {
    switch (feature.getGeometry().getType()) {
      case ol.geom.GeometryType.LINE_STRING:
        var geom = /** @type {ol.geom.LineString} */ (feature.getGeometry());
        var multilineFeature = feature.clone();
        multilineFeature.setGeometry(
            new ol.geom.MultiLineString([geom.getCoordinates()]));
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
lux.MyMap.prototype.orderFeaturesForGpx_ = function(features) {

  var points = [];
  var lines = [];
  var others = [];
  goog.array.forEach(features, function(feature) {
    switch (feature.getGeometry().getType()) {
      case ol.geom.GeometryType.POINT:
        points.push(feature);
        break;
      case ol.geom.GeometryType.LINE_STRING:
        lines.push(feature);
        break;
      default :
        others.push(feature);
        break;
    }
  });

  return points.concat(lines, others);
};

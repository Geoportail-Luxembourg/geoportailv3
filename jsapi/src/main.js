goog.provide('lux');
goog.provide('lux.Map');

goog.require('goog.dom');
goog.require('ol.events');
goog.require('ol.control.MousePosition');
goog.require('ol.Map');
goog.require('ol.Overlay');
goog.require('ol.View');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.source.OSM');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.WMTSRequestEncoding');

proj4.defs('EPSG:2169','+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');

/**
 * @type {string}
 */
lux.layersUrl = '../layers.json';

/**
 * @param {string} url Url to jsapilayers service.
 * @export
 */
lux.setLayersUrl = function(url) {
  lux.layersUrl = url;
};

/**
 * @classdesc
 * The map is the core component of the Geoportail V3 API.
 *
 * @constructor
 * @extends {ol.Map}
 * @param {luxx.MapOptions} options Map options.
 * @export
 */
lux.Map = function(options) {

  var layers    = [];
  var defaultBg = 652; // 'streets_jpeg';

  /**
   * @private
   * @type {Object} A JSON layers config object.
   */
  this.layersConfig = null;

  /**
   * @private
   * @type {Promise} Promise of layers config request.
   */
  this.promise = null;

  if (options.bgLayer) {
    layers.push(options.bgLayer);
    delete options.bgLayer;
  } else {
    layers.push(defaultBg);
  }
  if (options.layers) {
    layers = layers.concat(options.layers);
    delete options.layers;
  }
  this.promise = fetch(lux.layersUrl).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    this.layersConfig = /** @type {luxx.LayersOptions} */ (json);
    this.addLayers_(layers);
  }.bind(this));

  var viewOptions = {
    center : ol.proj.fromLonLat([6.215, 49.845]),
    zoom   : 9
  };

  if (options.position) {
    viewOptions.center = ol.proj.transform(
      options.position,
      (options.positionSrs) ?
          'EPSG:' + options.positionSrs.toString() : 'EPSG:2169',
      'EPSG:3857'
    );
    delete options.position;
    delete options.positionSrs;
  }
  if (options.zoom) {
    viewOptions.zoom = options.zoom;
    delete options.zoom;
  }

  options.view = new ol.View(viewOptions);

  var controls = ol.control.defaults();
  var srs = options.mousePositionSrs ?
      'EPSG:' + options.mousePositionSrs.toString() : 'EPSG:2169';
  if (options.mousePosition) {
    controls.push(new ol.control.MousePosition({
      projection: ol.proj.get(srs),
      coordinateFormat: function(coord) {
        var decimal = 1;
        if (srs == 'EPSG:4326') {
          decimal = 5;
        }
        if (srs == 'EPSG:2169') {
          decimal = 2;
        }
        return coord.map(function(c) {
          return c.toFixed(decimal);
        });
      },
      undefinedHTML: 'Coordinates'
    }));
    delete options.mousePosition;
    delete options.mousePositionSrs;
  }
  options.controls = controls;

  options.logo = {
    href : 'http://map.geoportail.lu',
    src  : 'https://www.geoportail.lu/favicon.ico'
  };

  goog.base(this, options);

  this.getTargetElement().classList.add('lux-map');
};

goog.inherits(lux.Map, ol.Map);

/**
 * Show a marker on the map at the given location.
 * @param {luxx.MarkerOptions} options Config options
 * @export
 */
lux.Map.prototype.showMarker = function(options) {
  var element = goog.dom.createDom(goog.dom.TagName.DIV);
  var image = goog.dom.createDom(goog.dom.TagName.IMG);
  image.src = options.iconURL ||
      'http://openlayers.org/en/master/examples/data/icon.png';
  element.appendChild(image);
  var position = options.position || this.getView().getCenter();
  this.addOverlay(new ol.Overlay({
    element: element,
    position: position,
    positioning: options.positioning || 'center-center'
  }));

  if (options.autoCenter) {
    this.getView().setCenter(position);
  }

  if (options.html) {
    var popup;
    var showPopupEvent = options.hover ?
        ol.events.EventType.MOUSEMOVE : ol.events.EventType.CLICK;
    ol.events.listen(element, showPopupEvent, (function() {
      if (!popup) {
        var element = buildPopupLayout_(options.html, !options.hover);
        popup = new ol.Overlay({
          element: element,
          position: position,
          positioning: 'bottom-center',
          offset: [0, -20],
          insertFirst: false
        });

        if (!options.hover) {
          var closeBtn = element.querySelectorAll('.lux-popup-close')[0];
          ol.events.listen(closeBtn, ol.events.EventType.CLICK, function() {
            this.removeOverlay(popup);
          }.bind(this));
        }
      }
      this.addOverlay(popup);
      this.renderSync();
    }).bind(this));

    if (options.hover) {
      ol.events.listen(element, ol.events.EventType.MOUSEOUT, function() {
        this.removeOverlay(popup);
      }.bind(this));
    }
  }

};


/**
 * Builds the popup layout.
 * @param {string} html The HTML/text to put into the popup.
 * @param {boolean} addCloseBtn Whether to add a close button or not.
 * @return {Element} The created element.
 * @private
 */
function buildPopupLayout_(html, addCloseBtn) {
  var container = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup'
  });
  var arrow = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup-arrow'
  });
  var content = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup-content'
  });
  content.innerHTML = html;

  if (addCloseBtn) {
    var closeBtn = goog.dom.createDom(goog.dom.TagName.BUTTON, {
      'class': 'lux-popup-close'
    });
    closeBtn.innerHTML = '&times;';
    goog.dom.insertChildAt(content, closeBtn, 0);
  }

  goog.dom.append(container, [arrow, content]);
  return container;
}

/**
 * @param {Array<string|number>} layers Array of layer names
 * @private
 */
lux.Map.prototype.addLayers_ = function(layers) {
  var conf = this.layersConfig;
  if (!conf) {
    return;
  }
  layers.map(function(layer) {
    var layerConf;
    if (typeof layer == 'number' || !isNaN(parseInt(layer, 10))) {
      layerConf = conf[layer];
    } else if (typeof layer == 'string') {
      layerConf = lux.findLayerByName_(layer, conf);
    }
    if (!layerConf) {
      console.error('Layer "' + layer + '" not present in layers list');
      return;
    }
    var fn = (layerConf.type === 'internal WMS') ?
      lux.WMSLayerFactory_ : lux.WMTSLayerFactory_;
    this.getLayers().push(fn(layerConf));
  }.bind(this));
};

/**
 * @param {string|number} layer The layer id or name
 */
lux.Map.prototype.addLayerById = function(layer) {
  this.promise.then(function() {
    this.addLayers_([layer]);
  }.bind(this));
};

/**
 * @param {string} name The layer name
 * @param {Object<string,luxx.LayersOptions>} layers The layers config
 * @return {luxx.LayersOptions|undefined} The layer config.
 * @private
 */
lux.findLayerByName_ = function(name, layers) {
  for (var i in layers) {
    var layer = layers[i];
    if (layer.name == name) {
      return layer;
    }
  }
  return;
};

/**
 * @param {Object} config The layer's config
 * @return {ol.layer.Tile} The layer.
 */
lux.WMTSLayerFactory_ = function(config) {
  var format = config['imageType'];
  var imageExt = format.split('/')[1];

  var url = '//wmts{1-2}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}/' +
  '{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;

  var layer = new ol.layer.Tile({
    source: new ol.source.WMTS({
      url             : url,
      layer           : config['name'],
      matrixSet       : 'GLOBAL_WEBMERCATOR_4_V3',
      format          : format,
      requestEncoding : ol.source.WMTSRequestEncoding.REST,
      projection      : ol.proj.get('EPSG:3857'),
      tileGrid        : new ol.tilegrid.WMTS({
        origin: [
          -20037508.3428, 20037508.3428
        ],
        resolutions: [
          156543.033928, 78271.516964, 39135.758482, 19567.879241,
          9783.9396205, 4891.96981025, 2445.98490513, 1222.99245256,
          611.496226281, 305.748113141, 152.87405657, 76.4370282852,
          38.2185141426, 19.1092570713, 9.55462853565, 4.77731426782,
          2.38865713391, 1.19432856696, 0.597164283478, 0.298582141739,
          0.1492910708695, 0.07464553543475
        ],
        matrixIds: [
          '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
          '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
          '20', '21'
        ]
      }),
      style: 'default'
    })
  });

  return layer;
};

/**
 * @param {Object} config The layer's config
 * @return {ol.layer.Image} The layer.
 */
lux.WMSLayerFactory_ = function(config) {
  var url = 'http://map.geoportail.lu/main/wsgi/ogcproxywms?';
  var optSource = {
    url: url,
    params: {
      'FORMAT': config['imageType'],
      'LAYERS': config['layers']
    }
  };
  var layer = new ol.layer.Image({
    source: new ol.source.ImageWMS(optSource)
  });

  return layer;
};

goog.provide('lux');
goog.provide('lux.Map');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('lux.LayerManager');
goog.require('lux.MyMap');
goog.require('lux.StateManager');
goog.require('ol.Map');
goog.require('ol.Overlay');
goog.require('ol.View');
goog.require('ol.control.MousePosition');
goog.require('ol.events');
goog.require('ol.events');
goog.require('ol.format.GPX');
goog.require('ol.format.GeoJSON');
goog.require('ol.format.KML');
goog.require('ol.geom.Point');
goog.require('ol.interaction.Select');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.OSM');
goog.require('ol.source.WMTSRequestEncoding');

proj4.defs('EPSG:2169','+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');

/**
 * @typedef {{push: function(Array<string>)}}
 */
lux.Piwik;

/**
 * @type {lux.Piwik}
 * @export
 */
var _paq = [];

_paq.push(['setSiteId', 22]);

(function() {
  var u = '//statistics.geoportail.lu/';
  _paq.push(['setTrackerUrl', u + 'piwik.php']);
  var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
  g.type = 'text/javascript'; g.async = true; g.defer = true; g.src = u + 'piwik.js'; s.parentNode.insertBefore(g,s);
})();


/**
 * @type {string}
 */
lux.layersUrl = 'jsapilayers';

/**
 * @type {string}
 */
lux.searchUrl = 'fulltextsearch?';

/**
 * @type {string}
 */
lux.profileUrl = 'profile.json';

/**
 * @type {string?}
 */
lux.baseUrl = null;

/**
 * Sets the basic url of the rest services such as :
 * <lu><li>Search service</li>
 * <li>Mymaps service</li>
 * <li>Mymaps service</li>
 * <li>Elevation service</li>
 * <li>Geocoding service</li>
 * <li>Reverse geocoding service</li>
 * </lu>
 * @param {string|null} url Base url to services. Default is //apiv3.geoportail.lu/api/wsgi/
 * @export
 */
lux.setBaseUrl = function(url) {
  if (!url) {
    lux.layersUrl = '../layers.json';
    lux.i18nUrl = '../lang_xx.json';

    url = '//apiv3.geoportail.lu/api/wsgi/';
  } else {
    lux.layersUrl = url + lux.layersUrl;
    lux.i18nUrl = url + lux.i18nUrl;
  }

  lux.searchUrl = url + lux.searchUrl;
  lux.mymapsUrl = url + lux.mymapsUrl;
  lux.elevationUrl = url + lux.elevationUrl;
  lux.geocodeUrl = url + lux.geocodeUrl;
  lux.reverseGeocodeUrl = url + lux.reverseGeocodeUrl;
  lux.queryUrl = url + lux.queryUrl;
  lux.profileUrl = url + lux.profileUrl;
  lux.baseUrl = url;
};

/**
 * @type {string}
 */
lux.mymapsUrl = 'mymaps';

/**
 * @type {string}
 */
lux.elevationUrl = 'raster';

/**
 * @type {string}
 */
lux.queryUrl = 'getfeatureinfo?';

/**
 * @type {string}
 */
lux.geocodeUrl = 'geocode/search';

/**
 * @type {string}
 */
lux.reverseGeocodeUrl = 'geocode/reverse';

/**
 * @param {string} url Url to jsapilayers service.
 * @export
 * @api
 */
lux.setLayersUrl = function(url) {
  lux.layersUrl = url;
};

/**
 * @type {string}
 */
lux.i18nUrl = 'proj/api/build/locale/fr/geoportailv3.json';

/**
 * @type {string}
 */
lux.lang = 'fr';

/**
 * @type {Array<number>?}
 */
lux.popupSize = null;


/**
 * @type {Object<string, string>}
 */
lux.i18n = {};

/**
 * Returns the translated string if available.
 * @param {string} text The text to translate.
 * @return {string} The translated text.
 */
lux.translate = function(text) {
  return lux.i18n[text] || text;
};

/**
 * @param {Array<number>} size Dimensions for popups
 * @export
 * @api
 */
lux.setPopupSize = function(size) {
  lux.popupSize = size;
};

/**
 * @param {string} url Url to i18n service.
 * @export
 * @api
 */
lux.setI18nUrl = function(url) {
  lux.i18nUrl = url;
};

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * @param {function()} func The function to call after a given delay.
 * @param {number} wait The delay in ms.
 * @param {boolean=} opt_immediate Should the function be called now?
 * @return {function()} The function.
 * @api
 */
lux.debounce = function(func, wait, opt_immediate) {
  var timeout;
  return function() {
    var context = this;
    var args = arguments;
    var later = function() {
      timeout = null;
      if (!opt_immediate) {
        func.apply(context, args);
      }
    };
    var callNow = opt_immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
};

/**
 * @classdesc
 * The map is the core component of the Geoportail V3 API.
 * This constructor instantiates and render a [lux.Map](lux.Map.html) object.
 * @example
 * // To render a map, the API needs to know the element where to display the map (target),
 * // the predefined background layer (bgLayer) to display,
 * // the predefined layers (layers),
 * // the starting zoom level (zoom),
 * // the central position of the map (position)
 * var map = new lux.Map({
 * target: 'map1',
 * bgLayer: 'basemap_2015_global',
 * zoom: 18,
 * position: [75977, 75099]
 * });
 * @constructor
 * @extends {ol.Map}
 * @param {luxx.MapOptions} options Map options.
 * @export
 * @api stable
 */
lux.Map = function(options) {

  var layers    = [];
  var layerOpacities = [];
  var defaultBg = 'basemap_2015_global';

  _paq.push(['trackPageView']);

  /**
   * @private
   * @type {ol.Extent}
   */
  this.featureExtent_ = ol.extent.createEmpty();

  /**
   * @private
   * @type {Object}
   */
  this.layersConfig = null;

  /**
   * @private
   * @type {Promise}
   */
  this.layersPromise = null;

  /**
   * @private
   * @type {Promise}
   */
  this.i18nPromise = null;

  var langUrl = lux.i18nUrl.replace('xx', lux.lang);
  this.i18nPromise = fetch(langUrl).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    lux.i18n = json[lux.lang];
  }.bind(this));

  /**
   * @private
   * @type {ol.layer.Vector}
   */
  this.searchLayer_ = null;

  var fillStyle = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });

  var strokeStyle = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  /**
   * @private
   * @type {ol.style.Style}
   */
  this.vectorStyle_ = new ol.style.Style({
    fill: fillStyle,
    stroke: strokeStyle,
    image: new ol.style.Circle({
      radius: 10,
      fill: fillStyle,
      stroke: strokeStyle
    })
  });

  /**
   * @private
   * @type {ol.layer.Vector}
   */
  this.showLayer_ = new ol.layer.Vector({
    source: new ol.source.Vector()
  });

  this.showLayer_.setStyle(this.vectorStyle_);

  /**
   * @private
   * @type {ol.layer.Tile}
   */
  this.blankLayer_ = new ol.layer.Tile();
  this.blankLayer_.set('name', 'blank');

  /**
   * @private
   * @type {ol.Overlay}
   */
  this.queryPopup_ = null;

  if (options.bgLayer) {
    layers.push(options.bgLayer);
    delete options.bgLayer;
  } else {
    layers.push(defaultBg);
  }
  // Add opacity for background
  layerOpacities.push([1]);

  if (options.layers) {
    layers = layers.concat(options.layers);
    delete options.layers;
  }
  if (options.layerOpacities) {
    layerOpacities = layerOpacities.concat(options.layerOpacities);
    goog.asserts.assert(layers.length == layerOpacities.length,
        'Layers and opacities should have the same number of items');
    delete options.layerOpacities;
  }
  this.layersPromise = fetch(lux.layersUrl).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    this.layersConfig = /** @type {luxx.LayersOptions} */ (json);
    this.addLayers_(layers, layerOpacities);
  }.bind(this));

  Promise.all([this.i18nPromise, this.layersPromise]).then(function() {
    // background layers selector
    if (options.bgSelector && options.bgSelector.target) {
      this.addBgSelector(options.bgSelector.target);
    }
    delete options.bgSelector;

    if (options.layerManager) {
      var target = options.layerManager.target;
      var el = typeof target === 'string' ?
           document.getElementById(target) :
           target;
      var control = new lux.LayerManager({
        target: el
      });
      this.addControl(control);
    }
    delete options.layerManager;
  }.bind(this));

  if (options.features) {
    var opts = options.features;
    this.showFeatures(opts.layer, opts.ids, opts.click, opts.target);
  }

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

  var target;
  var el;
  if (options.mousePosition) {
    var srs = options.mousePosition.srs ?
        'EPSG:' + options.mousePosition.srs.toString() : 'EPSG:2169';
    target = options.mousePosition.target;
    el = typeof target === 'string' ?
         document.getElementById(target) :
         target;
    if (el instanceof Element) {
      controls.push(new ol.control.MousePosition({
        target: el,
        className: 'lux-mouse-position',
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
    } else {
      console.error('Mouse position target should be a DOM Element or its id');
    }
    delete options.mousePosition;
  }
  options.controls = controls;

  options.logo = {
    href : '//map.geoportail.lu',
    src  : '//www.geoportail.lu/favicon.ico'
  };

  if (options.search && options.search.target) {
    var searchTarget = options.search.target;
    delete options.search;
    this.i18nPromise.then(function() {
      this.addSearch(searchTarget);
    }.bind(this));
  }

  goog.base(this, options);

  this.getTargetElement().classList.add('lux-map');

  ol.events.listen(this.getLayers(), ol.Collection.EventType.ADD,
      this.checkForExclusion_, this);

  if (options.popupTarget) {
    this.popupTarget = typeof options.popupTarget === 'string' ?
        document.getElementById(options.popupTarget) :
        options.popupTarget;
    if (!(this.popupTarget instanceof Element)) {
      console.error('Marker target should be a DOM Element or its id');
      return;
    }
  }
  ol.events.listen(this, ol.MapBrowserEvent.EventType.SINGLECLICK,
      this.handleSingleclickEvent_, this);

  this.stateManager_ = new lux.StateManager();
  this.stateManager_.setMap(this);

  this.showLayer_.setMap(this);

  // change cursor on mouseover feature
  ol.events.listen(this, ol.pointer.EventType.POINTERMOVE, function(evt) {
    var pixel = this.getEventPixel(evt.originalEvent);
    var hit = this.hasFeatureAtPixel(pixel);
    var pixelHit = this.forEachLayerAtPixel(pixel, function(colors) {
      return true;
    }, this, function(l) {
      return this.getLayers().getArray()[0] !== l;
    }.bind(this), this);
    this.getTargetElement().style.cursor = (hit || pixelHit) ? 'pointer' : '';
  }.bind(this));
};

goog.inherits(lux.Map, ol.Map);

/**
 * Adds the given layer to the top of this map. If you want to add a layer
 * elsewhere in the stack, use `getLayers()` and the methods available on
 * {@link ol.Collection}.
 * @param {ol.layer.Base} layer Layer.
 * @export
 * @api
 */
lux.Map.prototype.addLayer = function(layer) {
  this.layersPromise.then(function() {
    ol.Map.prototype.addLayer.call(this, layer);
  }.bind(this));
};

/**
 * Show a marker on the map at the given location.
 * @param {luxx.MarkerOptions=} opt_options Config options
 * @export
 * @api
 */
lux.Map.prototype.showMarker = function(opt_options) {
  var options = opt_options || {};
  var element = goog.dom.createDom(goog.dom.TagName.DIV);
  var image = goog.dom.createDom(goog.dom.TagName.IMG);
  var el;
  if (options.target) {
    el = typeof options.target === 'string' ?
        document.getElementById(options.target) :
        options.target;
    if (!(el instanceof Element)) {
      console.error('Marker target should be a DOM Element or its id');
      return;
    }
  }
  image.src = options.iconURL ||
      '//openlayers.org/en/master/examples/data/icon.png';
  element.appendChild(image);

  var position;
  if (options.position) {
    position = ol.proj.transform(
        options.position,
        (options.positionSrs) ?
            'EPSG:' + options.positionSrs.toString() : 'EPSG:2169',
        'EPSG:3857'
    );
  } else {
    position = this.getView().getCenter();
  }

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
    var showPopupEvent = options.click ?
        ol.events.EventType.CLICK : ol.events.EventType.MOUSEMOVE;
    ol.events.listen(element, showPopupEvent, (function() {
      if (options.target) {
        el.innerHTML = options.html;
        return;
      }
      if (!popup) {
        var cb = !options.click ? undefined : function() {
          this.removeOverlay(popup);
        }.bind(this);
        var element = lux.buildPopupLayout(options.html, cb);
        popup = new ol.Overlay({
          element: element,
          position: position,
          positioning: 'bottom-center',
          offset: [0, -20],
          insertFirst: false
        });
      }
      this.addOverlay(popup);
      this.renderSync();
    }).bind(this));

    if (!options.click) {
      ol.events.listen(element, ol.events.EventType.MOUSEOUT, function() {
        if (options.target) {
          el.innerHTML = '';
          return;
        }
        this.removeOverlay(popup);
      }.bind(this));
    }
  }

};


/**
 * Builds the popup layout.
 * @param {string|goog.dom.Appendable} html The HTML/text or DOM Element to put
 *    into the popup.
 * @param {function()=} closeCallback Optional callback function. If set a close
 *    button is added.
 * @return {Element} The created element.
 * @export
 * @api
 */
lux.buildPopupLayout = function(html, closeCallback) {
  var container = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup'
  });
  var arrow = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup-arrow'
  });

  var elements = [arrow];

  var content = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup-content'
  });

  if (lux.popupSize) {
    container.style.width = lux.popupSize[0] + 'px';
    content.style.height = lux.popupSize[1] + 'px';
    content.style.maxHeight = 'none';
  }

  if (typeof html == 'string') {
    content.innerHTML = html;
  } else {
    goog.dom.append(content, html);
  }

  if (closeCallback) {
    var header = goog.dom.createDom(goog.dom.TagName.H3, {
      'class': 'lux-popup-header'
    });
    var closeBtn = goog.dom.createDom(goog.dom.TagName.BUTTON, {
      'class': 'lux-popup-close'
    });
    closeBtn.innerHTML = '&times;';
    goog.dom.append(header, closeBtn);
    elements.push(header);

    ol.events.listen(closeBtn, ol.events.EventType.CLICK, closeCallback);
  }

  elements.push(content);

  goog.dom.append(container, elements);
  return container;
};

/**
 * Get the elevation for coordinates.
 * @param {ol.Coordinate} coordinate The coordinate of the point.
 * @return {Promise} Promise of the elevation request.
 * @export
 * @api
 */
lux.getElevation = function(coordinate) {
  var lonlat = /** @type {ol.Coordinate} */
        (ol.proj.transform(coordinate,
            'EPSG:3857', 'EPSG:2169'));
  var url = lux.elevationUrl;
  url += '?lon=' + lonlat[0] + '&lat=' + lonlat[1];

  return fetch(url).then(function(resp) {
    return resp.json();
  });
};

/**
 * @param {string|number} layer Layer id
 * @return {Object} The layer config
 * @private
 */
lux.Map.prototype.findLayerConf_ = function(layer) {
  var conf = this.layersConfig;
  var layerConf;
  if (typeof layer == 'number' || !isNaN(parseInt(layer, 10))) {
    layerConf = conf[layer];
  } else if (typeof layer == 'string') {
    layerConf = lux.findLayerByName_(layer, conf);
  }
  if (!layerConf) {
    console.error('Layer "' + layer + '" not present in layers list');
    return null;
  }
  return layerConf;
};

/**
 * @param {Array<string|number>} layers Array of layer names
 * @param {Array<number>} opacities Array of layer opacities
 * @private
 */
lux.Map.prototype.addLayers_ = function(layers, opacities) {
  var conf = this.layersConfig;
  if (!conf) {
    return;
  }
  layers.forEach(function(layer, index) {
    if (layer == 'blank') {
      this.getLayers().push(this.blankLayer_);
      return;
    }
    var layerConf = this.findLayerConf_(layer);
    var fn = (layerConf.type.indexOf('WMS') != -1) ?
      lux.WMSLayerFactory_ : lux.WMTSLayerFactory_;
    var opacity = goog.isDef(opacities[index]) ? opacities[index] : 1;
    this.getLayers().push(fn(layerConf, opacity));
  }.bind(this));
};

/**
 * @param {ol.Collection.EventType} event The event.
 * @private
 */
lux.Map.prototype.checkForExclusion_ = function(event) {
  var layer1 = event.element;

  if (!goog.isDef(layer1.get('metadata'))) {
    return;
  }

  var exclusion1 = layer1.get('metadata')['exclusion'];


  if (!goog.isDef(exclusion1)) {
    return;
  }

  var layers = this.getLayers().getArray();
  var len = layers.length;
  var i;
  var layer2;
  var exclusion2;
  for (i = len - 1; i >= 0; i--) {
    layer2 = layers[i];

    if (layer2 == layer1 || !goog.isDef(layer2.get('metadata')) ||
        !goog.isDef(layer2.get('metadata')['exclusion'])) {
      continue;
    }

    exclusion2 = layer2.get('metadata')['exclusion'];
    if (lux.intersects_(exclusion1, exclusion2)) {
      // layer to exclude is not the current base layer
      if (i !== 0) {
        this.removeLayer(layer2);
      } else {
        this.getLayers().setAt(0, this.blankLayer_);
      }
      console.error('Layer "' + layer2.get('name') + '" cannot be used with "' + layer1.get('name') + '"');
    }
  }
};

/**
 * @param {string} one The first list of exclusions.
 * @param {string} two The second list of exclusions.
 * @return {boolean} Whether the array intersect or not.
 * @private
 */
lux.intersects_ = function(one, two) {
  var arr1 = /** @type {Array} */ (JSON.parse(one));
  var arr2 = /** @type {Array} */ (JSON.parse(two));
  return arr1.some(function(item) {
    return arr2.indexOf(item) > -1;
  });
};

/**
 * Adds the given layer to the top of this map. If you want to add a layer
 * elsewhere in the stack, use `getLayers()` and the methods available on
 * {@link ol.Collection}.
 * @param {string|number} layer The layer id.
 * @param {number=} opt_opacity The layer opacity. Default is 1.
 * @export
 * @api
 */
lux.Map.prototype.addLayerById = function(layer, opt_opacity) {
  this.layersPromise.then(function() {
    var opacity = goog.isDef(opt_opacity) ? opt_opacity : 1;
    this.addLayers_([layer], [opacity]);
  }.bind(this));
};

/**
 * @param {string} name The layer name.
 * @param {Object<string,luxx.LayersOptions>} layers The layers config.
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
 * It adds a simple background selector control into a specific html element.
 * @see {@link https://apiv3.geoportail.lu/api/wsgi/proj/1.0/build/apidoc/examples/index.html#example3}
 * @param {Element|string} target Dom element or id of the element to render
 * bgSelector in.
 * @export
 * @api
 */
lux.Map.prototype.addBgSelector = function(target) {
  this.layersPromise.then(function() {
    if (!this.layersConfig) {
      return;
    }

    var el = typeof target === 'string' ?
        document.getElementById(target) :
        target;
    if (!(el instanceof Element)) {
      console.error('BgSelector target should be a DOM Element or its id');
      return;
    }
    var container = document.createElement('div');
    container.classList.add('lux-bg-selector');
    var select = document.createElement('select');
    select.classList.add('lux-bg-selector-select');

    var conf = this.layersConfig;
    var backgrounds = Object.keys(conf).filter(function(l) {
      return conf[l].isBgLayer;
    }).map(function(l) {
      return conf[l];
    });
    var active = this.getLayers().item(0).get('name');
    backgrounds.forEach(function(background) {
      var option = document.createElement('option');
      option.value = background.id;
      option.innerText = lux.translate(background.name);
      if (active == background.name) {
        option.setAttribute('selected', 'selected');
      }
      select.appendChild(option);
    });

    // add blank layer
    var blankOption = document.createElement('option');
    blankOption.value = 'blank';
    blankOption.innerText = lux.translate('blank');
    if (active == 'blank') {
      blankOption.setAttribute('selected', 'selected');
    }
    select.appendChild(blankOption);

    container.appendChild(select);
    el.appendChild(container);

    select.addEventListener('change', function() {
      if (select.value !== 'blank') {
        this.getLayers().setAt(
          0, lux.WMTSLayerFactory_(this.layersConfig[select.value], 1)
        );
      } else {
        this.getLayers().setAt(0, this.blankLayer_);
      }
    }.bind(this));

    // update the selector if blank layer is set (after exclusion)
    ol.events.listen(this.getLayers(), ol.Collection.EventType.ADD,
        function(event) {
          var layer = this.getLayers().getArray()[0];
          if (layer == this.blankLayer_) {
            blankOption.setAttribute('selected', 'selected');
          }
        }, this);

  }.bind(this));
};

/**
 * @param {string|number} layer The layer identifier
 * @param {Array<string|number>} ids Array of features identifiers
 * @param {boolean?} opt_click True if click is needed to show popup
 * @param {Element|string|undefined} opt_target Element to render popup content in
 * @export
 * @api
 */
lux.Map.prototype.showFeatures = function(layer, ids, opt_click, opt_target) {
  // remove any highlighted feature
  this.showLayer_.getSource().clear();
  this.layersPromise.then(function() {
    var lid = this.findLayerConf_(layer).id;
    // check if layer corresponding to feature is shown on the map
    // if so, then highlight the feature
    var visible = this.getLayers().getArray().some(function(l) {
      return l.get('id') === lid;
    });
    ids.forEach(function(id) {
      var uri = lux.queryUrl + 'fid=' + lid + '_' + id + '&tooltip';
      fetch(uri).then(function(resp) {
        return resp.json();
      }).then(function(json) {
        this.addFeature(json, visible, opt_click, opt_target);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * @param {Object} json GeoJSON object
 * @param {boolean} highlight Whether or not to highlight the features.
 * @param {boolean?} opt_click True if click is needed to show popup
 * @param {Element|string|undefined} opt_target Element to render popup content in
 * @private
 */
lux.Map.prototype.addFeature = function(json, highlight, opt_click, opt_target) {
  var format = new ol.format.GeoJSON();
  json[0].features.forEach(function(f) {
    f.properties = f.attributes;
  });
  var features = format.readFeatures({
    type     : 'FeatureCollection',
    features : json[0].features
  }, {
    dataProjection    : 'EPSG:2169',
    featureProjection : 'EPSG:3857'
  });
  if (features.length == 0) {
    return;
  }
  var size = this.getSize();
  features.forEach(function(feature) {
    this.showMarker({
      position    : ol.extent.getCenter(feature.getGeometry().getExtent()),
      positionSrs : '3857',
      autoCenter  : true,
      click       : opt_click,
      target      : opt_target,
      html        : feature.get('tooltip')
    });
    this.featureExtent_ = ol.extent.extend(
      this.featureExtent_,
      feature.getGeometry().getExtent()
    );
    if (size) {
      this.getView().fit(this.featureExtent_, size, {
        maxZoom: 17,
        padding: [0, 0, 0, 0]
      });
    }
  }.bind(this));
  if (highlight) {
    this.showLayer_.getSource().addFeatures(features);
  }
};

/**
 * It adds the search control into an html element.
 * @see {@link https://apiv3.geoportail.lu/api/wsgi/proj/1.0/build/apidoc/examples/index.html#example6}
 * @param {Element|string} target Dom element or id of the element to render
 * search widget in.
 * @export
 * @api
 */
lux.Map.prototype.addSearch = function(target) {

  var el = typeof target === 'string' ?
      document.getElementById(target) :
      target;
  if (!(el instanceof Element)) {
    console.error('Search target should be a DOM Element or its id');
    return;
  }

  var container = document.createElement('div');
  container.classList.add('lux-search');

  var input = document.createElement('input');
  input.classList.add('lux-search-input');
  input.setAttribute('placeholder', lux.translate('search'));
  container.appendChild(input);
  var clear = document.createElement('button');
  clear.classList.add('lux-search-clear');
  clear.innerHTML = '&times;';
  container.appendChild(clear);

  el.appendChild(container);

  clear.addEventListener('click', function() {
    input.value         = '';
    clear.style.display = '';
    this.searchLayer_.getSource().clear();
  }.bind(this));
  input.addEventListener('keyup', function() {
    clear.style.display = (input.value == '') ? '' : 'block';
  });

  this.searchLayer_ = new ol.layer.Vector({
    source: new ol.source.Vector()
  });

  this.searchLayer_.setStyle(this.vectorStyle_);
  this.searchLayer_.setMap(this);

  var format = new ol.format.GeoJSON();

  new autoComplete({
    'selector'  : input,
    'minChars'  : 2,
    'menuClass' : 'lux-search-suggestions',
    'source'    : function(term, suggest) {
      term = term.toLowerCase();
      fetch(lux.searchUrl + 'limit=5&layer=Adresse&query=' + term).then(function(resp) {
        return resp.json();
      }).then(function(json) {
        suggest(json.features);
      });
    },
    'renderItem' : function(item, search) {
      var label = item.properties.label;
      search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      var re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi');
      var geom = /** @type {ol.geom.Point} */ (format.readGeometry(item.geometry));
      var bbox = (!item['bbox']['join']) ? geom.getExtent() : item['bbox'];
      return '<div class="autocomplete-suggestion" data-val="' + label + '"' +
          'data-coord="' + geom.getCoordinates().join(',') + '"' +
          'data-extent="' + bbox.join(',') + '">' +
          label.replace(re, '<b>$1</b>') +
          '</div>';
    },
    'onSelect' : function(e, term, item) {
      var coord = item.getAttribute('data-coord').split(',').map(parseFloat);
      var extent = item.getAttribute('data-extent').split(',').map(parseFloat);
      this.searchLayer_.getSource().clear();
      this.searchLayer_.getSource().addFeature(new ol.Feature(
        new ol.geom.Point(
          ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857')
        )
      ));
      this.getView().fit(
        ol.geom.Polygon.fromExtent(
          ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857')
        ),
        /** @type {Array<number>} */ (this.getSize()),
        /** @type {olx.view.FitOptions} */ ({
          maxZoom: 17
        })
      );
    }.bind(this)
  });

};

/**
 * It displays a GPX file on the map.
 * @see {@link https://apiv3.geoportail.lu/api/wsgi/proj/1.0/build/apidoc/examples/index.html#example4}
 * @param {string} url Url to the GPX file.
 * @param {luxx.VectorOptions=} opt_options Options.
 * @export
 * @api
 */
lux.Map.prototype.addGPX = function(url, opt_options) {

  /** @type {ol.StyleFunction | undefined}*/
  var styleFunction;
  if (opt_options && opt_options.style !== undefined) {
    styleFunction = opt_options.style;
  } else {
    var style = {
      'Point': new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: 'rgba(255,255,0,0.4)'
          }),
          radius: 5,
          stroke: new ol.style.Stroke({
            color: '#ff0',
            width: 1
          })
        })
      }),
      'LineString': new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#f00',
          width: 3
        })
      }),
      'MultiLineString': new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#f00',
          width: 3
        })
      })
    };
    styleFunction = function(feature) {
      return style[feature.getGeometry().getType()];
    };
  }

  this.addVector_(url, new ol.format.GPX(), {
    style: styleFunction,
    reloadInterval: opt_options && opt_options.reloadInterval
  });
};

/**
 * It displays a KML file on the map.
 * @see {@link https://apiv3.geoportail.lu/api/wsgi/proj/1.0/build/apidoc/examples/index.html#example4}
 * @param {string} url Url to the GPX file.
 * @param {luxx.VectorOptions=} opt_options Options.
 * @export
 * @api
 */
lux.Map.prototype.addKML = function(url, opt_options) {
  this.addVector_(url, new ol.format.KML(), opt_options);
};

/**
 * Adds a KML or gpx file on the map
 * @param {string} url Url to the vector file
 * @param {ol.format.GPX|ol.format.KML} format The format.
 * @param {luxx.VectorOptions=} opt_options Options.
 * @private
 */
lux.Map.prototype.addVector_ = function(url, format, opt_options) {

  var popup;
  var vector;

  /**
   * @param {boolean=} opt_time Whether or not to add a timestamp to url.
   */
  function setSource(opt_time) {
    var uri = goog.Uri.parse(url);
    if (opt_time) {
      uri.setParameterValue('salt', (new Date).getTime());
    }
    vector.setSource(new ol.source.Vector({
      url: uri.toString(),
      format: format
    }));
  }

  var options = {};
  if (opt_options && opt_options.style) {
    options.style = opt_options.style;
  }
  this.layersPromise.then(function() {
    vector = new ol.layer.Vector(options);

    var interval = opt_options && opt_options.reloadInterval;
    if (interval) {
      goog.asserts.assertNumber(interval, 'Reload interval must be a number');
      window.setInterval(function() {
        setSource(true);
      }, interval * 1000);
    }
    setSource();
    this.addLayer(vector);

    ol.events.listen(vector.getSource(), ol.source.VectorEventType.ADDFEATURE,
        function() {
          var size = this.getSize();
          goog.asserts.assert(size !== undefined, 'size should be defined');
          this.getView().fit(vector.getSource().getExtent(), size);
        }.bind(this)
    );

    var interaction = new ol.interaction.Select();
    this.addInteraction(interaction);

    interaction.on('select', function(e) {
      if (popup) {
        this.removeOverlay(popup);
      }

      var features = e.target.getFeatures();
      if (!features.getLength()) {
        return;
      }
      var feature = features.getArray()[0];
      var properties = feature.getProperties();

      var html = '<table>';
      var key;
      for (key in properties) {
        if (key != feature.getGeometryName() && properties[key]) {
          html += '<tr><th>';
          html += key;
          html += '</th><td ';
          html += 'title ="';
          html += properties[key] + '">';
          html += properties[key] + '</td></tr>';
        }
      }
      html += '</table>';

      var element = lux.buildPopupLayout(html, function() {
        this.removeOverlay(popup);
        interaction.getFeatures().clear();
      }.bind(this));
      popup = new ol.Overlay({
        element: element,
        position: e.mapBrowserEvent.coordinate,
        positioning: 'bottom-center',
        offset: [0, -20],
        insertFirst: false
      });
      this.addOverlay(popup);

    }.bind(this));

  }.bind(this));
};

/**
 * It loads a MyMaps layer.
 * @see {@link https://apiv3.geoportail.lu/api/wsgi/proj/1.0/build/apidoc/examples/index.html#example8}.
 * @example
 * var map8 = new lux.Map({
 * target: 'map8',
 * bgLayer: 'topo_bw_jpeg',
 * zoom: 12,
 * position: [76825, 75133]
 * });
 * map8.addMyMapLayer({
 *  mapId: '0416ef680fbe4cdaa2d8009262d1127c'
 * });
 * @param {luxx.MyMapOptions} options The options.
 * @export
 * @api
 */
lux.Map.prototype.addMyMapLayer = function(options) {
  Promise.all([this.i18nPromise, this.layersPromise]).then(function() {
    var mymap = new lux.MyMap(options);
    mymap.setMap(this);
  }.bind(this));

  this.stateManager_.setMyMap(options.mapId);
};

/**
 * @param {Object} config The layer's config
 * @param {number} opacity The layer's opacity
 * @return {ol.layer.Tile} The layer.
 * @private
 */
lux.WMTSLayerFactory_ = function(config, opacity) {
  var format = config['imageType'];
  var imageExt = format.split('/')[1];

  var url = '//wmts{1-2}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}/' +
  '{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;


  var layer = new ol.layer.Tile({
    name  : config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new ol.source.WMTS({
      crossOrigin: 'anonymous',
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
    }),
    opacity: opacity
  });

  return layer;
};

/**
 * @param {Object} config The layer's config
 * @param {number} opacity The layer's opacity
 * @return {ol.layer.Image} The layer.
 * @private
 */
lux.WMSLayerFactory_ = function(config, opacity) {
  var url = config.url || '//map.geoportail.lu/main/wsgi/ogcproxywms?';
  var optSource = {
    crossOrigin: 'anonymous',
    url: url,
    params: {
      'FORMAT': config['imageType'],
      'LAYERS': config['layers']
    }
  };
  var layer = new ol.layer.Image({
    name: config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new ol.source.ImageWMS(optSource),
    opacity: opacity
  });

  return layer;
};

/**
 * It geocodes an address. The found position is transmitted to the callback function as parameter.
 * @param {luxx.GeocodeOptions} obj The hash object representing the address to geocode.
 * @param {function(ol.Coordinate)} cb The callback to call. Called with the
 *     position in EPSG:2169 (LUREF) of the geocoded address.
 * @return {Promise.<luxx.GeocodeResponse>} Promise that returns the geocoding response.
 * @example
 * lux.geocode({
 *   queryString: '54 avenue gaston diderich 1420 luxembourg'
 * }, function(position) {
 *	 console.log (position);
 * });
 *
 * @example
 * lux.geocode({
 * num: 54,
 *   street: 'avenue gaston diderich',
 *   zip: 1420,
 *   locality: 'luxembourg'
 * }, function(position) {
 *	console.log (position);
 * });
 * @export
 * @api
 * @static
 * @global
 */
lux.geocode = function(obj, cb) {
  var url = goog.Uri.parse(lux.geocodeUrl);
  goog.asserts.assertObject(obj);
  Object.keys(obj).forEach(function(key) {
    url.setParameterValue(key, obj[key]);
  });
  return /** @type {Promise.<luxx.GeocodeResponse>} */ (fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    goog.asserts.assert(json.results.length, 'No address was found');

    var result = json.results[0];
    if (cb !== undefined) {
      cb.call(null, [result.easting, result.northing]);
    }
  }));
};

/**
 * It returns the most closest address of a given point.
 * @param {ol.Coordinate} coordinate The coordinates to look for an address.
 *     Coordinates must be given in EPSG:2169.
 * @param {function(Object)} cb The callback function to call.
 *    Called with the address represented by [luxx.ReverseGeocodeResult](luxx.html#ReverseGeocodeResult).
 * @return {Promise.<luxx.ReverseGeocodeResponse>} Promise that returns the reverse geocoding response.
 * @example
 * lux.reverseGeocode([75979,75067], function(address) {
 *   var html = [address.number, address.street, address.postal_code + ' ' + address.locality] .join(', ');
 *   console.log(html);console.log(address);
 * });
 * @export
 * @api
 * @static
 * @global
 */
lux.reverseGeocode = function(coordinate, cb) {
  var url = goog.Uri.parse(lux.reverseGeocodeUrl);
  url.setParameterValue('easting', coordinate[0]);
  url.setParameterValue('northing', coordinate[1]);
  return /** @type {Promise.<luxx.ReverseGeocodeResponse>} */ (fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(
      /**
       * @param {luxx.ReverseGeocodeResponse} json The JSON.
       */
      function(json) {
        goog.asserts.assert(json.count, 'No result found');
        if (cb !== undefined) {
          cb.call(null, json.results[0]);
        }
      }
  ));
};

/**
 * @param {Object} evt The event.
 * @private
 */
lux.Map.prototype.handleSingleclickEvent_ = function(evt) {

  if (this.queryPopup_) {
    this.removeOverlay(this.queryPopup_);
  }
  if (this.popupTarget) {
    this.popupTarget.innerHTML = '';
  }
  var layers = this.getLayers().getArray();

  // collect the queryable layers
  var layersToQuery = [];
  layers.forEach(function(layer) {
    var metadata = layer.get('metadata');
    if (metadata && metadata['is_queryable'] && layer.getVisible()) {
      layersToQuery.push(layer.get('id'));
    }
  });

  if (!layersToQuery.length) {
    return;
  }

  var bigBuffer = 20;
  var smallBuffer = 1;

  var lb = ol.proj.transform(
      this.getCoordinateFromPixel(
      [evt.pixel[0] - bigBuffer, evt.pixel[1] + bigBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
  var rt = ol.proj.transform(
      this.getCoordinateFromPixel(
      [evt.pixel[0] + bigBuffer, evt.pixel[1] - bigBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
  var big_box = lb.concat(rt);

  lb = ol.proj.transform(
      this.getCoordinateFromPixel(
      [evt.pixel[0] - smallBuffer, evt.pixel[1] + smallBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
  rt = ol.proj.transform(
      this.getCoordinateFromPixel(
      [evt.pixel[0] + smallBuffer, evt.pixel[1] - smallBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
  var small_box = lb.concat(rt);

  this.getViewport().style.cursor = 'wait';

  var params = {
    'layers': layersToQuery.join(),
    'box1': big_box.join(),
    'box2': small_box.join(),
    'tooltip': 1
  };
  var url = goog.Uri.parse(lux.queryUrl);
  Object.keys(params).forEach(function(key) {
    url.setParameterValue(key, params[key]);
  });
  fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    this.getViewport().style.cursor = '';
    if (!json || !json.length) {
      return;
    }
    // each item in the result corresponds to a layer
    var htmls = [];
    json.forEach(function(resultLayer) {
      resultLayer.features.forEach(function(f) {
        htmls.push(f.attributes['tooltip']);
      });
    }.bind(this));

    if (this.popupTarget) {
      this.popupTarget.innerHTML = htmls.join('');
    } else {
      var element = lux.buildPopupLayout(htmls.join('<hr>'), function() {
        this.removeOverlay(this.queryPopup_);
      }.bind(this));
      this.queryPopup_ = new ol.Overlay({
        element: element,
        position: this.getCoordinateFromPixel([evt.pixel[0], evt.pixel[1]]),
        positioning: 'bottom-center',
        offset: [0, -20],
        insertFirst: false
      });

      this.addOverlay(this.queryPopup_);
      this.renderSync();
    }
  }.bind(this));
};

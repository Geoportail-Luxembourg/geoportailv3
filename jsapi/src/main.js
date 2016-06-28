goog.provide('lux');
goog.provide('lux.Map');

goog.require('goog.dom');
goog.require('lux.LayerManager');
goog.require('ol.events');
goog.require('ol.control.MousePosition');
goog.require('ol.format.GeoJSON');
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
 * @type {string}
 */
lux.searchUrl = 'http://map.geoportail.lu/main/wsgi/fulltextsearch?';

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

  /**
   * @private
   * @type {ol.layer.Tile} The blank layer.
   */
  this.blankLayer_ = new ol.layer.Tile();
  this.blankLayer_.set('name', 'blank');

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
    // background layers selector
    if (options.bgSelector && options.bgSelector.target) {
      this.addBgSelector(options.bgSelector.target);
    }
    delete options.bgSelector;
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
    href : 'http://map.geoportail.lu',
    src  : 'https://www.geoportail.lu/favicon.ico'
  };

  if (options.search && options.search.target) {
    this.addSearch(options.search.target);
    delete options.search;
  }

  goog.base(this, options);

  this.getTargetElement().classList.add('lux-map');

  if (options.layerManager) {
    target = options.layerManager.target;
    el = typeof target === 'string' ?
         document.getElementById(target) :
         target;
    var control = new lux.LayerManager({
      target: el
    });
    this.addControl(control);
  }

  ol.events.listen(this.getLayers(), ol.CollectionEventType.ADD,
      this.checkForExclusion_, this);
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
 * @param {ol.CollectionEventType} event The event.
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
 * @param {string|number} layer The layer id
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
 * @param {Element|string} target Dom element or id of the element to render
 * bgSelector in.
 */
lux.Map.prototype.addBgSelector = function(target) {
  this.promise.then(function() {
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
    container.classList.add('lux-dropdown');
    var select = document.createElement('select');
    select.classList.add('lux-dropdown-select');

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
      option.innerText = background.name;
      if (active == background.name) {
        option.setAttribute('selected', 'selected');
      }
      select.appendChild(option);
    });

    // add blank layer
    var blankOption = document.createElement('option');
    blankOption.value = 'blank';
    blankOption.innerText = 'Blank';
    if (active == 'blank') {
      blankOption.setAttribute('selected', 'selected');
    }
    select.appendChild(blankOption);

    container.appendChild(select);
    el.appendChild(container);

    select.addEventListener('change', function() {
      if (select.value !== 'blank') {
        this.getLayers().setAt(
          0, lux.WMTSLayerFactory_(this.layersConfig[select.value])
        );
      } else {
        this.getLayers().setAt(0, this.blankLayer_);
      }
    }.bind(this));

    // update the selector if blank layer is set (after exclusion)
    ol.events.listen(this.getLayers(), ol.CollectionEventType.ADD,
        function(event) {
          var layer = this.getLayers().getArray()[0];
          if (layer == this.blankLayer_) {
            blankOption.setAttribute('selected', 'selected');
          }
        }, this);

  }.bind(this));
};

/**
 * @param {Element|string} target Dom element or id of the element to render
 * search widget in.
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
  input.setAttribute('placeholder', 'Search addresses');
  container.appendChild(input);
  var clear = document.createElement('button');
  clear.classList.add('lux-search-clear');
  clear.innerHTML = '&times;';
  container.appendChild(clear);

  el.appendChild(container);

  clear.addEventListener('click', function() {
    input.value         = '';
    clear.style.display = '';
  });
  input.addEventListener('keyup', function() {
    clear.style.display = (input.value == '') ? '' : 'block';
  });

  var format = new ol.format.GeoJSON();

  new autoComplete({
    selector  : input,
    minChars  : 2,
    menuClass : 'lux-search-suggestions',
    source    : function(term, suggest) {
      term = term.toLowerCase();
      fetch(lux.searchUrl + 'limit=5&query=' + term).then(function(resp) {
        return resp.json();
      }).then(function(json) {
        suggest(json.features);
      });
    },
    renderItem : function(item, search) {
      var label = item.properties.label;
      search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      var re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi');
      var bbox = (!item.bbox.join) ?
          format.readGeometry(item.geometry).getExtent() : item.bbox;
      return '<div class="autocomplete-suggestion" data-val="' + label + '"' +
          'data-extent="' + bbox.join(',') + '">' +
          label.replace(re, '<b>$1</b>') +
          '</div>';
    },
    onSelect : function(e, term, item) {
      var extent = item.getAttribute('data-extent').split(',').map(parseFloat);
      this.getView().fit(
        ol.geom.Polygon.fromExtent(
          ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857')
        ),
        /** @type {Array<number>} */ (this.getSize()),
        /** @type {olx.view.FitOptions} */ ({
          minResolution: .5
        })
      );
    }.bind(this)
  });

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
    name  : config['name'],
    metadata: config['metadata'],
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
    name: config['name'],
    metadata: config['metadata'],
    source: new ol.source.ImageWMS(optSource)
  });

  return layer;
};

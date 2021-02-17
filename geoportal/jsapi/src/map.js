goog.provide('lux.Map');

goog.require('lux');
goog.require('lux.LayerManager');
goog.require('lux.MyMap');
goog.require('lux.PrintManager');
goog.require('lux.StateManager');
goog.require('lux.MapBoxLayer');
goog.require('ol');
goog.require('ol.array');
goog.require('ol.Map');
goog.require('ol.Overlay');
goog.require('ol.View');
goog.require('ol.control.MousePosition');
goog.require('ol.events');
goog.require('ol.format.GPX');
goog.require('ol.format.GeoJSON');
goog.require('ol.format.KML');
goog.require('ol.geom.Point');
goog.require('ol.interaction.Select');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.extent');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');
goog.require('ol.style.Circle');
goog.require('ol.source.Vector');
goog.require('ol.proj');
goog.require('ol.Collection');
goog.require('ol.asserts');
goog.require('ol.control.Attribution');
goog.require('ol.control');
goog.require('ol.CollectionEventType');
goog.require('ol.MapBrowserEventType');
goog.require('ol.Feature');
goog.require('ol.geom.Polygon');
goog.require('ol.source.VectorEventType');
goog.require('ol.plugins');
goog.require('ol.PluginType');


proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');

/**
 * @type {lux.Piwik}
 * @export
 */
var _paq = [];

_paq.push(['setSiteId', 22]);

(function() {
  var u = 'https://statistics.geoportail.lu/';
  _paq.push(['setTrackerUrl', u + 'piwik.php']);
  var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
  g.type = 'text/javascript'; g.async = true; g.defer = true; g.src = u + 'piwik.js'; s.parentNode.insertBefore(g, s);
})();


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

  this.mvtLayer_ = undefined;
  /**
   * @private
   * @type {Array}
   */
  this.addedKmlLayers_ = [];

  /**
   * @private
   * @type {Array}
   */
  this.addedKmlOnClick_ = [];

  /**
   * @private
   * @type {ol.Overlay | undefined}
   */
  this.lastpopup_ = undefined;
  var layers  = [];
  var layerOpacities = [];
  var layerVisibilities = [];

  var defaultBg = 'basemap_2015_global';

  window['_paq'].push(['trackPageView']);

  /**
   * @private
   * @type {ol.Extent}
   */
  this.featureExtent_ = ol.extent.createEmpty();

  /**
   * @private
   * @type {Array<string|number>|undefined}
   */
  this.queryableLayers_ = options.queryableLayers;
  delete options.queryableLayers;

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

  /**
   * @private
   * @type {boolean}
   */
  this.showLayerInfoPopup_ = options.showLayerInfoPopup ? true : false;

  this.setLanguage(lux.lang);

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
   * @type {lux.LayerManager}
   */
  this.layerManagerControl_ = null;

  /**
   * @type {ol.Extent}
   * @private
   */
  this.maxExtent_ = [2.6, 47.7, 8.6, 51];

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
  layerOpacities.push(1);

  if (options.layers) {
    layers = layers.concat(options.layers);
    delete options.layers;
  }
  if (options.layerOpacities) {
    layerOpacities = layerOpacities.concat(options.layerOpacities);
    console.assert(layers.length === layerOpacities.length,
        'Layers and opacities should have the same number of items');
    delete options.layerOpacities;
  }
  if (options.layerVisibilities) {
    layerVisibilities.push(true);
    layerVisibilities = layerVisibilities.concat(options.layerVisibilities);
    console.assert(layers.length === layerVisibilities.length,
        'Layers and visibility should have the same number of items');
    delete options.layerVisibilities;
  }

  this.layersPromise = fetch(lux.layersUrl).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    this.layersConfig = /** @type {luxx.LayersOptions} */ (json);
    // Replace by mapbox
    this.addLayers_(layers, layerOpacities, layerVisibilities, options);
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
      this.layerManagerControl_ = new lux.LayerManager({
        target: el
      });
      this.addControl(this.layerManagerControl_);
    }
    delete options.layerManager;
    if (options.search && options.search.target) {
      var searchTarget = options.search.target;
      var searchDataSets = options.search.dataSets;
      var onSelect = options.search.onSelect;
      delete options.search;
      this.addSearch(searchTarget, searchDataSets, onSelect);
    }
  }.bind(this));

  if (options.features) {
    var opts = options.features;
    this.showFeatures(opts.layer, opts.ids, opts.click, opts.target, opts.showMarker, opts.maxZoom);
  }

  if (options.view === undefined) {
    options.view = new ol.View({});
  }

  if (options.position) {
    var position = [parseFloat(
      options.position[0]),
      parseFloat(options.position[1])];
    options.view.setCenter(ol.proj.transform(
      position,
      (options.positionSrs) ?
          'EPSG:' + options.positionSrs.toString() : 'EPSG:2169',
      'EPSG:3857'
      ));
    delete options.position;
    delete options.positionSrs;
  }
  if (options.zoom) {
    options.view.setZoom(options.zoom);
    delete options.zoom;
  }

  if (options.view.getCenter() === undefined ||
      options.view.getCenter() === null) {
    options.view.setCenter(ol.proj.fromLonLat([6.215, 49.845]));
  }
  if (options.view.getZoom() === undefined ||
      options.view.getZoom() === null) {
    options.view.setZoom(9);
  }
  var mouseWheelZoom = (options.mouseWheelZoom !== undefined) ? options.mouseWheelZoom : true;
  var interactions = ol.interaction
    .defaults({
      mouseWheelZoom: mouseWheelZoom,
      altShiftDragRotate: false,
      pinchRotate: true,
      constrainResolution: true
    })
    .extend([
      new ol.interaction.DragRotate({
        condition: new URLSearchParams(document.location.search).has('shiftKeyRotate')
          ? ol.events.condition.shiftKeyOnly
          : ol.events.condition.altShiftKeyOnly
      })
    ]);
  options.interactions = interactions;

  var controls;
  if (options.controls !== undefined) {
    if (Array.isArray(options.controls)) {
      controls = new ol.Collection(options.controls.slice());
    } else {
      ol.asserts.assert(options.controls instanceof ol.Collection,
          47); // Expected `controls` to be an array or an `ol.Collection`
      controls = options.controls;
    }
  } else {
    var attribution = new ol.control.Attribution({
      collapsible: false
    });
    var rotate = new ol.control.Rotate();
    controls = ol.control.defaults({attribution: false}).extend(
      [attribution, rotate]
    );
  }

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
    href: 'https://map.geoportail.lu',
    src: 'https://www.geoportail.lu/static/img/favicon-16x16.ico'
  };

  ol.Map.call(this, options);
  ol.plugins.register(ol.PluginType.LAYER_RENDERER, window['MapBoxLayerRenderer']);

  this.getTargetElement().classList.add('lux-map');

  ol.events.listen(this.getLayers(), ol.CollectionEventType.ADD,
      this.checkForExclusion_, this);

  /**
   * @private
   * @type {Element|string|undefined}
   */
  this.popupTarget_ = undefined;

  /**
   * @private
   * @type {string|undefined}
   */
  this.popupClass_ = undefined;

  /**
   * @private
   * @type {function()=|undefined}
   */
  this.popupContentTransformer_ = undefined;
  if (options.popupContentTransformer !== undefined) {
    this.popupContentTransformer_ = options.popupContentTransformer;
    delete options.popupContentTransformer;
  }

  /**
   * @private
   * @type {boolean}
   */
  this.popupAutoPan_ = false;
  if (options.popupAutoPan !== undefined) {
    this.popupAutoPan_ = options.popupAutoPan;
    delete options.popupAutoPan;
  }
  this.setPopupTarget(options.popupTarget, options.popupClassPrefix);

  ol.events.listen(this, ol.MapBrowserEventType.SINGLECLICK,
      this.handleSingleclickEvent_, this);

  this.stateManager_ = new lux.StateManager();
  this.stateManager_.setMap(this);

  this.showLayer_.setMap(this);

  // change cursor on mouseover feature
  ol.events.listen(this, ol.MapBrowserEventType.POINTERMOVE, function(evt) {
    var pixel = this.getEventPixel(evt.originalEvent);
    var hit = this.hasFeatureAtPixel(pixel);
    var pixelHit = this.forEachLayerAtPixel(pixel, function(colors) {
      return true;
    }, this, function(l) {
      return this.getLayers().getArray()[0] !== l;
    }.bind(this), this);
    this.getTargetElement().style.cursor = (hit || pixelHit) ? 'pointer' : '';
  }.bind(this));

  if (options.callback !== undefined) {
    Promise.all([this.i18nPromise, this.layersPromise]).then(function() {
      options.callback.call(this);
    }.bind(this));
  }
};

ol.inherits(lux.Map, ol.Map);

/**
 * Adds the given layer to the top of this map. If you want to add a layer
 * elsewhere in the stack, use `getLayers()` and the methods available on
 * {@link ol.Collection}.
 * @param {ol.layer.Base} layer Layer.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html}
 * @export
 * @api
 */
lux.Map.prototype.addLayer = function(layer) {
  this.layersPromise.then(function() {
    ol.Map.prototype.addLayer.call(this, layer);
  }.bind(this));

};

/**
 * Get the promise to have a map in a ready state.
 * @return {Promise} Promise of a configured map.
 * @export
 * @api
 */
lux.Map.prototype.getMapReadyPromise = function() {
  return Promise.all([this.i18nPromise, this.layersPromise]);
};

/**
 * Prints the current map.
 * @param {string=} name The title of the map.
 * @param {string=} layout The layout of the map.
 * Default is A4 landscape or A4 portrait depending on the map size.
 * Available values are : A4 landscape, A4 portrait, A3 landscape,
 * A3 portrait, A2 landscape, A2 portrait, A1 landscape, A1 portrait,
 * A0 landscape, A0 portrait
 * @param {number=} scale The scale to use.
 * @param {Array<Object>=} firstPagesUrls An array containing urls and
 * type of pages that will be introduced at the beginning of the pdf.
 * Only html and pdf are supported.
 * [{'url': 'http://url1', 'html'},{'url': 'http://url2' 'pdf'}]
 * @param {function()=} callback Optional callback function.
 * @example
 * map.print();
 * @export
 * @api
 */
lux.Map.prototype.print = function(name, layout, scale, firstPagesUrls, callback) {
  var dpi = 127;
  var format = 'pdf';

  var pm = new lux.PrintManager(lux.printUrl, this);
  if (firstPagesUrls === undefined || firstPagesUrls === null) {
    firstPagesUrls = [];
  }
  if (name === undefined || name === null) {
    name = '';
  }
  var curLayout = '';
  if (layout === undefined || layout === null ||
      lux.PrintManager.LAYOUTS.indexOf(layout) === -1) {
    var size = this.getSize();
    if (size !== undefined && size[0] > size[1]) {
      curLayout = 'A4 landscape';
    } else {
      curLayout = 'A4 portrait';
    }
  } else {
    curLayout = layout;
  }
  var dataOwners = [];
  this.getLayers().forEach(function(layer) {
    var source = undefined;
    if (/** @type{Object} */ (layer).getSource instanceof Function) {
      source = /** @type{Object} */ (layer).getSource();
    }
    if (source != undefined) {
      var attributions = source.getAttributions();
      if (attributions !== null) {
        attributions.forEach(function(attribution) {
          dataOwners.push(attribution.getHTML());
        }.bind(this));
      }
    }
  });
  var piwikUrl = 'http://apiv3.geoportail.lu/print/' + curLayout.replace(' ', '/');
  window['_paq'].push(['trackLink', piwikUrl, 'download']);
  dataOwners = dataOwners.filter(function(item, pos, self) {
    return self.indexOf(item) == pos;
  });

  var disclaimer = lux.translate('www.geoportail.lu est un portail d\'accès aux informations géolocalisées, données et services qui sont mis à disposition par les administrations publiques luxembourgeoises. Responsabilité: Malgré la grande attention qu’elles portent à la justesse des informations diffusées sur ce site, les autorités ne peuvent endosser aucune responsabilité quant à la fidélité, à l’exactitude, à l’actualité, à la fiabilité et à l’intégralité de ces informations. Information dépourvue de foi publique. Droits d\'auteur: Administration du Cadastre et de la Topographie. http://g-o.lu/copyright');
  var dateText = lux.translate('Date d\'impression: ');
  var scaleTitle = lux.translate('Echelle approximative 1:');
  var appTitle = lux.translate('Le géoportail national du Grand-Duché du Luxembourg');
  var longUrl = this.stateManager_.getUrl();
  if (longUrl.toLowerCase().indexOf('http') !== 0 &&
      longUrl.toLowerCase().indexOf('//') === 0) {
    longUrl = 'http:' + longUrl;
  }

  if (scale === undefined || scale === null) {
    scale = Math.round(this.getView().getResolution() * 39.3701 * 72);
  }
  var spec = pm.createSpec(scale, dpi, curLayout, format, {
    'disclaimer': disclaimer,
    'scaleTitle': scaleTitle,
    'appTitle': appTitle,
    'scale': scale,
    'name': name,
    'longUrl': longUrl,
    'lang': lux.lang,
    'legend': '',
    'scalebar': {'geodetic': true},
    'dataOwner': dataOwners.join(' '),
    'dateText': dateText,
    'queryResults': null,
    'firstPagesUrls': firstPagesUrls
  });
 // create print report
  pm.createReport(spec).then(
    function(resp) {
      if (resp.status === 200) {
        resp.json().then(function(data) {
          var mfResp = /** @type {MapFishPrintReportResponse} */ (data);
          var ref = mfResp.ref;
          console.assert(ref.length !== 0);
          this.getStatus_(pm, ref, callback);
        }.bind(this));
      }
    }.bind(this));
};

/**
 * @param {lux.PrintManager} pm Print manager.
 * @param {string} ref Ref.
 * @param {function(string)=} callback Optional callback function.
 * @private
 */
lux.Map.prototype.getStatus_ = function(pm, ref, callback) {
  pm.getStatus(ref).then(
    function(resp) {
      if (resp.status === 200) {
        resp.json().then(function(data) {
          var mfResp = /** @type {MapFishPrintStatusResponse} */ (data);
          var done = mfResp.done;
          if (done) {
            // The report is ready. Open it by changing the window location.
            if (mfResp.status !== 'error') {
              window.location.href = pm.getReportUrl(ref);
              if (callback !== undefined) {
                callback.call(this, mfResp.status);
              }
            } else {
              console.log(mfResp.error);
              if (callback !== undefined) {
                callback.call(this, mfResp.status);
              }
            }
          } else {
            window.setTimeout(function() {
              this.getStatus_(pm, ref, callback);
            }.bind(this), 1000);
          }
        });
      }
    }.bind(this)
  );
};

/**
 * Get the layer containing highlighted features.
 * @export
 * @api
 * @return {ol.layer.Vector} The show layer.
 */
lux.Map.prototype.getShowLayer = function() {
  return this.showLayer_;
};

/**
 * @param {string} lang Set the new language.
 * @param {Object} translations Set the new translations.
 * @export
 */
lux.Map.prototype.addNewLanguage = function(lang, translations) {
  lux.languages[lang.toLowerCase()] = translations;
};

/**
 * @param {string} lang Set the language.
 * @export
 * @api
 */
lux.Map.prototype.setLanguage = function(lang) {
  var previousLang = lux.lang;
  if (lang === undefined) {
    lang = lux.lang;
  }
  lux.lang = lang.toLowerCase();
  var curLang = lang.toLowerCase();
  if (curLang in lux.languages) {
    if (this.layerManagerControl_ !== null &&
        this.layerManagerControl_ !== undefined) {
      this.layerManagerControl_.update();
    }
    return;
  }

  var langUrl = lux.i18nUrl.replace(previousLang + '.json', curLang + '.json');
  langUrl = langUrl.replace('xx' + '.json', curLang + '.json');

  this.i18nPromise = fetch(langUrl).then(function(resp) {
    if (resp === null || resp === undefined) {
      throw new Error('Invalid response');
    }
    if (resp.ok) {
      return resp.json();
    }
    throw new Error('' + resp.status + ' ' + resp.statusText);
  }).then(function(json) {
    lux.languages[curLang] = json[curLang];
    if (this.layerManagerControl_ !== null &&
        this.layerManagerControl_ !== undefined) {
      this.layerManagerControl_.update();
    }
  }.bind(this)).catch(function(error) {
    console.log(error);
    lux.lang = previousLang;
  }.bind(this));
};

/**
 * Set the queryable layers. If undefined then use the default value
 * from metadata.
 * @param {Array<string|number>|undefined} queryableLayers An array of
 * queryable layers
 * @export
 * @api
 */
lux.Map.prototype.setQueryableLayers = function(queryableLayers) {
  this.queryableLayers_ = queryableLayers;
};

/**
 * Show a marker on the map at the given location.
 * @param {boolean} show Set to true will allow to display the feature
 * information popup when clicking on an object.
 * @export
 * @api
 */
lux.Map.prototype.showLayerInfoPopup = function(show) {
  this.showLayerInfoPopup_ = show;
};

/**
 * Sets the popup target or undefined to let the api create popup.
 * @param {Element|string|undefined} optPopupTarget The container for map
 * popups, either the element itself or the `id` of the element. Undefined lets
 * the popup be created by the api.
 * @param {string|undefined} optPopupClass The css class of the row.
 * @export
 * @api
 */
lux.Map.prototype.setPopupTarget = function(optPopupTarget, optPopupClass) {
  this.popupTarget_ = typeof optPopupTarget === 'string' ?
      document.getElementById(optPopupTarget) :
      optPopupTarget;
  this.popupClass_ = optPopupClass;
};

/**
 * Show a marker on the map at the given location.
 * @param {luxx.MarkerOptions=} opt_options Config options
 * @return {ol.Overlay} The overlay containing the marker
 * or null if the marker target is not conform.
 * @export
 * @api
 */
lux.Map.prototype.showMarker = function(opt_options) {
  var options = opt_options || {};
  var element = document.createElement('DIV');
  var image = document.createElement('IMG');
  // Overlay compute the position where the image must be displayed using
  // the size of the element. But as the size of the image is only known
  // after the image is loaded, then we have to refresh the map, to be sure
  //  the marker is displayed at the right position.
  image.style.display = 'none';
  image.onload = function() {
    image.style.display = '';
    this.renderSync();
  }.bind(this);

  var el;
  if (options.target) {
    el = typeof options.target === 'string' ?
        document.getElementById(options.target) :
        options.target;
    if (!(el instanceof Element)) {
      console.error('Marker target should be a DOM Element or its id');
      return null;
    }
  }
  image.src = options.iconURL ||
      'https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/icon.png';
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
  var markerOverlay = new ol.Overlay({
    id: options.id,
    element: element,
    position: position,
    positioning: options.positioning || 'center-center'
  });
  this.addOverlay(markerOverlay);

  if (options.autoCenter) {
    this.getView().setCenter(position);
  }
  var canvasContext = document.createElement('canvas').getContext('2d');
  if (options.onClick) {
    ol.events.listen(element, ol.events.EventType.CLICK, options.onClick);
  }
  if (options.html) {
    var popup;
    var showPopupEvent = options.click ?
        ol.events.EventType.CLICK : ol.events.EventType.MOUSEMOVE;
    ol.events.listen(element, showPopupEvent, (function(event) {
      var curMarker = markerOverlay.getElement().firstChild;
      var isTransparent = false;
      if (options.noPopupOnTransparency === true) {
        try {
          if (curMarker instanceof HTMLImageElement) {
            curMarker.crossOrigin = 'Anonymous';
            var x = event.clientX - curMarker.getBoundingClientRect().left;
            var y = event.clientY - curMarker.getBoundingClientRect().top;
            var w = canvasContext.canvas.width = curMarker.width;
            var h = canvasContext.canvas.height = curMarker.height;
            canvasContext.drawImage(curMarker, 0, 0, w, h);
            var data = canvasContext.getImageData(x, y, 1, 1).data;
            // If alpha chanel is lower than 5, then this is transparent.
            isTransparent = data[3] < 5;
          }
        } catch (e) {
          console.log(e);
        }
      }
      if (isTransparent) {
        return;
      }
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
          position: markerOverlay.getPosition(),
          positioning: 'bottom-center',
          offset: [0, -20],
          insertFirst: false
        });
      }
      popup.setPosition(markerOverlay.getPosition());
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
  return markerOverlay;
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


lux.Map.prototype.prependMapBoxBackgroundLayer = function(target, mapBoxStyle, mapBoxStyleXYZ) {

  return new lux.MapBoxLayer({
    'style': mapBoxStyle,
    'xyz': mapBoxStyleXYZ,
    'container': target,
    'label': 'MVT'
  });
};

/**
 * @param {Array<string|number>} layers Array of layer names.
 * @param {Array<number>} opacities Array of layer opacities.
 * @param {Array<boolean>} visibilities Array of layer visibility.
 * @param {Object} options The map options.
 * @private
 */
lux.Map.prototype.addLayers_ = function(layers, opacities, visibilities, options) {

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
    if (layerConf !== null) {
      if (layer == 'basemap_2015_global') {
        if (this.mvtLayer_ === undefined) {
          this.mvtLayer_ = this.MVTLayerFactory_(options);
        }
        this.getLayers().push(this.mvtLayer_);
        return;
      }
      var fn = (layerConf.type.indexOf('WMS') != -1) ?
        lux.WMSLayerFactory : lux.WMTSLayerFactory;
      var opacity = (opacities[index] !== undefined) ? opacities[index] : 1;
      var visible = (visibilities[index] !== undefined) ? visibilities[index] : true;
      this.getLayers().push(fn(layerConf, opacity, visible));
    }
  }.bind(this));
};

lux.Map.prototype.MVTLayerFactory_ = function(options) {
  const target = this.getTargetElement();
  // FIXME: should be taken from the layer config
  // TODO: when config is handled by c2cgeoportal
  // Here we use roadmap_jsapi due to https://jira.camptocamp.com/browse/GSLUX-264
  let mapBoxStyle = 'https://vectortiles.geoportail.lu/styles/roadmap_jsapi/style.json';
  let mapBoxStyleXYZ = 'https://vectortiles.geoportail.lu/styles/roadmap_jsapi/{z}/{x}/{y}.png';
  if (options && options.bgLayerStyle) {
    mapBoxStyle = options.bgLayerStyle;
  }
  if (options && options.bgLayerStyleXYZ) {
    mapBoxStyleXYZ = options.bgLayerStyleXYZ;
  }
  let mvtLayer_ = this.prependMapBoxBackgroundLayer(target, mapBoxStyle, mapBoxStyleXYZ);
  mvtLayer_.set('name', 'basemap_2015_global');
  return (mvtLayer_);
};


/**
 * @param {ol.CollectionEventType} event The event.
 * @private
 */
lux.Map.prototype.checkForExclusion_ = function(event) {
  var layer1 = event.element;

  if (layer1.get('metadata') === undefined) {
    return;
  }

  var exclusion1 = layer1.get('metadata')['exclusion'];


  if (exclusion1 === undefined) {
    return;
  }

  var layers = this.getLayers().getArray();
  var len = layers.length;
  var i;
  var layer2;
  var exclusion2;
  for (i = len - 1; i >= 0; i--) {
    layer2 = layers[i];

    if (layer2 == layer1 || layer2.get('metadata') === undefined ||
        layer2.get('metadata')['exclusion'] === undefined) {
      continue;
    }

    exclusion2 = layer2.get('metadata')['exclusion'];
    if (lux.intersects(exclusion1, exclusion2)) {
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
 * Adds the given layer to the top of this map. If you want to add a layer
 * elsewhere in the stack, use `getLayers()` and the methods available on
 * {@link ol.Collection}.
 * @param {string|number} layer The layer id.
 * @param {number=} opt_opacity The layer opacity. Default is 1.
 * @param {boolean=} opt_visibility The layer visibility. Default is true.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html}
 * @export
 * @api
 */
lux.Map.prototype.addLayerById = function(layer, opt_opacity, opt_visibility) {
  this.layersPromise.then(function(layers) {
    var opacity = (opt_opacity !== undefined) ? opt_opacity : 1;
    var visibility = (opt_visibility === undefined) ? opt_visibility : true;
    this.addLayers_([layer], [opacity], [visibility]);
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
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example3}
 * @param {Element|string} target Dom element or id of the element to render
 * bgSelector in.
 * @param {Array<string|number>|undefined} bglayers Array of overlay layer identifiers.
 * 'blank' acts as blank layer.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html?background}
 * @export
 * @api
 */
lux.Map.prototype.addBgSelector = function(target, bglayers) {
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
      if (bglayers === undefined) {
          return conf[l].isBgLayer;
      }
      if (conf[l].isBgLayer) {
          return bglayers.indexOf(conf[l].id) != -1;
      }
      return false;
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
    var showBlankLayer = true;
    if (bglayers !== undefined && bglayers.indexOf('blank') == -1) {
        showBlankLayer = false;
    }
    if (showBlankLayer) {
        // add blank layer
        var blankOption = document.createElement('option');
        blankOption.value = 'blank';
        blankOption.innerText = lux.translate('blank');
        if (active == 'blank') {
          blankOption.setAttribute('selected', 'selected');
        }
        select.appendChild(blankOption);
    }
    container.appendChild(select);
    el.appendChild(container);

    select.addEventListener('change', function() {
      if (this.mvtLayer_ !== undefined) {
        this.mvtLayer_.setVisible(false);
      }
      if (this.layersConfig[select.value] && this.layersConfig[select.value].name === 'basemap_2015_global') {
        if (this.mvtLayer_ === undefined) {
          this.mvtLayer_ = this.MVTLayerFactory_();
        }
        this.getLayers().setAt(0, this.mvtLayer_);
        this.mvtLayer_.setVisible(true);
      } else if (select.value === 'blank') {
        this.getLayers().setAt(0, this.blankLayer_);
      } else {
        this.getLayers().setAt(
          0, lux.WMTSLayerFactory(this.layersConfig[select.value], 1, true)
        );
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
 * @param {string|number} layer The layer identifier
 * @param {Array<string|number>} ids Array of features identifiers
 * @param {boolean?} opt_click True if click is needed to show popup
 * @param {Element|string|undefined} opt_target Element to render popup content in
 * @param {boolean|undefined} isShowMarker True if a marker has to be displayed.
 * @param {number|undefined} maxZoom The maximum zoom to fit.
 * @export
 * @api
 */
lux.Map.prototype.showFeatures = function(layer, ids, opt_click, opt_target, isShowMarker, maxZoom) {
  // remove any highlighted feature
  this.showLayer_.getSource().clear();
  this.layersPromise.then(function() {
    var lid = this.findLayerConf_(layer).id;
    // check if layer corresponding to feature is shown on the map
    // if so, then highlight the feature
    var visible = this.getLayers().getArray().some(function(l) {
      return l.get('id') === lid;
    });
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    ids.forEach(function(id) {
      var uri = lux.queryUrl + 'fid=' + lid + '_' + id + '&tooltip';
      fetch(uri).then(function(resp) {
        return resp.json();
      }).then(function(json) {
        this.addFeature_(json, visible, opt_click, opt_target,
          (isShowMarker === undefined) ? true : isShowMarker, maxZoom);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * @param {Object} json GeoJSON object
 * @return {Array<ol.Feature>} the features.
 * @private
 */
lux.Map.prototype.readJsonFeatures_ = function(json) {
  var features = [];
  if (json.features != undefined) {
    json.features.forEach(function(f) {
      f.properties = f.attributes;
    });
    features = new ol.format.GeoJSON().readFeatures({
      type: 'FeatureCollection',
      features: json.features
    }, {
      dataProjection: 'EPSG:2169',
      featureProjection: 'EPSG:3857'
    });
  }
  return features;
};

/**
 * @param {Object} json GeoJSON object
 * @param {boolean} highlight Whether or not to highlight the features.
 * @param {boolean?} opt_click True if click is needed to show popup
 * @param {Element|string|undefined} opt_target Element to render popup content in
 * @param {boolean} isShowMarker True if the marker should be shown.
 * @param {number | undefined} maxZoom The maxZoom to fit.
 * @private
 */
lux.Map.prototype.addFeature_ = function(json, highlight, opt_click, opt_target, isShowMarker, maxZoom) {
  var curMaxZoom = (maxZoom !== undefined) ? maxZoom : 17;

  if (json.length === 0) {
    return;
  }
  var tooltip = undefined;

  if ('tooltip' in json[0]) {
    tooltip = json[0]['tooltip'];
  }
  var features = this.readJsonFeatures_(json[0]);
  if (features.length == 0) {
    return;
  }
  var size = this.getSize();
  features.forEach(function(feature) {
    if (isShowMarker) {
      this.showMarker({
        position: ol.extent.getCenter(feature.getGeometry().getExtent()),
        positionSrs: '3857',
        autoCenter: true,
        click: opt_click,
        target: opt_target,
        html: tooltip
      });
    }
    this.featureExtent_ = ol.extent.extend(
      this.featureExtent_,
      feature.getGeometry().getExtent()
    );
    if (size) {
      this.getView().fit(this.featureExtent_, {
        size: size,
        maxZoom: curMaxZoom,
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
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example6}
 * @param {Element|string} target Dom element or id of the element to render search widget in.
 * @param {Array<string>=} dataSets=['Adresse'] Array of layer used as search sources.
 * @param {function(Event, String, Element)=} onSelect Optional function called when result is selected.
 * @export
 * @api
 */
lux.Map.prototype.addSearch = function(target, dataSets, onSelect) {
  var layers = [];
  var searchCoordinates = false;
  if (dataSets !== undefined && dataSets.length > 0) {
    dataSets.forEach(function(layer) {
      if (layer === 'Coordinates') {
        searchCoordinates = true;
      } else {
        if (layer.indexOf('editus_poi') < 0) {
          layers.push(layer);
        }
      }
    });
  }
  if (layers.length === 0) {
    layers.push('Adresse');
  }
  var el = typeof target === 'string' ?
      document.getElementById(target) :
      target;
  if (!(el instanceof Element)) {
    console.error('Search target should be a DOM Element or its id');
    return;
  }
  var selectFunction;
  if (onSelect !== undefined) {
    selectFunction = onSelect;
  } else {
    selectFunction = function(e, term, item, clearButton) {
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
        /** @type {olx.view.FitOptions} */ ({
          size: /** @type {Array<number>} */ (this.getSize()),
          maxZoom: 17
        })
      );
    };
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
    'selector': input,
    'minChars': 2,
    'cache': 0,
    'menuClass': 'lux-search-suggestions',
    'source': function(term, suggest) {
      var coordResults = [];
      if (searchCoordinates) {
        coordResults = this.matchCoordinate_(term);
        suggest(coordResults);
      }
      if (layers.length > 0) {
        term = term.toLowerCase();
        fetch(lux.searchUrl + 'limit=5&layer=' + layers.join(',') + '&query=' + term).then(function(resp) {
          return resp.json();
        }).then(function(json) {
          suggest(coordResults.concat(json.features));
        });
      }
    }.bind(this),
    'renderItem': function(item, search) {
      var label = item.properties.label;
      var layerName = item.properties['layer_name'];
      search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      var re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi');
      var geom = /** @type {ol.geom.Point} */ (format.readGeometry(item.geometry));
      var bbox = (!item['bbox'] || !item['bbox']['join']) ? geom.getExtent() : item['bbox'];
      return '<div class="autocomplete-suggestion" data-val="' + label + '"' +
          ' data-coord="' + geom.getCoordinates().join(',') + '"' +
          ' data-layer="' + layerName + '"' +
          ' data-extent="' + bbox.join(',') + '">' +
          label.replace(re, '<b>$1</b>') +
          '</div>';
    },
    'onSelect': function(e, term, item) {
      selectFunction.call(this, e, term, item, clear);
    }.bind(this)
  });

};

/**
 * @param {string} searchString The search string.
 * @return {Array<ol.Feature>} The result.
 * @private
 */
lux.Map.prototype.matchCoordinate_ = function(searchString) {
  searchString = searchString.replace(/,/gi, '.');
  var results = [];
  var format = new ol.format.GeoJSON();
  var re = {
    'EPSG:2169': {
      regex: /(\d{4,6}[\,\.]?\d{0,3})\s*([E|N])?\W*(\d{4,6}[\,\.]?\d{0,3})\s*([E|N])?/,
      label: 'LUREF',
      epsgCode: 'EPSG:2169'
    },
    'EPSG:4326': {
      regex:
      /(\d{1,2}[\,\.]\d{1,6})\d*\s?(latitude|lat|N|longitude|long|lon|E|east|est)?\W*(\d{1,2}[\,\.]\d{1,6})\d*\s?(longitude|long|lon|E|latitude|lat|N|north|nord)?/i,
      label: 'long/lat WGS84',
      epsgCode: 'EPSG:4326'
    },
    'EPSG:4326:DMS': {
      regex:
      /([NSEW])?(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s?(?:(\d+(?:\.\d+)?)['’‘′:]\s?(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|'')?)?)?\s?([NSEW])?/i,
      label: 'long/lat WGS84 DMS',
      epsgCode: 'EPSG:4326'
    }
  };
  var northArray = ['LATITUDE', 'LAT', 'N', 'NORTH', 'NORD'];
  var eastArray = ['LONGITUDE', 'LONG', 'LON', 'E', 'EAST', 'EST'];
  for (var epsgKey in re) {
    /**
     * @type {Array.<string | undefined>}
     */
    var m = re[epsgKey].regex.exec(searchString);

    if (m !== undefined && m !== null) {
      var epsgCode = re[epsgKey].epsgCode;
      var isDms = false;
      /**
       * @type {number | undefined}
       */
      var easting = undefined;
      /**
       * @type {number | undefined}
       */
      var northing = undefined;
      if (epsgKey === 'EPSG:4326' || epsgKey === 'EPSG:2169') {
        if (m[2] !== undefined && m[2] !== null && m[4] !== undefined && m[4] !== null) {
          if (ol.array.includes(northArray, m[2].toUpperCase()) &&
          ol.array.includes(eastArray, m[4].toUpperCase())) {
            easting = parseFloat(m[3].replace(',', '.'));
            northing = parseFloat(m[1].replace(',', '.'));
          } else if (ol.array.includes(northArray, m[4].toUpperCase()) &&
          ol.array.includes(eastArray, m[2].toUpperCase())) {
            easting = parseFloat(m[1].replace(',', '.'));
            northing = parseFloat(m[3].replace(',', '.'));
          }
        } else if (m[2] === undefined && m[4] === undefined) {
          easting = parseFloat(m[1].replace(',', '.'));
          northing = parseFloat(m[3].replace(',', '.'));
        }
      } else if (epsgKey === 'EPSG:4326:DMS') {
        // Inspired by https://github.com/gmaclennan/parse-dms/blob/master/index.js
        var m1, m2, decDeg1, decDeg2, dmsString2;
        m1 = m;
        if (m1[1]) {
          m1[6] = undefined;
          dmsString2 = searchString.substr(m1[0].length - 1).trim();
        } else {
          dmsString2 = searchString.substr(m1[0].length).trim();
        }
        decDeg1 = this.decDegFromMatch_(m1);
        if (decDeg1 !== undefined) {
          m2 = re[epsgKey].regex.exec(dmsString2);
          decDeg2 = m2 ? this.decDegFromMatch_(m2) : undefined;
          if (decDeg2 !== undefined) {
            if (typeof decDeg1.latLon === 'undefined') {
              if (!isNaN(decDeg1.decDeg) && !isNaN(decDeg2.decDeg)) {
                // If no hemisphere letter but we have two coordinates,
                // infer that the first is lat, the second lon
                decDeg1.latLon = 'lat';
              }
            }
            if (decDeg1.latLon === 'lat') {
              northing = decDeg1.decDeg;
              easting = decDeg2.decDeg;
            } else {
              easting = decDeg1.decDeg;
              northing = decDeg2.decDeg;
            }
            isDms = true;
          }
        }
      }
      if (easting !== undefined && northing !== undefined) {
        var mapEpsgCode = 'EPSG:4326';
        var point = /** @type {ol.geom.Point} */
        (new ol.geom.Point([easting, northing])
       .transform(epsgCode, mapEpsgCode));
        var flippedPoint =  /** @type {ol.geom.Point} */
        (new ol.geom.Point([northing, easting])
       .transform(epsgCode, mapEpsgCode));
        var feature = /** @type {ol.Feature} */ (null);
        if (ol.extent.containsCoordinate(
        this.maxExtent_, point.getCoordinates())) {
          feature = new ol.Feature(point);
        } else if (epsgCode === 'EPSG:4326' && ol.extent.containsCoordinate(
        this.maxExtent_, flippedPoint.getCoordinates())) {
          feature = new ol.Feature(flippedPoint);
        }
        if (feature !== null) {
          var resultPoint =
            /** @type {ol.geom.Point} */ (feature.getGeometry());
          var resultString = lux.coordinateString_(
          resultPoint.getCoordinates(), mapEpsgCode, epsgCode, isDms, false);
          feature.set('label', resultString);
          feature.set('epsgLabel', re[epsgKey].label);
          results.push(format.writeFeatureObject(feature));
        }
      }
    }
  }
  return results; //return empty array if no match
};

/**
 * @param {Array.<string | undefined>} m The matched result.
 * @return {Object | undefined} Returns the coordinate.
 * @private
 */
lux.Map.prototype.decDegFromMatch_ = function(m) {
  var signIndex = {
    '-': -1,
    'N': 1,
    'S': -1,
    'E': 1,
    'W': -1
  };

  var latLonIndex = {
    'N': 'lat',
    'S': 'lat',
    'E': 'lon',
    'W': 'lon'
  };

  var sign;
  sign = signIndex[m[2]] || signIndex[m[1]] || signIndex[m[6]] || 1;
  if (m[3] === undefined) {
    return undefined;
  }

  var degrees, minutes = 0, seconds = 0, latLon;
  degrees = Number(m[3]);
  if (m[4] !== undefined) {
    minutes = Number(m[4]);
  }
  if (m[5] !== undefined) {
    seconds = Number(m[5]);
  }
  latLon = latLonIndex[m[1]] || latLonIndex[m[6]];

  return {
    decDeg: sign * (degrees + minutes / 60 + seconds / 3600),
    latLon: latLon
  };
};

/**
 * It displays a GPX file on the map.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example4}
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
    reloadInterval: opt_options && opt_options.reloadInterval,
    click: opt_options.click,
    target: opt_options.target,
    fit: opt_options && opt_options.fit
  });
};

/**
 * It displays a KML file on the map.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example4}
 * @param {string} url Url to the KML file.
 * @param {luxx.VectorOptions=} opt_options Options.
 * @export
 * @api
 */
lux.Map.prototype.addKML = function(url, opt_options) {
  this.addVector_(url, new ol.format.KML(), opt_options);
};

/**
 * It displays a GeoJSON file on the map.
 * @param {string} url Url to the GeoJSON file.
 * @param {luxx.VectorOptions=} opt_options Options.
 * @export
 * @api
 */
lux.Map.prototype.addGeoJSON = function(url, opt_options) {
  this.addVector_(url, new ol.format.GeoJSON(), opt_options);
};

/**
 * Adds a KML or gpx file on the map
 * @param {string} url Url to the vector file
 * @param {ol.format.GPX|ol.format.KML|ol.format.GeoJSON} format The format.
 * @param {luxx.VectorOptions=} opt_options Options.
 * @private
 */
lux.Map.prototype.addVector_ = function(url, format, opt_options) {
  var popup;
  var vector;
  var el;
  var fit = true;
  if (opt_options && opt_options.fit === undefined) {
    fit = true;
  }
  if (opt_options && opt_options.fit === false) {
    fit = false;
  }
  if (opt_options.target) {
    el = typeof opt_options.target === 'string' ?
        document.getElementById(opt_options.target) :
        opt_options.target;
  }
  /**
   * @param {boolean=} opt_time Whether or not to add a timestamp to url.
   */
  function setSource(opt_time) {
    var uri = document.createElement('A');
    uri.href = url;

    if (opt_time) {
      uri.search = 'salt=' + (new Date).getTime();
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
  if (opt_options && opt_options.name) {
    options.name = opt_options.name;
  }
  this.layersPromise.then(function() {
    vector = new ol.layer.Vector(options);

    var interval = opt_options && opt_options.reloadInterval;
    if (interval) {
      console.assert(typeof interval === 'number', 'Reload interval must be a number');
      window.setInterval(function() {
        setSource(true);
      }, interval * 1000);
    }
    setSource();
    this.addLayer(vector);
    this.addedKmlLayers_.push(vector);
    this.addedKmlOnClick_.push(opt_options.onClick);
    if (fit) {
      ol.events.listen(vector.getSource(), ol.source.VectorEventType.ADDFEATURE,
          function() {
            var size = this.getSize();
            console.assert(size !== undefined, 'size should be defined');
            this.getView().fit(vector.getSource().getExtent(), {size: size});
          }.bind(this)
      );
    }

    if (opt_options && opt_options.click) {
      var interaction = new ol.interaction.Select({
        layers: this.addedKmlLayers_
      });
      this.addInteraction(interaction);
      if (opt_options.onClick) {
        interaction.on('select', function(e) {
          var features = e.target.getFeatures();
          var curLayer = interaction.getLayer(features.getArray()[0]);
          for (var iLayer = 0; iLayer < this.addedKmlLayers_.length; iLayer++) {
            if (this.addedKmlLayers_[iLayer] == curLayer) {
              this.addedKmlOnClick_[iLayer].call(null, features, e.mapBrowserEvent.coordinate);
            }
          }
          interaction.getFeatures().clear();
        }.bind(this));
      } else {
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
              html += '</th><td>';
              html += properties[key] + '</td></tr>';
            }
          }
          html += '</table>';
          if (opt_options.target) {
            el.innerHTML = html;
            return;
          }
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
      }
    }
  }.bind(this));
};

/**
 * It shows a popup.
 * @param {ol.Coordinate} position The position of the popup.
 * @param {string} title The popup title.
 * @param {string} content The popup content.
 * @return {ol.Overlay} The popup overlay.
 * @export
 * @api
 */
lux.Map.prototype.showPopup = function(position, title, content) {
  var popup;
  var element = lux.buildPopupLayout(content, function() {
    if (popup !== undefined) {
      this.removeOverlay(popup);
    }
  }.bind(this), title);
  popup = new ol.Overlay({
    element: element,
    position: position,
    positioning: 'bottom-center',
    offset: [0, -20],
    insertFirst: false
  });
  this.addOverlay(popup);
  if (this.lastpopup_ !== undefined) {
    this.removeOverlay(this.lastpopup_);
  }
  this.lastpopup_ = popup;
  return popup;
};

/**
 * It loads a MyMaps layer.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example8}.
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
 * @return {Promise} Promise of the mymaps object.
 * @export
 * @api
 */
lux.Map.prototype.addMyMapLayer = function(options) {
  if (options.mapId !== undefined) {
    this.stateManager_.setMyMap(options.mapId);
  }
  return Promise.all([this.i18nPromise, this.layersPromise]).then(function() {
    var mymap = new lux.MyMap(options);
    mymap.setMap(this);
    return mymap;
  }.bind(this));
};


/**
 * Get the popup overlay.
 * @return {ol.Overlay} The popup overlay.
 * @export
 */
lux.Map.prototype.getPopupOverlay = function() {
  return this.queryPopup_;
};


/**
 * Removes the popup or the information content.
 * @export
 */
lux.Map.prototype.removeInfoPopup = function() {
  if (this.queryPopup_) {
    this.removeOverlay(this.queryPopup_);
  }
  if (this.popupTarget_) {
    this.popupTarget_.innerHTML = '';
  }
};


/**
 * @param {string|number} layer Layer id
 * @param {Array<string|number>} ids The ids to retrieve.
 * @param {function(Object)} callback The function to call.
 * @export
 */
lux.Map.prototype.getFeatureInfoByIds = function(layer, ids, callback) {

  this.layersPromise.then(function() {
    var lid = this.findLayerConf_(layer).id;
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    ids.forEach(function(id) {
      var uri = lux.queryUrl + 'fid=' + lid + '_' + id + '&tooltip';
      fetch(uri).then(function(resp) {
        return resp.json();
      }).then(function(json) {
        callback.call(this, json);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

/**
 * @param {Object} evt The click event.
 * @param {function(?)} callback The function to call.
 * @export
 */
lux.Map.prototype.getFeatureInfo = function(evt, callback) {
  var layers = this.getLayers().getArray();

  // collect the queryable layers
  var layersToQuery = [];
  if (this.queryableLayers_ === undefined) {
    layers.forEach(function(layer) {
      var metadata = layer.get('metadata');
      if (metadata && metadata['is_queryable'] === true &&
          layer.getVisible() && layer.getOpacity() > 0) {
        layersToQuery.push(layer.get('id'));
      }
    });
  } else {
    this.queryableLayers_.forEach(function(layer) {
      var layerConf = this.findLayerConf_(layer);
      if (layerConf !== null) {
        layersToQuery.push(layerConf.id);
      }
    }.bind(this));
  }

  if (!layersToQuery.length) {
    callback.call(this, []);
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
  var size = this.getSize();
  var extent = this.getView().calculateExtent(size);

  var bbox = extent.join(',');
  var params = {
    'layers': layersToQuery.join(),
    'box1': big_box.join(),
    'box2': small_box.join(),
    'BBOX': bbox,
    'WIDTH': size[0],
    'HEIGHT': size[1],
    'X': evt.pixel[0],
    'Y': evt.pixel[1],
    'tooltip': 1,
    'lang': lux.lang,
    'srs': 'EPSG:3857'
  };
  var url = document.createElement('A');
  url.href = lux.queryUrl;

  Object.keys(params).forEach(function(key) {
    url.search = url.search + '&' + key + '=' + params[key];
  });
  fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    this.getViewport().style.cursor = '';
    callback.call(this, json);
  }.bind(this));
};

/**
 * @param {ol.style.Style|Array.<ol.style.Style>|ol.StyleFunction|null|undefined}
 *      style The style of the show layer.
 * @export
 * @api
 */
lux.Map.prototype.setShowlayerStyle = function(style) {
  this.showLayer_.setStyle(style);
};

/**
 * @param {Object} evt The event.
 * @private
 */
lux.Map.prototype.handleSingleclickEvent_ = function(evt) {
  this.removeInfoPopup();
  if (!this.showLayerInfoPopup_) {
    return;
  }
  this.showLayer_.getSource().clear();
  this.getFeatureInfo(evt, function(json) {
    if (!json || !json.length) {
      this.showLayer_.getSource().clear();
      return;
    }
    // each item in the result corresponds to a layer
    var htmls = [];
    json.forEach(function(resultLayer) {
      var curHtml = undefined;
      if ('tooltip' in resultLayer) {
        if (this.popupTarget_ !== undefined && this.popupClass_ !== undefined) {
          curHtml = '<div class="' + this.popupClass_ +
            '_' + resultLayer['layer'] + '">' +
            resultLayer['tooltip'] + '</div>';
        } else{
          curHtml = resultLayer['tooltip'];
        }
      }
      var features = this.readJsonFeatures_(resultLayer);
      if (features.length != 0) {
        this.showLayer_.getSource().addFeatures(features);
        if (this.popupContentTransformer_ !== undefined) {
          curHtml = this.popupContentTransformer_.call(this, resultLayer, features, curHtml);
        }
      }
      if (curHtml !== undefined) {
        htmls.push(curHtml);
      }
    }.bind(this));

    if (this.popupTarget_) {
      this.popupTarget_.innerHTML = htmls.join('');
    } else {
      var element = lux.buildPopupLayout(htmls.join('<hr>'), function() {
        this.removeOverlay(this.queryPopup_);
      }.bind(this));
      this.queryPopup_ = new ol.Overlay({
        element: element,
        position: this.getCoordinateFromPixel([evt.pixel[0], evt.pixel[1]]),
        positioning: 'bottom-center',
        offset: [0, -20],
        insertFirst: false,
        autoPan: this.popupAutoPan_
      });
      this.addOverlay(this.queryPopup_);
      this.renderSync();
      this.queryPopup_.setPosition(this.getCoordinateFromPixel([evt.pixel[0], evt.pixel[1]]));
    }
  }.bind(this));

};

/**
 * Set the center of the current view in EPSG:2169.
 * @param {ol.Coordinate} coordinate The coordinate of the center.
 * @param {number|undefined} zoom The zoom numer.
 * @param {string|number|undefined} positionSrs The projection of the position coordinates.
 * Default is `2169`.
 * @export
 * @api
 */
lux.Map.prototype.setCenter = function(coordinate, zoom, positionSrs) {
  var lonlat = /** @type {ol.Coordinate} */
        (ol.proj.transform(coordinate,
            (positionSrs !== undefined) ? 'EPSG:' + positionSrs.toString() : 'EPSG:2169', 'EPSG:3857'));
  this.getView().setCenter(lonlat);
  if (zoom !== undefined) {
    this.getView().setZoom(zoom);
  }
};

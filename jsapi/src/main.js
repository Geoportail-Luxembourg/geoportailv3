goog.provide('lux');
goog.provide('lux.Map');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.Timer');
goog.require('lux.LayerManager');
goog.require('lux.MyMap');
goog.require('lux.PrintManager');
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
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');


proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');

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
  g.type = 'text/javascript'; g.async = true; g.defer = true; g.src = u + 'piwik.js'; s.parentNode.insertBefore(g, s);
})();

/**
 * @type {string}
 */
lux.requestScheme = 'http';

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
 * @type {string}
 */
lux.exportCsvUrl = 'profile/echocsv';

/**
 * @type {string?}
 */
lux.baseUrl = null;

/**
 * @type {Object}
 * @export
 */
lux.languages = {};

/**
 * @type {string?}
 */
lux.wmtsCrossOrigin = 'anonymous';

/**
 * Sets the basic url of the rest services such as :
 * <lu><li>Search service</li>
 * <li>Mymaps service</li>
 * <li>Mymaps service</li>
 * <li>Elevation service</li>
 * <li>Geocoding service</li>
 * <li>Reverse geocoding service</li>
 * </lu>
 * @param {string | null} url Base url to services. Default is //apiv3.geoportail.lu/
 * @param {string | undefined} requestScheme The request scheme. Default is http.
 * @export
 */
lux.setBaseUrl = function(url, requestScheme) {
  if (requestScheme !== undefined) {
    lux.requestScheme = requestScheme;
  }

  if (!url) {
    lux.layersUrl = '../layers.json';
    lux.i18nUrl = '../lang_xx.json';

    url = '//apiv3.geoportail.lu/';
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
  lux.exportCsvUrl = url + lux.exportCsvUrl;
  lux.printUrl = url + lux.printUrl;
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
 * @type {string}
 */
lux.printUrl = 'printproxy';

/**
 * @param {string} url Url to jsapilayers service.
 * @export
 * @api
 */
lux.setLayersUrl = function(url) {
  lux.layersUrl = url;
};

/**
 * @param {string?} crossorigin The crossorigin header. Default is anonymous.
 * @export
 * @api
 */
lux.setWmtsCrossOrigin = function(crossorigin) {
  lux.wmtsCrossOrigin = crossorigin;
};

/**
 * @type {string}
 */
lux.i18nUrl = 'proj/api/build/locale/xx/geoportailv3.json';

/**
 * @type {string}
 */
lux.lang = 'fr';

/**
 * @type {Array<number>?}
 */
lux.popupSize = null;


/**
 * Returns the translated string if available.
 * @param {string} text The text to translate.
 * @return {string} The translated text.
 * @export
 */
lux.translate = function(text) {
  if (lux.lang in lux.languages) {
    return lux.languages[lux.lang][text] || text;
  }
  return text;
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
  if (options.layerVisibilities) {
    layerVisibilities.push(true);
    layerVisibilities = layerVisibilities.concat(options.layerVisibilities);
    goog.asserts.assert(layers.length == layerVisibilities.length,
        'Layers and visibility should have the same number of items');
    delete options.layerVisibilities;
  }

  this.layersPromise = fetch(lux.layersUrl).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    this.layersConfig = /** @type {luxx.LayersOptions} */ (json);
    this.addLayers_(layers, layerOpacities, layerVisibilities);
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
    this.showFeatures(opts.layer, opts.ids, opts.click, opts.target, opts.showMarker);
  }

  if (options.view === undefined) {
    options.view = new ol.View();
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
    controls = ol.control.defaults();
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
    href: '//map.geoportail.lu',
    src: '//www.geoportail.lu/favicon.ico'
  };


  goog.base(this, options);

  this.getTargetElement().classList.add('lux-map');

  ol.events.listen(this.getLayers(), ol.CollectionEventType.ADD,
      this.checkForExclusion_, this);

  /**
   * @private
   * @type {Element|string|undefined}
   */
  this.popupTarget_ = undefined;
  this.setPopupTarget(options.popupTarget);

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

goog.inherits(lux.Map, ol.Map);

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
 * @example
 * map.print();
 * @export
 * @api
 */
lux.Map.prototype.print = function(name, layout, scale, firstPagesUrls) {
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
  var piwikUrl =
    goog.string.buildString('http://',
    'apiv3.geoportail.lu/print/',
    curLayout.replace(' ', '/'));
  window['_paq'].push(['trackLink', piwikUrl, 'download']);

  goog.array.removeDuplicates(dataOwners);
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
          goog.asserts.assert(ref.length > 0);
          this.getStatus_(pm, ref);
        }.bind(this));
      }
    }.bind(this));
};

/**
 * @param {lux.PrintManager} pm Print manager.
 * @param {string} ref Ref.
 * @private
 */
lux.Map.prototype.getStatus_ = function(pm, ref) {
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
            } else {
              console.log(mfResp.error);
            }
          } else {
            goog.Timer.callOnce(function() {
              this.getStatus_(pm, ref);
            }, 1000, this);
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
  var langUrl = lux.i18nUrl.replace('xx', curLang);
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
 * @export
 * @api
 */
lux.Map.prototype.setPopupTarget = function(optPopupTarget) {
  this.popupTarget_ = typeof optPopupTarget === 'string' ?
      document.getElementById(optPopupTarget) :
      optPopupTarget;
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
  var element = goog.dom.createDom(goog.dom.TagName.DIV);
  var image = goog.dom.createDom(goog.dom.TagName.IMG);
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
  var markerOverlay = new ol.Overlay({
    element: element,
    position: position,
    positioning: options.positioning || 'center-center'
  });
  this.addOverlay(markerOverlay);

  if (options.autoCenter) {
    this.getView().setCenter(position);
  }
  var canvasContext = document.createElement('canvas').getContext('2d');
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
 * @param {Array<string|number>} layers Array of layer names.
 * @param {Array<number>} opacities Array of layer opacities.
 * @param {Array<boolean>} visibilities Array of layer visibility.
 * @private
 */
lux.Map.prototype.addLayers_ = function(layers, opacities, visibilities) {

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
      var fn = (layerConf.type.indexOf('WMS') != -1) ?
        lux.WMSLayerFactory_ : lux.WMTSLayerFactory_;
      var opacity = goog.isDef(opacities[index]) ? opacities[index] : 1;
      var visible = goog.isDef(visibilities[index]) ? visibilities[index] : true;
      this.getLayers().push(fn(layerConf, opacity, visible));
    }
  }.bind(this));
};

/**
 * @param {ol.CollectionEventType} event The event.
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
 * @param {boolean=} opt_visibility The layer visibility. Default is true.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html}
 * @export
 * @api
 */
lux.Map.prototype.addLayerById = function(layer, opt_opacity, opt_visibility) {
  this.layersPromise.then(function() {
    var opacity = goog.isDef(opt_opacity) ? opt_opacity : 1;
    var visibility = goog.isDef(opt_visibility) ? opt_visibility : true;
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
          0, lux.WMTSLayerFactory_(this.layersConfig[select.value], 1, true)
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
 * @param {string|number} layer The layer identifier
 * @param {Array<string|number>} ids Array of features identifiers
 * @param {boolean?} opt_click True if click is needed to show popup
 * @param {Element|string|undefined} opt_target Element to render popup content in
 * @param {boolean|undefined} isShowMarker True if a marker has to be displayed.
 * @export
 * @api
 */
lux.Map.prototype.showFeatures = function(layer, ids, opt_click, opt_target, isShowMarker) {
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
        this.addFeature_(json, visible, opt_click, opt_target,
          (isShowMarker === undefined) ? true : isShowMarker);
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
 * @private
 */
lux.Map.prototype.addFeature_ = function(json, highlight, opt_click, opt_target, isShowMarker) {

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
    selectFunction = function(e, term, item) {
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
      selectFunction.call(this, e, term, item);
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

    if (goog.isDefAndNotNull(m)) {
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
        if (goog.isDefAndNotNull(m[2]) && goog.isDefAndNotNull(m[4])) {
          if (goog.array.contains(northArray, m[2].toUpperCase()) &&
          goog.array.contains(eastArray, m[4].toUpperCase())) {
            easting = parseFloat(m[3].replace(',', '.'));
            northing = parseFloat(m[1].replace(',', '.'));
          } else if (goog.array.contains(northArray, m[4].toUpperCase()) &&
          goog.array.contains(eastArray, m[2].toUpperCase())) {
            easting = parseFloat(m[1].replace(',', '.'));
            northing = parseFloat(m[3].replace(',', '.'));
          }
        } else if (!goog.isDef(m[2]) && !goog.isDef(m[4])) {
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
        if (!goog.isNull(feature)) {
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
    target: opt_options.target
  });
};

/**
 * It displays a KML file on the map.
 * @see {@link https://apiv3.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example4}
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
  var el;
  if (opt_options.target) {
    el = typeof opt_options.target === 'string' ?
        document.getElementById(opt_options.target) :
        opt_options.target;
  }
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
  if (opt_options && opt_options.name) {
    options.name = opt_options.name;
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
          this.getView().fit(vector.getSource().getExtent(), {size: size});
        }.bind(this)
    );
    if (opt_options && opt_options.click) {
      var interaction = new ol.interaction.Select({
        layers: [vector]
      });
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
  }.bind(this));
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
 * @param {Object} config The layer's config.
 * @param {number} opacity The layer's opacity.
 * @param {boolean} visible The layer's visibility.
 * @return {ol.layer.Tile} The layer.
 * @private
 */
lux.WMTSLayerFactory_ = function(config, opacity, visible) {
  var format = config['imageType'];
  var imageExt = format.split('/')[1];

  var isHiDpi = window.matchMedia(
              '(-webkit-min-device-pixel-ratio: 2), ' +
              '(min-device-pixel-ratio: 2), ' +
              '(min-resolution: 192dpi)'
      ).matches;

  var retina = isHiDpi && config['metadata']['hasRetina'] === 'true';

  var retinaExtension = (retina ? '_hd' : '');
  var url = 'http://wmts{1-2}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
  retinaExtension +
  '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;

  if (lux.requestScheme === 'https') {
    url = 'https://wmts{3-4}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
    retinaExtension +
    '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;
  }
  var projection = ol.proj.get('EPSG:3857');
  var extent = projection.getExtent();

  var layer = new ol.layer.Tile({
    name: config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new ol.source.WMTS({
      crossOrigin: lux.wmtsCrossOrigin,
      url: url,
      tilePixelRatio: (retina ? 2 : 1),
      layer: config['name'],
      matrixSet: 'GLOBAL_WEBMERCATOR_4_V3' + (retina ? '_HD' : ''),
      format: format,
      requestEncoding: ol.source.WMTSRequestEncoding.REST,
      projection: projection,
      tileGrid: new ol.tilegrid.WMTS({
        origin: [
          -20037508.3428, 20037508.3428
        ],
        extent: extent,
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
    opacity: opacity,
    visible: visible
  });

  return layer;
};

/**
 * @param {Object} config The layer's config.
 * @param {number} opacity The layer's opacity.
 * @param {boolean} visible The layer's visibility.
 * @return {ol.layer.Image} The layer.
 * @private
 */
lux.WMSLayerFactory_ = function(config, opacity, visible) {
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
    opacity: opacity,
    visible: visible
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
 * @param {Object} evt The event.
 * @private
 */
lux.Map.prototype.handleSingleclickEvent_ = function(evt) {
  this.removeInfoPopup();
  if (!this.showLayerInfoPopup_) {
    return;
  }

  var layers = this.getLayers().getArray();

  // collect the queryable layers
  var layersToQuery = [];
  if (this.queryableLayers_ === undefined) {
    layers.forEach(function(layer) {
      var metadata = layer.get('metadata');
      if (metadata && metadata['is_queryable'] === 'true' &&
          layer.getVisible()) {
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
    'tooltip': 1,
    'lang': lux.lang
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
      if ('tooltip' in resultLayer) {
        htmls.push(resultLayer['tooltip']);
      }
      var features = this.readJsonFeatures_(resultLayer);
      this.showLayer_.getSource().clear();
      if (features.length != 0) {
        this.showLayer_.getSource().addFeatures(features);
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
        insertFirst: false
      });

      this.addOverlay(this.queryPopup_);
      this.renderSync();
    }
  }.bind(this));
};

/**
 * @param {ol.Coordinate} coordinate The coordinate.
 * @param {string} sourceEpsgCode The source epsg.
 * @param {string} targetEpsgCode The target epsg.
 * @param {boolean} opt_DMS True if DMS.
 * @param {boolean} opt_DMm True if Degree decimal minutes.
 * @return {string} The coordinate string.
 */
lux.coordinateString_ = function(coordinate, sourceEpsgCode,
    targetEpsgCode, opt_DMS, opt_DMm) {
  var str = '';
  if (targetEpsgCode === 'EPSG:3263*') {
    var lonlat = /** @type {ol.Coordinate} */
        (ol.proj.transform(coordinate, sourceEpsgCode, 'EPSG:4326'));
    targetEpsgCode = Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
  }

  coordinate = ol.proj.transform(coordinate, sourceEpsgCode, targetEpsgCode);

  switch (targetEpsgCode) {
    default:
    case 'EPSG:2169':
      str = ol.coordinate.format(coordinate, '{x} E | {y} N', 0);
      break;
    case 'EPSG:4326':
      if (opt_DMS) {
        var hdms = lux.toStringHDMS_(coordinate);
        var yhdms = hdms.split(' ').slice(0, 4).join(' ');
        var xhdms = hdms.split(' ').slice(4, 8).join(' ');
        str = xhdms + ' | ' + yhdms;
      } else if (opt_DMm) {
        var hdmm = lux.toStringHDMm_(coordinate);
        var yhdmm = hdmm.split(' ').slice(0, 3).join(' ');
        var xhdmm = hdmm.split(' ').slice(3, 6).join(' ');
        str = xhdmm + ' | ' + yhdmm;
      } else {
        str = ol.coordinate.format(coordinate, ' {x} E | {y} N', 5);
      }
      break;
    case 'EPSG:32632':
      str = ol.coordinate.format(coordinate, '{x} | {y} (UTM32N)', 0);
      break;
    case 'EPSG:32631':
      str = ol.coordinate.format(coordinate, '{x} | {y} (UTM31N)', 0);
      break;
  }
  return str;
};

/**
 * @private
 * @param {ol.Coordinate|undefined} coordinate Coordinate.
 * @return {string} Hemisphere, degrees, minutes and seconds.
 */
lux.toStringHDMS_ = function(coordinate) {
  if (goog.isDef(coordinate)) {
    return lux.degreesToStringHDMS_(coordinate[1], 'NS') + ' ' +
        lux.degreesToStringHDMS_(coordinate[0], 'EW');
  } else {
    return '';
  }
};

/**
 * @private
 * @param {ol.Coordinate|undefined} coordinate Coordinate.
 * @return {string} Hemisphere, degrees, decimal minutes.
 */
lux.toStringHDMm_ = function(coordinate) {
  if (goog.isDef(coordinate)) {
    return lux.degreesToStringHDMm_(coordinate[1], 'NS') + ' ' +
        lux.degreesToStringHDMm_(coordinate[0], 'EW');
  } else {
    return '';
  }
};

/**
 * @private
 * @param {number} degrees Degrees.
 * @param {string} hemispheres Hemispheres.
 * @return {string} String.
 */
lux.degreesToStringHDMS_ = function(degrees, hemispheres) {
  var normalizedDegrees = goog.math.modulo(degrees + 180, 360) - 180;
  var x = Math.abs(3600 * normalizedDegrees);
  return Math.floor(x / 3600) + '\u00b0 ' +
      goog.string.padNumber(Math.floor((x / 60) % 60), 2) + '\u2032 ' +
      goog.string.padNumber(Math.floor(x % 60), 2) + ',' +
      Math.floor((x - (x < 0 ? Math.ceil(x) : Math.floor(x))) * 10) +
      '\u2033 ' + hemispheres.charAt(normalizedDegrees < 0 ? 1 : 0);
};

/**
 * @private
 * @param {number} degrees Degrees.
 * @param {string} hemispheres Hemispheres.
 * @return {string} String.
 */
lux.degreesToStringHDMm_ = function(degrees, hemispheres) {
  var normalizedDegrees = goog.math.modulo(degrees + 180, 360) - 180;
  var x = Math.abs(3600 * normalizedDegrees);
  var dd = x / 3600;
  var m = (dd - Math.floor(dd)) * 60;

  var res = Math.floor(dd) + '\u00b0 ' +
      goog.string.padNumber(Math.floor(m), 2) + ',' +
      Math.floor((m - Math.floor(m)) * 100000) +
      '\u2032 ' + hemispheres.charAt(normalizedDegrees < 0 ? 1 : 0);
  return res;
};

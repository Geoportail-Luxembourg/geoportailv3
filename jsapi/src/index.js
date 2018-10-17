goog.provide('lux');

goog.require('ol.events');
goog.require('ol.events.EventType');
goog.require('ol.proj');
goog.require('ol.layer.Tile');
goog.require('ol.source.WMTS');
goog.require('ol.source.WMTSRequestEncoding');
goog.require('ol.tilegrid.WMTS');
goog.require('ol.layer.Image');
goog.require('ol.source.ImageWMS');
goog.require('ol.coordinate');

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

    url = 'https://apiv3.geoportail.lu/';
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
  lux.pagUrl = url + lux.pagUrl;
  lux.baseUrl = url;
};

/**
 * @type {string}
 */
lux.pagUrl = 'pag';

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
 * Notify a text to the user.
 * @param {string} msg The message to notify.
 * @api
 */
lux.notify = function(msg) {
  alert(msg);
};

/**
 * Builds the popup layout.
 * @param {string|goog.dom.Appendable} html The HTML/text or DOM Element to put
 *    into the popup.
 * @param {function()=} closeCallback Optional callback function. If set a close
 *    button is added.
 * @param {string} title The  popup title.
 * @return {Element} The created element.
 * @export
 * @api
 */
lux.buildPopupLayout = function(html, closeCallback, title) {
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
    if (title !== undefined) {
      header.innerHTML = title;
    }
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
      attributions: [''],
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
  var url = config.url || 'https://map.geoportail.lu/main/wsgi/ogcproxywms?';
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

/**
 * Generate and send the repport.
 * @param {string} ids The ids.
 * @param {string} mail The email.
 * @param {boolean} eula Has user accepted the end user licence agreement?.
 * @export
 */
lux.generatePagRepport = function(ids, mail, eula) {
  var msg = lux.translate('Votre rapport est en train d\'être généré. Un email vous sera envoyé dès qu\'il sera disponible');
  var re = /^\S+@\S+\.\S+$/;
  if (mail.length === 0 || !re.test(mail)) {
    msg = lux.translate('Veuillez saisir une adresse email valide');
    lux.notify(msg);
  } else if (!eula) {
    msg = lux.translate('Veuillez accepter les termes du rapport');
    lux.notify(msg);
  } else {
    /**
     * @type {!RequestInit}
     */
    var request = ({
      method: 'POST',
      headers: /** @type {HeadersInit} */ ({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    });
    fetch(lux.pagUrl + '/report/' + ids + '.pdf?email=' + mail + '&staging=false', request);
    lux.notify(msg);
  }
};

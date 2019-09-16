/**
 * @module lux.util
 */
let exports = {};
import olEvents from 'ol/events.js';
import olEventsEventType from 'ol/events/EventType.js';
import olProj from 'ol/proj.js';
import olLayerTile from 'ol/layer/Tile.js';
import olSourceWMTS from 'ol/source/WMTS.js';
import olSourceWMTSRequestEncoding from 'ol/source/WMTSRequestEncoding.js';
import olString from 'ol/string.js';
import olTilegridWMTS from 'ol/tilegrid/WMTS.js';
import olLayerImage from 'ol/layer/Image.js';
import olSourceImageWMS from 'ol/source/ImageWMS.js';
import olCoordinate from 'ol/coordinate.js';

/**
 * @type {string}
 */
exports.requestScheme = 'http';

/**
 * @type {string}
 */
exports.layersUrl = 'jsapilayers';

/**
 * @type {string}
 */
exports.searchUrl = 'fulltextsearch?';

/**
 * @type {string}
 */
exports.profileUrl = 'profile.json';

/**
 * @type {string}
 */
exports.exportCsvUrl = 'profile/echocsv';

/**
 * @type {string?}
 */
exports.baseUrl = null;

/**
 * @type {Object}
 * @export
 */
exports.languages = {};

/**
 * @type {string?}
 */
exports.wmtsCrossOrigin = 'anonymous';


const ref = exports;

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
exports.setBaseUrl = function(url, requestScheme) {
  if (requestScheme !== undefined) {
    ref.requestScheme = requestScheme;
  }

  if (!url) {
    ref.layersUrl = '../layers.json';
    ref.i18nUrl = '../lang_xx.json';

    url = 'https://apiv3.geoportail.lu/';
  } else {
    ref.layersUrl = url + ref.layersUrl;
    ref.i18nUrl = url + ref.i18nUrl;
  }

  ref.searchUrl = url + ref.searchUrl;
  ref.mymapsUrl = url + ref.mymapsUrl;
  ref.elevationUrl = url + ref.elevationUrl;
  ref.geocodeUrl = url + ref.geocodeUrl;
  ref.reverseGeocodeUrl = url + ref.reverseGeocodeUrl;
  ref.queryUrl = url + ref.queryUrl;
  ref.profileUrl = url + ref.profileUrl;
  ref.exportCsvUrl = url + ref.exportCsvUrl;
  ref.printUrl = url + ref.printUrl;
  ref.pagUrl = url + ref.pagUrl;
  ref.baseUrl = url;
};

/**
 * @type {string}
 */
exports.pagUrl = 'pag';

/**
 * @type {string}
 */
exports.mymapsUrl = 'mymaps';

/**
 * @type {string}
 */
exports.elevationUrl = 'raster';

/**
 * @type {string}
 */
exports.queryUrl = 'getfeatureinfo?';

/**
 * @type {string}
 */
exports.geocodeUrl = 'geocode/search';

/**
 * @type {string}
 */
exports.reverseGeocodeUrl = 'geocode/reverse';

/**
 * @type {string}
 */
exports.printUrl = 'printproxy';

/**
 * @param {string} url Url to jsapilayers service.
 * @export
 * @api
 */
exports.setLayersUrl = function(url) {
  ref.layersUrl = url;
};

/**
 * @param {string?} crossorigin The crossorigin header. Default is anonymous.
 * @export
 * @api
 */
exports.setWmtsCrossOrigin = function(crossorigin) {
  ref.wmtsCrossOrigin = crossorigin;
};

/**
 * @type {string}
 */
exports.i18nUrl = 'proj/api/build/locale/xx/geoportailv3.json';

/**
 * @type {string}
 */
exports.lang = 'fr';

/**
 * @type {Array<number>?}
 */
exports.popupSize = null;


/**
 * Returns the translated string if available.
 * @param {string} text The text to translate.
 * @return {string} The translated text.
 * @export
 */
exports.translate = function(text) {
  if (exports.lang in exports.languages) {
    return exports.languages[exports.lang][text] || text;
  }
  return text;
};

/**
 * @param {Array<number>} size Dimensions for popups
 * @export
 * @api
 */
exports.setPopupSize = function(size) {
  ref.popupSize = size;
};

/**
 * @param {string} url Url to i18n service.
 * @export
 * @api
 */
exports.setI18nUrl = function(url) {
  ref.i18nUrl = url;
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
exports.debounce = function(func, wait, opt_immediate) {
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
exports.notify = function(msg) {
  alert(msg);
};

/**
 * Builds the popup layout.
 * @param {string|Node} html The HTML/text or DOM Element to put
 *    into the popup.
 * @param {function()=} closeCallback Optional callback function. If set a close
 *    button is added.
 * @param {string=} title The  popup title.
 * @return {Element} The created element.
 * @export
 * @api
 */
exports.buildPopupLayout = function(html, closeCallback, title) {
  var container = document.createElement('DIV');
  container.classList.add('lux-popup');

  var arrow = document.createElement('DIV');
  arrow.classList.add('lux-popup-arrow');

  var elements = [arrow];

  var content = document.createElement('DIV');
  content.classList.add('lux-popup-content');

  if (exports.popupSize) {
    container.style.width = exports.popupSize[0] + 'px';
    content.style.height = exports.popupSize[1] + 'px';
    content.style.maxHeight = 'none';
  }

  if (typeof html == 'string') {
    content.innerHTML = html;
  } else {
    content.appendChild(html);
  }

  if (closeCallback) {
    var header = document.createElement('DIV');
    header.classList.add('lux-popup-header');

    if (title !== undefined) {
      header.innerHTML = title;
    }

    var closeBtn = document.createElement('BUTTON');
    closeBtn.classList.add('lux-popup-close');

    closeBtn.innerHTML = '&times;';
    header.appendChild(closeBtn);
    elements.push(header);

    olEvents.listen(closeBtn, olEventsEventType.CLICK, closeCallback);
  }

  elements.push(content);
  elements.forEach(function(element) {
    container.appendChild(element);
  });
  return container;
};


/**
 * @param {string} one The first list of exclusions.
 * @param {string} two The second list of exclusions.
 * @return {boolean} Whether the array intersect or not.
 */
exports.intersects = function(one, two) {
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
 */
exports.WMTSLayerFactory = function(config, opacity, visible) {
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

  if (exports.requestScheme === 'https') {
    url = 'https://wmts{3-4}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
    retinaExtension +
    '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;
  }
  var projection = olProj.get('EPSG:3857');
  var extent = projection.getExtent();

  var layer = new olLayerTile({
    name: config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new olSourceWMTS({
      crossOrigin: exports.wmtsCrossOrigin,
      url: url,
      attributions: [''],
      tilePixelRatio: (retina ? 2 : 1),
      layer: config['name'],
      matrixSet: 'GLOBAL_WEBMERCATOR_4_V3' + (retina ? '_HD' : ''),
      format: format,
      requestEncoding: olSourceWMTSRequestEncoding.REST,
      projection: projection,
      tileGrid: new olTilegridWMTS({
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
 */
exports.WMSLayerFactory = function(config, opacity, visible) {
  var url = config.url || 'https://map.geoportail.lu/main/wsgi/ogcproxywms?';
  var optSource = {
    crossOrigin: 'anonymous',
    url: url,
    params: {
      'FORMAT': config['imageType'],
      'LAYERS': config['layers']
    }
  };
  var layer = new olLayerImage({
    name: config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new olSourceImageWMS(optSource),
    opacity: opacity,
    visible: visible
  });
  return layer;
};


/**
 * It geocodes an address. The found position is transmitted to the callback function as parameter.
 * @param {luxx.GeocodeOptions!} obj The hash object representing the address to geocode.
 * @param {function(ol.Coordinate)} cb The callback to call. Called with the
 *     position in EPSG:2169 (LUREF) of the geocoded address.
 * @return {Promise.<luxx.GeocodeResponse>} Promise that returns the geocoding response.
 * @example
 * lux.util.geocode({
 *   queryString: '54 avenue gaston diderich 1420 luxembourg'
 * }, function(position) {
 *	 console.log (position);
 * });
 *
 * @example
 * lux.util.geocode({
 * num: 54,
 *   street: 'avenue gaston diderich',
 *   zip: 1420,
 *   locality: 'luxembourg'
 * }, function(position) {
 * console.log (position);
 * });
 * @export
 * @api
 * @static
 * @global
 */
exports.geocode = function(obj, cb) {
  var url = document.createElement('A');
  url.href = exports.geocodeUrl;

  console.assert(obj instanceof Object);
  Object.keys(obj).forEach(function(key) {
    url.search = url.search + '&' + key + '=' + obj[key];
  });
  return /** @type {Promise.<luxx.GeocodeResponse>} */ (fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    console.assert(json.results.length > 0, 'No address was found');

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
 * lux.util.reverseGeocode([75979,75067], function(address) {
 *   var html = [address.number, address.street, address.postal_code + ' ' + address.locality] .join(', ');
 *   console.log(html);console.log(address);
 * });
 * @export
 * @api
 * @static
 * @global
 */
exports.reverseGeocode = function(coordinate, cb) {
  var url = document.createElement('A');
  url.href = exports.reverseGeocodeUrl;
  url.search = 'easting=' + coordinate[0] + '&northing=' + coordinate[1];

  return /** @type {Promise.<luxx.ReverseGeocodeResponse>} */ (fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(
      /**
       * @param {luxx.ReverseGeocodeResponse} json The JSON.
       */
      function(json) {
        console.assert(json.count > 0, 'No result found');
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
exports.coordinateString_ = function(coordinate, sourceEpsgCode,
    targetEpsgCode, opt_DMS, opt_DMm) {
  var str = '';
  if (targetEpsgCode === 'EPSG:3263*') {
    var lonlat = /** @type {ol.Coordinate} */
        (olProj.transform(coordinate, sourceEpsgCode, 'EPSG:4326'));
    targetEpsgCode = Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
  }

  coordinate = olProj.transform(coordinate, sourceEpsgCode, targetEpsgCode);

  switch (targetEpsgCode) {
    default:
    case 'EPSG:2169':
      str = olCoordinate.format(coordinate, '{x} E | {y} N', 0);
      break;
    case 'EPSG:4326':
      if (opt_DMS) {
        var hdms = exports.toStringHDMS_(coordinate);
        var yhdms = hdms.split(' ').slice(0, 4).join(' ');
        var xhdms = hdms.split(' ').slice(4, 8).join(' ');
        str = xhdms + ' | ' + yhdms;
      } else if (opt_DMm) {
        var hdmm = exports.toStringHDMm_(coordinate);
        var yhdmm = hdmm.split(' ').slice(0, 3).join(' ');
        var xhdmm = hdmm.split(' ').slice(3, 6).join(' ');
        str = xhdmm + ' | ' + yhdmm;
      } else {
        str = olCoordinate.format(coordinate, ' {x} E | {y} N', 5);
      }
      break;
    case 'EPSG:32632':
      str = olCoordinate.format(coordinate, '{x} | {y} (UTM32N)', 0);
      break;
    case 'EPSG:32631':
      str = olCoordinate.format(coordinate, '{x} | {y} (UTM31N)', 0);
      break;
  }
  return str;
};

/**
 * @private
 * @param {ol.Coordinate|undefined} coordinate Coordinate.
 * @return {string} Hemisphere, degrees, minutes and seconds.
 */
exports.toStringHDMS_ = function(coordinate) {
  if (coordinate !== undefined) {
    return exports.degreesToStringHDMS_(coordinate[1], 'NS') + ' ' +
        exports.degreesToStringHDMS_(coordinate[0], 'EW');
  } else {
    return '';
  }
};

/**
 * @private
 * @param {ol.Coordinate|undefined} coordinate Coordinate.
 * @return {string} Hemisphere, degrees, decimal minutes.
 */
exports.toStringHDMm_ = function(coordinate) {
  if (coordinate !== undefined) {
    return exports.degreesToStringHDMm_(coordinate[1], 'NS') + ' ' +
        exports.degreesToStringHDMm_(coordinate[0], 'EW');
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
exports.degreesToStringHDMS_ = function(degrees, hemispheres) {
  var normalizedDegrees = ((degrees + 180) % 360) - 180;
  var x = Math.abs(3600 * normalizedDegrees);
  return Math.floor(x / 3600) + '\u00b0 ' +
      olString.padNumber(Math.floor((x / 60) % 60), 2) + '\u2032 ' +
      olString.padNumber(Math.floor(x % 60), 2) + ',' +
      Math.floor((x - (x < 0 ? Math.ceil(x) : Math.floor(x))) * 10) +
      '\u2033 ' + hemispheres.charAt(normalizedDegrees < 0 ? 1 : 0);
};

/**
 * @private
 * @param {number} degrees Degrees.
 * @param {string} hemispheres Hemispheres.
 * @return {string} String.
 */
exports.degreesToStringHDMm_ = function(degrees, hemispheres) {
  var normalizedDegrees = ((degrees + 180) % 360) - 180;
  var x = Math.abs(3600 * normalizedDegrees);
  var dd = x / 3600;
  var m = (dd - Math.floor(dd)) * 60;

  var res = Math.floor(dd) + '\u00b0 ' +
      olString.padNumber(Math.floor(m), 2) + ',' +
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
exports.generatePagRepport = function(ids, mail, eula) {
  var msg = exports.translate('Votre rapport est en train d\'être généré. Un email vous sera envoyé dès qu\'il sera disponible');
  var re = /^\S+@\S+\.\S+$/;
  if (mail.length === 0 || !re.test(mail)) {
    msg = exports.translate('Veuillez saisir une adresse email valide');
    exports.notify(msg);
  } else if (!eula) {
    msg = exports.translate('Veuillez accepter les termes du rapport');
    exports.notify(msg);
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
    fetch(exports.pagUrl + '/report/' + ids + '.pdf?email=' + mail + '&staging=false', request);
    exports.notify(msg);
  }
};

/**
 * Get the elevation for coordinates.
 * @param {ol.Coordinate} coordinate The coordinate of the point.
 * @return {Promise} Promise of the elevation request.
 * @export
 * @api
 */
exports.getElevation = function(coordinate) {
  var lonlat = /** @type {ol.Coordinate} */
        (olProj.transform(coordinate,
            'EPSG:3857', 'EPSG:2169'));
  var url = exports.elevationUrl;
  url += '?lon=' + lonlat[0] + '&lat=' + lonlat[1];

  return fetch(url).then(function(resp) {
    return resp.json();
  });
};


export default exports;

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import LuxMap from './map.js';
import {get as getProjection, transform as transformCoordinate} from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import WMTSSource from 'ol/source/WMTS';
import {padNumber} from 'ol/string';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import ImageLayer from 'ol/layer/Image';
import ImageWMSSource from 'ol/source/ImageWMS';
import LineString from 'ol/geom/LineString';
import {format as formatCoordinate} from 'ol/coordinate';

/**
 * @typedef {Object} GeocodeOptions
 * @property {string} num  The house number.
 * @property {string} street The street name.
 * @property {string} zip The postal code.
 * @property {string} locality The locality name.
 * @property {string} queryString The complete address into one string.
 */

/**
 * @typedef {Object} GeocodeResponse
 * @property {number} easting
 * @property {number} northing
 */

/**
 * @typedef {Object} ReverseGeocodeResult
 * @property {number} distance The distance in meter between the coordinate and the found address.
 * @property {ol.geom.Geometry} geom The location of the found address.
 * @property {string} id_caclr_bat The internal id of the batiment.
 * @property {string} id_caclr_street The internal id of the street.
 * @property {string} locality The locality of the found address.
 * @property {string} number The house number.
 * @property {string} postal_code The postal code of the locality.
 * @property {string} street The street name.
 */

/**
 * @typedef {Object} ReverseGeocodeResponse
 * @property {Array<ReverseGeocodeResult>} results
 * @property {Object} request
 */

proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');
register(proj4);

const lux = {};

lux.Map = LuxMap;

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
 * @param {ol.layer.Layer} layer Layer.
 * @return {Promise} the promise containing html;
 * @export
 */
lux.getLegendHtml = function(layer) {
    var localMetadata = /** @type {Object.<string, string>} */
        (layer.get('metadata'));

    var queryParams = {'lang': lux.lang};

    if (localMetadata != undefined && 'legend_name' in localMetadata) {
        queryParams['name'] = localMetadata['legend_name'];
    }
    var id = layer.get('id');
    if (id != undefined) {
        queryParams['id'] = id;
    }
    // handle high resolution screens
    if (window.devicePixelRatio > 1) {
      try {
        queryParams['dpi'] = this.$window_.devicePixelRatio * 96;
      } catch(e) {
        console.log(e);
      }
    }
    var url = lux.htmlLegendUrl + '?' + (new URLSearchParams(queryParams)).toString();
    return fetch(url).then(function(resp) {
      return (resp.text().then(function(text) {return text;}));
    });
}

/**
 * Sets the basic url of the rest services such as :
 * <lu><li>Search service</li>
 * <li>Mymaps service</li>
 * <li>Elevation service</li>
 * <li>Geocoding service</li>
 * <li>Reverse geocoding service</li>
 * </lu>
 * @param {string | null} url Base url to services. Default is //apiv4.geoportail.lu/
 * @param {string | undefined} requestScheme The request scheme. Default is http.
 * @export
 */
lux.setBaseUrl = function(url, requestScheme) {
  if (requestScheme !== undefined) {
    lux.requestScheme = requestScheme;
  }
  var wsBaseUrl = 'https://map.geoportail.lu/';
  // wsBaseUrl = url;
  if (!url) {
    lux.layersUrl = '../layers.json';
    lux.i18nUrl = '../lang_fr.json';
    url = 'https://apiv4.geoportail.lu/';
  } else {
    lux.layersUrl = wsBaseUrl + lux.layersUrl;
    // lux.layersUrl = url + lux.layersUrl;
    lux.i18nUrl = url + lux.i18nUrl;
  }

  lux.searchUrl = url + lux.searchUrl;
  lux.mymapsUrl = url + lux.mymapsUrl;
  lux.elevationUrl = url + lux.elevationUrl;
  lux.geocodeUrl = url + lux.geocodeUrl;
  lux.reverseGeocodeUrl = url + lux.reverseGeocodeUrl;
  lux.queryUrl = wsBaseUrl + lux.queryUrl;
  lux.profileUrl = url + lux.profileUrl;
  lux.exportCsvUrl = url + lux.exportCsvUrl;
  lux.printUrl = url + lux.printUrl;
  lux.htmlLegendUrl = url + lux.htmlLegendUrl;
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
 * @param {string|Node} html The HTML/text or DOM Element to put
 *    into the popup.
 * @param {function()=} closeCallback Optional callback function. If set a close
 *    button is added.
 * @param {string=} title The  popup title.
 * @return {Element} The created element.
 * @export
 * @api
 */
lux.buildPopupLayout = function(html, closeCallback, title) {
  var container = document.createElement('DIV');
  container.classList.add('lux-popup');

  var arrow = document.createElement('DIV');
  arrow.classList.add('lux-popup-arrow');

  var elements = [arrow];

  var content = document.createElement('DIV');
  content.classList.add('lux-popup-content');

  if (lux.popupSize) {
    container.style.width = lux.popupSize[0] + 'px';
    content.style.height = lux.popupSize[1] + 'px';
    content.style.maxHeight = 'none';
  }

  if (typeof html === 'string') {
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

    closeBtn.addEventListener('click', closeCallback);
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
lux.intersects = function(one, two) {
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
 * @return {TileLayer} The layer.
 */
lux.WMTSLayerFactory = function(config, opacity, visible) {
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
  var projection = getProjection('EPSG:3857');
  var extent = projection.getExtent();

  var layer = new TileLayer({
    name: config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new WMTSSource({
      crossOrigin: lux.wmtsCrossOrigin,
      url: url,
      attributions: [''],
      tilePixelRatio: (retina ? 2 : 1),
      layer: config['name'],
      matrixSet: 'GLOBAL_WEBMERCATOR_4_V3' + (retina ? '_HD' : ''),
      format: format,
      requestEncoding: 'REST',
      projection: projection,
      tileGrid: new WMTSTileGrid({
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
 * @return {ImageLayer} The layer.
 */
lux.WMSLayerFactory = function(config, opacity, visible) {
  var url = config.url || 'https://map.geoportail.lu/ogcproxywms?';
  var optSource = {
    crossOrigin: 'anonymous',
    url: url,
    params: {
      'FORMAT': config['imageType'],
      'LAYERS': config['layers']
    }
  };
  var layer = new ImageLayer({
    name: config['name'],
    id: config['id'],
    metadata: config['metadata'],
    source: new ImageWMSSource(optSource),
    opacity: opacity,
    visible: visible
  });
  return layer;
};


/**
 * It geocodes an address. The found position is transmitted to the callback function as parameter.
 * @param {GeocodeOptions} obj The hash object representing the address to geocode.
 * @param {function(ol.Coordinate)} cb The callback to call. Called with the
 *     position in EPSG:2169 (LUREF) of the geocoded address.
 * @return {Promise.<GeocodeResponse>} Promise that returns the geocoding response.
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
  var url = document.createElement('A');
  url.href = lux.geocodeUrl;

  console.assert(obj);
  Object.keys(obj).forEach(function(key) {
    url.search = url.search + '&' + key + '=' + obj[key];
  });
  return /** @type {Promise.<GeocodeResponse>} */ (fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(function(json) {
    if (json.results.length > 0) {
      var result = json.results[0];
      if (cb !== undefined) {
        cb.call(null, [result.easting, result.northing]);
      }
    }
    return json;
  }));
};

/**
 * It returns the most closest address of a given point.
 * @param {ol.Coordinate} coordinate The coordinates to look for an address.
 *     Coordinates must be given in EPSG:2169.
 * @param {function(Object)} cb The callback function to call.
 *    Called with the address represented by [ReverseGeocodeResult](luxx.html#ReverseGeocodeResult).
 * @return {Promise.<ReverseGeocodeResponse>} Promise that returns the reverse geocoding response.
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
  var url = document.createElement('A');
  url.href = lux.reverseGeocodeUrl;
  url.search = 'easting=' + coordinate[0] + '&northing=' + coordinate[1];

  return /** @type {Promise.<ReverseGeocodeResponse>} */ (fetch(url.toString()).then(function(resp) {
    return resp.json();
  }).then(
      /**
       * @param {ReverseGeocodeResponse} json The JSON.
       */
      function(json) {
        console.assert(json.count, 'No result found');
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
        (transformCoordinate(coordinate, sourceEpsgCode, 'EPSG:4326'));
    targetEpsgCode = Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
  }

  coordinate = transformCoordinate(coordinate, sourceEpsgCode, targetEpsgCode);

  switch (targetEpsgCode) {
    default:
    case 'EPSG:2169':
      str = formatCoordinate(coordinate, '{x} E | {y} N', 0);
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
        str = formatCoordinate(coordinate, ' {x} E | {y} N', 5);
      }
      break;
    case 'EPSG:32632':
      str = formatCoordinate(coordinate, '{x} | {y} (UTM32N)', 0);
      break;
    case 'EPSG:32631':
      str = formatCoordinate(coordinate, '{x} | {y} (UTM31N)', 0);
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
  if (coordinate !== undefined) {
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
  if (coordinate !== undefined) {
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
  var normalizedDegrees = ((degrees + 180) % 360) - 180;
  var x = Math.abs(3600 * normalizedDegrees);
  return Math.floor(x / 3600) + '\u00b0 ' +
      padNumber(Math.floor((x / 60) % 60), 2) + '\u2032 ' +
      padNumber(Math.floor(x % 60), 2) + ',' +
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
  var normalizedDegrees = ((degrees + 180) % 360) - 180;
  var x = Math.abs(3600 * normalizedDegrees);
  var dd = x / 3600;
  var m = (dd - Math.floor(dd)) * 60;

  var res = Math.floor(dd) + '\u00b0 ' +
      padNumber(Math.floor(m), 2) + ',' +
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

/**
 * Set the center of the current view in EPSG:2169.
 * @param {ol.geometry.Geometry} geometry The geometry to check.
 * @return {true} True if self intersecting otherwise false.
 * @export
 * @api
 */
lux.isSelfIntersecting = function(geometry) {
  var coordinates;
  var segments = [];
  var intersect = false;
  if (geometry.getType() === 'LineString') {
    coordinates = geometry.getCoordinates();
  }
  if (geometry.getType() === 'Polygon') {
    coordinates = geometry.getCoordinates()[0];
    coordinates.pop();
  }
  for (var iSegement = 0; iSegement < coordinates.length - 1; iSegement++) {
    segments.push(new LineString([coordinates[iSegement], coordinates[iSegement + 1]]));
  }
  for (var i = 0; i < segments.length - 1; i++) {
    for (var j = i + 2; j < segments.length; j++) {
      if (!(geometry.getType() === 'Polygon' && i == 0 && j == segments.length - 1)) {
        if (lux.segmentsIntersect_(segments[i], segments[j])) {
          intersect = true;
          break;
        }
      }
    }
  }
  return intersect;
};

/**
 * Set the center of the current view in EPSG:2169.
 * @param {ol.geometry.LineString} seg1 The first line to check.
 * @param {ol.geometry.LineString} seg2 The second line to check.
 * @return {boolean} return true if intersects.
 * @private
 */
lux.segmentsIntersect_ = function(seg1, seg2) {
  var intersection = false;
  var p1s1 = seg1.getFirstCoordinate();
  var p2s1 = seg1.getLastCoordinate();
  var p1s2 = seg2.getFirstCoordinate();
  var p2s2 = seg2.getLastCoordinate();
  var x11_21 = p1s1[0] - p1s2[0];
  var y11_21 = p1s1[1] - p1s2[1];
  var x12_11 = p2s1[0] - p1s1[0];
  var y12_11 = p2s1[1] - p1s1[1];
  var y22_21 = p2s2[1] - p1s2[1];
  var x22_21 = p2s2[0] - p1s2[0];
  var d = (y22_21 * x12_11) - (x22_21 * y12_11);
  var n1 = (x22_21 * y11_21) - (y22_21 * x11_21);
  var n2 = (x12_11 * y11_21) - (y12_11 * x11_21);

  if (d === 0) {
      // parallel
      if (n1 === 0 && n2 === 0) {
          // coincident
          intersection = true;
      }
  } else {
      var along1 = n1 / d;
      var along2 = n2 / d;
      if (along1 >= 0 && along1 <= 1 && along2 >= 0 && along2 <= 1) {
        intersection = true;
      }
  }
  return intersection;
};

export default lux;
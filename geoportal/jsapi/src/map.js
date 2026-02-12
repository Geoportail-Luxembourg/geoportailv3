/**
 * @module map
 */

import lux from './index.js';
import MapBoxLayer from '@geoblocks/mapboxlayer/src/MapBoxLayer.js';
import LayerManager from './layermanager.js';
import MyMap from './mymap.js';
import PrintManager, {PRINT_LAYOUTS} from './printmanager.js';
import StateManager from './statemanager.js';
import OpenLayersMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import MousePosition from 'ol/control/MousePosition';
import ZoomToExtent from 'ol/control/ZoomToExtent';
import {includes} from 'ol/array';
import {getArea as getSphericalArea, getLength as getSphericalLength} from 'ol/sphere';
import {listen} from 'ol/events';
import * as proj from 'ol/proj';
import GPX from 'ol/format/GPX';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import WKT from 'ol/format/WKT';
import Point from 'ol/geom/Point';
import SelectInteraction from 'ol/interaction/Select';
import ModifyInteraction from 'ol/interaction/Modify';
import DrawInteraction from 'ol/interaction/Draw';
import DragRotateInteraction from 'ol/interaction/DragRotate';
import {shiftKeyOnly, altShiftKeysOnly} from 'ol/events/condition';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {createEmpty, getCenter, extend as extendExtent, containsCoordinate} from 'ol/extent';
import FillStyle from 'ol/style/Fill';
import StrokeStyle from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import VectorSource from 'ol/source/Vector';
import Collection from 'ol/Collection';
import {defaults as controlsDefaults} from 'ol/control';
import {defaults as interactionDefaults} from 'ol/interaction';
import AttributionControl from 'ol/control/Attribution';
import RotateControl from 'ol/control/Rotate';
import CollectionEventType from 'ol/CollectionEventType';
import MapBrowserEventType from 'ol/MapBrowserEventType';
import Feature from 'ol/Feature';
import {fromExtent} from 'ol/geom/Polygon';
import EventType from 'ol/events/EventType';
import VectorEventType from 'ol/source/VectorEventType';
import 'js-autocomplete';



/**
 * @type {lux.Piwik}
 * @export
 */
var _paq = [];

_paq.push(['setSiteId', 63]);
function getCookie(name) {
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}
(function () {
  let loadPiwik = true;
  const cookieOrejime = getCookie('orejime=');
  const cookieIsPublicWebsite = getCookie('isPublicWebsite=');
  if (cookieIsPublicWebsite == null && cookieOrejime == null) {
    // If IsPublicWebsite and Orejime don't exist load piwik.
    loadPiwik = true;
  } else if (cookieIsPublicWebsite !== null && cookieOrejime == null) {
    // If IsPublicWebsite exists and orejime does not exist, do not load piwik.
    loadPiwik = false;
  } else if ((cookieIsPublicWebsite !== null && cookieOrejime != null) ||
    (cookieIsPublicWebsite == null && cookieOrejime != null)) {
    // If IsPublicWebsite exists and orejime exists, loading piwik depends on the orejime value.
    loadPiwik = false;
    const value = JSON.parse(cookieOrejime);
    if ('geoportail' in value && value['geoportail']) {
      loadPiwik = true;
    }
  }

  if (loadPiwik) {
    var u = 'https://statistics.geoportail.lu/';
    _paq.push(['setTrackerUrl', u + 'piwik.php']);
    var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
    g.type = 'text/javascript'; g.async = true; g.defer = true; g.src = u + 'piwik.js'; s.parentNode.insertBefore(g, s);
  }
})();

window['_paq'] = _paq;


/**
 * Get the elevation for coordinates.
 * @param {ol.Coordinate} coordinate The coordinate of the point.
 * @return {Promise} Promise of the elevation request.
 * @export
 * @api
 */
export function getElevation(coordinate) {
  var lonlat = /** @type {ol.Coordinate} */
    (proj.transform(coordinate,
      'EPSG:3857', 'EPSG:2169'));
  var url = lux.elevationUrl;
  url += '?lon=' + lonlat[0] + '&lat=' + lonlat[1];

  return fetch(url).then(function (resp) {
    return resp.json();
  });
}

/**
 * @typedef {Object} MyMapOptions
 * @property {boolean} [fitToExtent=true]  Fit to the mymaps extent.
 * @property {string} [mapId] The map identifier.
 * @property {Array<string>} [mapIds] An array of map identifiers.
 * @property {string} [name] The name of the mymaps layer.
 * @property {string} [profileTarget]  The id of the element in which to put the profile (without #).
 *     Optional. It is recommended to set the display style to none at first. The display will then be set to block adequately.
 * @property {function(Array<ol.Feature>)} [onload] The function called once the map is loaded.
 * @property {boolean} [layerVisibility] The layer visibility. Default is visible.
 * @property {boolean} [showPopup] If true, the popup is displayed on click. Default is True.
 * @property {function(Array<ol.Feature>)} [onClick] If set, the function is called when clicking on the object and the popup is not displayed.
 */


/**
 * @typedef {Object} LayerMetadataOptions
 * @property {string} exclusion
 */

/**
 * @typedef {Object} LayerOptions
 * @property {LayerMetadataOptions} metadata
 * @property {string} imageType
 * @property {string} type
 * @property {boolean} isBgLayer
 */

/**
 * @typedef {number|LayerOptions} LayersOptions
 */

/**
 * @typedef {Object} BgSelectorOptions
 * @property {Element|string} target The container for the bgSelector control, either the element itself or the `id` of the element.
 */

/**
 * @typedef {Object} FeaturesOptions
 * @property {Array<string>} ids Comma-separated list of ids.
 * @property {string|number} layer Layer identifier.
 * @property {Element|string} [target] The container for the feature popup, either the element itself or the `id` of the element.
 * @property {boolean} [click] If set, the popup is displayed when clicking the feature.
 * @property {boolean} [showMarker]  If set to true, a marker is shown. Default is true.
 * @property {number} [maxZoom=17] The maximal zoom level to use when zooming on a feature.
 */

/**
 * @typedef {Object} SearchOptions
 * @property {Element|string} target The container for the map, either the element itself or the `id` of the element.
 * @property {string} [dataSets] A dataSets Array of layer used as search sources. Default is Adresse. Possible values are 'Adresse' and 'Coordinates'.
 * @property {function(Event, string, Element)} [onSelect]
 * @property {boolean=} selectFirst Optional True select the first result element when pressing enter key.
 */

/**
 * @typedef {Object} MarkerOptions
 * @property {string|number} [id] Set the overlay id. The overlay id can be used with the ol.Map#getOverlayById method.
 * @property {boolean} [noPopupOnTransparency] Allow to deactivate popup when clicking on a transparent part of the marker.
 *     This property is experimental. The marker should come from the same source
 *     as the page, or the image server has to set the following  header `Access-Control-Allow-Origin "*"`
 * @property {ol.Coordinate} [position] Position of the marker. If not set, the marker is displayed at the center of the map.
 * @property {string|number} [positionSrs=2169] The projection of the position coordinates.
 * @property {boolean} [autoCenter] Tells whether the map should be recentered to the marker position.
 * @property {string} [iconURL='https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/icon.png'] URL to an image.
 * @property {string} [positioning] Positioning of the icon. See {@link https://openlayers.org/en/latest/apidoc/ol.html#.OverlayPositioning}
 * @property {string} [html] If set, HTML code or simple text that will be displayed when clicking on the marker.
 * @property {boolean} [click] If set, the popup is displayed when clicking the marker.
 * @property {Element|string} target The container for the map, either the element itself or the `id` of the element.
 * @property {function} [onClick] If set, the function is called when clicking on the marker.
 */

/**
 * @typedef {Object} VectorOptions
 * @property {function} [onFeatureAdd] Callback function called when a feature is added.
 * @property {boolean} [fit]  True if map should fit to the vector. Default and undefined are true.
 * @property {number} [reloadInterval] Interval after which to reload the vector layer (in seconds).
 * @property {ol.StyleFunction} [style] The style function.
 * @property {string} [name] The layer name.
 * @property {boolean} [click] If set, the popup is displayed when clicking the feature.
 * @property {function} [onClick] If set, and if click is true then the function is called with the feature as parameter.
 * @property {Element|string} [target] The container for the feature popup, either the element itself or the `id` of the element.
 */

/**
 * @typedef {Object} MapOptions
 * @property {boolean} [mouseWheelZoom=true] Allows the user to zoom the map by scrolling the mouse wheel.
 * @property {function()} [popupContentTransformer] Function called to transform the result of the information popup.
 * @property {boolean} [popupAutoPan=false] If the popup should automatically pan or not.
 * @property {function()} [callback] Function called when the objects are initialized.
 * @property {function()} [layerInfoCallback] Function called when an info layer is return.
 * @property {string} [bgLayer='basemap_2015_global'] Identifier of background layer.
 * @property {string} [bgLayerStyle] Style to apply to vector tile background layer.
 * @property {string} [bgLayerStyleXYZ] XYZ layer to apply to vector tile background layer when printing. Ex: 'https://vectortiles.geoportail.lu/styles/roadmap/{z}/{x}/{y}.png'.
 * @property {BgSelectorOptions} [bgSelector] Set the presence of a background selector control in the map.
 * @property {ol.Collection.<ol.control.Control>|Array.<ol.control.Control>} [controls] Controls initially added to the map.
 * @property {ol.Collection.<ol.interaction.Interaction>|Array.<ol.interaction.Interaction>} [interactions] Interactions initially added to the map.
 * @property {FeaturesOptions} [features] Set the presence of features to recenter on & to show markers for.
 * @property {LayerManagerOptions} [layerManager] Set the presence of a layer manager control. (not included by default)
 * @property {Array<number>} [layerOpacities] Array of opacities for the layers.
 * @property {Array<boolean>} [layerVisibilities] Array of visibilities for the layers.
 * @property {Array<string|number>} [layers] Array of overlay layer identifiers.
 * @property {boolean} [zoomToExtent] Set the presence of a ZoomToExtent control in the map. (not included by default).
 * @property {Element|string} [mousePosition] The container for map popups, either the element itself or the `id` of the element.
 * @property {Element|string} [popupTarget] The container for map popups, either the element itself or the `id` of the element.
 * @property {string} [popupClassPrefix] The css class of the element that contains each row.
 * @property {ol.Coordinate} [position] The initial position of the center for the map view. The coordinate system for the center is specified with the `positionSrs` option.
 *     If a center is defined in the view, then this parameter will override the center defined in the view.
 * @property {string|number} [positionSrs=2169] The projection of the position coordinates.
 * @property {Array<string|number>} [queryableLayers] Array of queryable layers.
 * @property {SearchOptions} [search] The search configuration.
 * @property {boolean} [showLayerInfoPopup] If set to true, it displays the feature information in a popup or in popupTarget element.
 * @property {Element|string} target The container for the map, either the element itself or the `id` of the element.
 * @property {ol.View} [view] The map's view.
 * @property {number} [zoom] Zoom level used to calculate the initial resolution for the view.
 *     If zoom are defined here and in the view, this parameter will override the view one.
 */


/**
 * @param {string} name The layer name.
 * @param {Object<string,LayersOptions>} layers The layers config.
 * @return {LayersOptions|undefined} The layer config.
 * @private
 */
function findLayerByName_(name, layers) {
  for (var i in layers) {
    var layer = layers[i];
    if (layer.name == name) {
      return layer;
    }
  }
  return;
}

/**
 * @classdesc
 * The map is the core component of the Geoportail V3 API.
 * This constructor instantiates and render a `lux.Map` object.
 * @example
 * // To render a map, the API needs to know the element where to display the map (target),
 * // the predefined background layer (bgLayer) to display,
 * // the predefined layers (layers),
 * // the starting zoom level (zoom),
 * // the central position of the map (position)
 * var map = new lux.Map({
 *   target: 'map1',
 *   bgLayer: 'basemap_2015_global',
 *   zoom: 18,
 *   position: [76771, 72205]
 * });
 * @constructor
 * @export
 * @api
 */
class Map extends OpenLayersMap {

  /**
   * @param {MapOptions} options Map options.
   */
  constructor(options) {

    var layers = [];
    var layerOpacities = [];
    var layerVisibilities = [];

    var defaultBg = 'basemap_2015_global';

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

    if (options.view === undefined) {
      options.view = new View({});
    }

    if (options.position) {
      var position = [parseFloat(
        options.position[0]),
      parseFloat(options.position[1])];
      options.view.setCenter(proj.transform(
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

    if (options.view.getCenter() === undefined || options.view.getCenter() === null) {
      options.view.setCenter(proj.fromLonLat([6.215, 49.845]));
    }
    if (options.view.getZoom() === undefined || options.view.getZoom() === null) {
      options.view.setZoom(9);
    }
    var mouseWheelZoom = (options.mouseWheelZoom !== undefined) ? options.mouseWheelZoom : true;
    var interactions = interactionDefaults({
      mouseWheelZoom: mouseWheelZoom,
      altShiftDragRotate: false,
      pinchRotate: true,
      constrainResolution: true
    }).extend([
      new DragRotateInteraction({
        condition: new URLSearchParams(document.location.search).has('shiftKeyRotate') ? shiftKeyOnly : altShiftKeysOnly
      })
    ]);
    options.interactions = interactions;

    var controls;
    if (options.controls !== undefined) {
      if (Array.isArray(options.controls)) {
        controls = new Collection(options.controls.slice());
      } else {
        console.assert(options.controls instanceof Collection, 'Expected `controls` to be an array or an `Collection`');
        controls = options.controls;
      }
    } else {
      var attribution = new AttributionControl({
        collapsible: false
      });
      var rotate = new RotateControl();
      controls = controlsDefaults({attribution: false}).extend(
        [attribution, rotate]
      );
    }

    if (options.zoomToExtent) {
      controls.push(new ZoomToExtent({extent: [631077, 6337091, 724025, 6492411]}));
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
        controls.push(new MousePosition({
          target: el,
          className: 'lux-mouse-position',
          projection: proj.get(srs),
          coordinateFormat: function (coord) {
            var decimal = 1;
            if (srs == 'EPSG:4326') {
              decimal = 5;
            }
            if (srs == 'EPSG:2169') {
              decimal = 2;
            }
            return coord.map(function (c) {
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

    super(options);

    this.layersPromise = fetch(lux.layersUrl).then(function (resp) {
      return resp.json();
    }).then(function (json) {
      this.layersConfig = /** @type {LayersOptions} */ (json);
      // Replace by mapbox
      this.addLayers_(layers, layerOpacities, layerVisibilities, options);
    }.bind(this));

    Promise.all([this.i18nPromise, this.layersPromise]).then(function () {
      // background layers selector
      if (options.bgSelector && options.bgSelector.target) {
        this.addBgSelector(options.bgSelector.target);
      }
      delete options.bgSelector;

      if (options.layerManager) {
        var target = options.layerManager.target;
        var el = typeof target === 'string' ? document.getElementById(target) : target;
        this.layerManagerControl_ = new LayerManager({
          target: el
        });
        this.addControl(this.layerManagerControl_);
      }
      delete options.layerManager;
      if (options.search && options.search.target) {
        var searchTarget = options.search.target;
        var searchDataSets = options.search.dataSets;
        var onSelect = options.search.onSelect;
        var selectFirst = options.search.selectFirst;
        if (selectFirst == undefined) {
          selectFirst = false;
        }
        delete options.search;
        this.addSearch(searchTarget, searchDataSets, onSelect, selectFirst);
      }
    }.bind(this));

    this.grantedUrls = ['visitluxembourg.com', 'mullerthal-trail.lu', 'visit-eislek.lu', 'visitguttland.lu', 'luxembourgtravel.lu',
      'visitmoselle.lu', 'visitminett.lu', 'mullerthal.lu', 'gites.lu', 'vins-cremants.lu', 'visitbeaufort.lu', 'visitberdorf.lu', 'minetttour.lu',
      'visitconsdorf.lu', 'visitechternach.lu', 'visitlarochette.lu', 'medernach.info', 'mullerthal-millen.lu', 'rosport-tourism.lu',
      'visitwasserbillig.lu', 'visitatertwark.lu', 'visit-clervaux.lu', 'visit-diekirch.lu', 'visit-vianden.lu', 'minetttrail.lu', 'minettcycle.lu',
      'public.lu', 'etat.lu', 'inondations.lu', 'visit-fouhren.lu', 'visit-hoscheid.lu', 'visitjunglinster.lu', 'visitreisdorf.lu', 'visitrosportmompach.lu',
      'mae.lu', 'gouvernement.lu', 'meteolux.lu', 'luxemburg.infomax.online', 'data.public.lu', 'test.data.public.lu', 'www.camping.lu',
      'main.camprilux.infomax.online', 'camprilux.infomax.online', 'camprilux.infomax.dev', 'int.geoportail.lu'];

    /**
     * @private
     */
     this.resizeObserver_ = undefined;

    /**
     * @private
     * @type {boolean}
     */
    this.showSelectedFeature_ = true;

    /**
     * @private
     * @type {boolean}
     */
    this.queryOnClick_ = true;

    /**
     * @private
     * @type {boolean}
     */
    this.queryOnDrawEnd_ = false;

    this.mvtLayer_ = undefined;
    /**
     * @private
     * @type {Array}
     */
    this.addedKmlLayers_ = [];

    /**
     * @type {SelectInteraction | undefined}
     * @private
     */
    this.addedKmlLayersSelectInteraction_ = undefined;

    /**
     * @private
     * @type {Array}
     */
    this.addedKmlOnClick_ = [];

    /**
     * @private
     * @type {Overlay | undefined}
     */
    this.lastpopup_ = undefined;

    window['_paq'].push(['trackPageView']);

    /**
     * @private
     * @type {ol.Extent}
     */
    this.featureExtent_ = createEmpty();

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

    // /**
    //  * @private
    //  * @type {Promise}
    //  */
    // this.layersPromise = null;

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

    /**
     * @private
     * @type {function()=|undefined}
     */
    this.layerInfoCb_ = options.layerInfoCallback;

    this.setLanguage(lux.lang);

    /**
     * @private
     * @type {VectorLayer}
     */
    this.searchLayer_ = null;

    var fillStyle = new FillStyle({
      color: [255, 255, 0, 0.6]
    });

    var strokeStyle = new StrokeStyle({
      color: [255, 155, 55, 1],
      width: 3
    });

    /**
     * @private
     * @type {Style}
     */
    this.vectorStyle_ = new Style({
      fill: fillStyle,
      stroke: strokeStyle,
      image: new CircleStyle({
        radius: 10,
        fill: fillStyle,
        stroke: strokeStyle
      })
    });

    /**
     * @private
     * @type {VectorLayer}
     */
    this.showLayer_ = new VectorLayer({
      source: new VectorSource()
    });

    /**
     * @private
     * @type {Array<VectorLayer>}
     */
    this.showVectorLayerArray_ = [];

    if (options.features) {
      var opts = options.features;
      this.showFeatures(opts.layer, opts.ids, opts.click, opts.target, opts.showMarker, opts.maxZoom);
    }

    /**
     * @private
     * @type {VectorSource}
     */
    this.sourceDrawFeatures_ = new VectorSource();

    /**
     * @private
     * @type {ModifyInteraction|undefined}
     */
    this.modifyInteraction_ = undefined;

    /**
     * @private
     * @type {VectorLayer}
     */
    this.drawingLayer_ = new VectorLayer({
      source: this.sourceDrawFeatures_
    });

    this.showLayer_.setStyle(this.vectorStyle_);

    /**
     * @private
     * @type {TileLayer}
     */
    this.blankLayer_ = new TileLayer();
    this.blankLayer_.set('name', 'blank');

    /**
     * @private
     * @type {LayerManager}
     */
    this.layerManagerControl_ = null;

    /**
     * @type {ol.Extent}
     * @private
     */
    this.maxExtent_ = [2.6, 47.7, 8.6, 51];

    /**
     * @type {DrawInteraction | undefined}
     * @private
     */
    this.curDrawInteraction_ = undefined;

    /**
     * @private
     * @type {Overlay}
     */
    this.queryPopup_ = null;

    this.getTargetElement().classList.add('lux-map');

    listen(this.getLayers(), CollectionEventType.ADD, this.checkForExclusion_, this);

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

    listen(this, MapBrowserEventType.SINGLECLICK, this.handleSingleclickEvent_, this);

    this.stateManager_ = new StateManager();
    this.stateManager_.setMap(this);

    this.showLayer_.setMap(this);
    this.drawingLayer_.setMap(this);

    // change cursor on mouseover feature
    listen(this, MapBrowserEventType.POINTERMOVE, function (evt) {
      var pixel = this.getEventPixel(evt.originalEvent);
      var hit = this.hasFeatureAtPixel(pixel);

      this.getTargetElement().style.cursor = (hit) ? 'pointer' : '';
    }.bind(this));

    if (options.callback !== undefined) {
      Promise.all([this.i18nPromise, this.layersPromise]).then(function () {
        options.callback.call(this);
      }.bind(this));
    }
    /**
     * @private
     * @type {function()}
     */
    this.cbResize_ = function(entries) {
      for (let entry of entries) {
        if (entry.contentRect.width > 0 &&
            entry.contentRect.height > 0) {
                this.updateSize();
                if (this.resizeObserver_ !== undefined) {
                    this.resizeObserver_.unobserve(this.getTargetElement());
                    this.resizeObserver_ = undefined;
                }
            }
      }
    }
    try {
        if (this.getTargetElement().clientHeight == 0 ||
            this.getTargetElement().clientWidth == 0) {
            this.resizeObserver_ = new ResizeObserver(this.cbResize_.bind(this));
            this.resizeObserver_.observe(this.getTargetElement())
        }
    } catch(e) {
        console.log(e);
    }
  }

  /**
   * Create a new empty vector layer.
   * @param {Style|Array.<Style>|ol.StyleFunction|undefined} style The
   * style to apply to the layer.
   * @return {VectorLayer} The created layer.
   * @export
   * @api
   */
  createVectorLayer(style) {
    var vectorLayer = new VectorLayer({
      source: new VectorSource()
    });
    if (style !== undefined) {
      vectorLayer.setStyle(style);
    }
    this.showVectorLayerArray_.push(vectorLayer);
    vectorLayer.setMap(this);
    return vectorLayer;
  }

  /**
   * Enable query layer after clicking on the map.
   * @param {boolean} queryOnClick.
   * @export
   * @api
   */
  enableQueryOnClick(queryOnClick) {
    this.queryOnClick_ = !!queryOnClick;
  }

  /**
   * If set to true, then it allows to display the clicked feature.
   * @param {boolean} showSelectedFeature
   * @export
   * @api
   */
  enableShowSelectedFeature(showSelectedFeature) {
    this.showSelectedFeature_ = showSelectedFeature;
  }

  /**
   * Enable query layer after finishing to draw on the map.
   * @param {boolean} queryOnDrawEnd.
   * @export
   * @api
   */
  enableQueryOnDrawEnd(queryOnDrawEnd) {
    this.queryOnDrawEnd_ = !!queryOnDrawEnd;
  }

  /**
   * Draw a point on the map.
   * @param {function()=|undefined} onDrawEnd the callback function.
   * @export
   * @api
   */
  enableDrawPoint(onDrawEnd) {
    this.drawType_('Point', onDrawEnd);
  }

  /**
   * Draw a polygon on the map.
   * @param {function()=|undefined} onDrawEnd the callback function.
   * @export
   * @api
   */
  enableDrawPolygon(onDrawEnd) {
    this.drawType_('Polygon', onDrawEnd);
  }

  /**
   * Draw a polygon on the map.
   * @param {function()=|undefined} onDrawEnd the callback function.
   * @param {boolean|undefined} queryLayer.
   * @export
   * @api
   */
  enableDrawLine(onDrawEnd) {
    this.drawType_('LineString', onDrawEnd);
  }

  /**
   * Draw a polygon on the map.
   * @param {boolean} enabled the callback function.
   * @export
   * @api
   */
  activateModifyDrawing(enabled) {
    if (this.modifyInteraction_ === undefined) {
      this.modifyInteraction_ = new ModifyInteraction({source: this.sourceDrawFeatures_});
      this.modifyInteraction_.setActive(false);
      this.addInteraction(this.modifyInteraction_);
    }

    this.modifyInteraction_.setActive(enabled);
  }

  /**
   * Disable the current drawing tool.
   * @export
   * @api
   */
  disableDrawTool() {
    if (this.curDrawInteraction_ !== undefined) {
      this.removeInteraction(this.curDrawInteraction_);
      this.curDrawInteraction_ = undefined;
    }
  }

  /**
   * Draw on the map.
   * @param {string} type the kind of object we want to draw.
   * @param {function()=|undefined} onDrawEnd the callback function.
   */
  drawType_(type, onDrawEnd) {
    if (this.curDrawInteraction_ !== undefined) {
      this.removeInteraction(this.curDrawInteraction_);
    }
    this.curDrawInteraction_ = new DrawInteraction({
      source: this.sourceDrawFeatures_,
      type: type,
    });
    if (onDrawEnd !== undefined) {
      listen(this.curDrawInteraction_, 'drawend', onDrawEnd, this);
    }
    listen(this.curDrawInteraction_, 'drawend', this.handleDrawendEvent_, this);

    this.addInteraction(this.curDrawInteraction_);
  }


  /**
   * Adds the given layer to the top of this map. If you want to add a layer
   * elsewhere in the stack, use `getLayers()` and the methods available on
   * {@link Collection}.
   * @param {ol.layer.Base} layer Layer.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html}
   * @export
   * @api
   */
  addLayer(layer) {
    this.layersPromise.then(() => super.addLayer(layer));
  }

  /**
   * Get the promise to have a map in a ready state.
   * @return {Promise} Promise of a configured map.
   * @export
   * @api
   */
  getMapReadyPromise() {
    return Promise.all([this.i18nPromise, this.layersPromise]);
  }

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
   * @param {String=} format the output format. Default value is pdf.
   * @example
   * map.print();
   * @export
   * @api
   */
  print(name, layout, scale, firstPagesUrls, callback, format) {
    var dpi = 127;
    if (format === undefined || format === null) {
      format = 'pdf';
    }

    var pm = new PrintManager(lux.printUrl, this);
    if (firstPagesUrls === undefined || firstPagesUrls === null) {
      firstPagesUrls = [];
    }
    if (name === undefined || name === null) {
      name = '';
    }
    var curLayout = '';
    if (layout === undefined || layout === null || PRINT_LAYOUTS.indexOf(layout) === -1) {
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
      if (source) {
        var attributions = source.getAttributions();
        if (attributions) {
          attributions().forEach((attribution) => dataOwners.push(attribution));
        }
      }
    });
    var piwikUrl = 'http://apiv4.geoportail.lu/print/' + curLayout.replace(' ', '/');
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
      const resolution = this.getView().getResolution();
      const dpi = 25.4 / 0.28;
      const mpu = this.getView().getProjection().getMetersPerUnit();
      const inchesPerMeter = 1000 / 25.4;
      scale = Math.round(parseFloat(resolution.toString()) * mpu * inchesPerMeter * dpi);
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
    pm.createReport(spec).then((resp) => {
      if (resp.status === 200) {
          resp.json().then((data) => {
            var mfResp = /** @type {MapFishPrintReportResponse} */ (data);
            var ref = mfResp.ref;
            console.assert(ref.length !== 0);
            this.getStatus_(pm, ref, callback);
        });
      }
    });
  }

  /**
   * Get the print spec.
   *
   * @export
   * @api
   */
  getPrintSpec(layout, scale, dpi, pformat) {
    var printDpi = (dpi !== undefined) ? dpi : 127;
    var format = (pformat !== undefined) ? pformat : 'png';
    var pm = new PrintManager(lux.printUrl, this);

    var curLayout = '';
    if (layout === undefined || layout === null || PRINT_LAYOUTS.indexOf(layout) === -1) {
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
      if (source) {
        var attributions = source.getAttributions();
        if (attributions) {
          attributions().forEach((attribution) => dataOwners.push(attribution));
        }
      }
    });

    dataOwners = dataOwners.filter(function(item, pos, self) {
      return self.indexOf(item) == pos;
    });

    var disclaimer = lux.translate('www.geoportail.lu est un portail d\'accès aux informations géolocalisées, données et services qui sont mis à disposition par les administrations publiques luxembourgeoises. Responsabilité: Malgré la grande attention qu’elles portent à la justesse des informations diffusées sur ce site, les autorités ne peuvent endosser aucune responsabilité quant à la fidélité, à l’exactitude, à l’actualité, à la fiabilité et à l’intégralité de ces informations. Information dépourvue de foi publique. Droits d\'auteur: Administration du Cadastre et de la Topographie. http://g-o.lu/copyright');
    var dateText = lux.translate('Date d\'impression: ');
    var scaleTitle = lux.translate('Echelle approximative 1:');
    var appTitle = lux.translate('Le géoportail national du Grand-Duché du Luxembourg');

    if (scale === undefined || scale === null) {
      const resolution = this.getView().getResolution();
      const dpi = 25.4 / 0.28;
      const mpu = this.getView().getProjection().getMetersPerUnit();
      const inchesPerMeter = 1000 / 25.4;
      scale = Math.round(parseFloat(resolution.toString()) * mpu * inchesPerMeter * dpi);
    }
    var longUrl = this.stateManager_.getUrl();
    if (longUrl.toLowerCase().indexOf('http') !== 0 &&
        longUrl.toLowerCase().indexOf('//') === 0) {
      longUrl = 'http:' + longUrl;
    }

    var spec = pm.createSpec(scale, printDpi, curLayout, format, {
      'disclaimer': disclaimer,
      'scaleTitle': scaleTitle,
      'appTitle': appTitle,
      'scale': scale,
      'name': '',
      'lang': lux.lang,
      'legend': '',
      'scalebar': {'geodetic': true},
      'dataOwner': dataOwners.join(' '),
      'dateText': dateText,
      'url': longUrl,
      'qrimage': 'https://apiv4.geoportail.lu/qr?url=' + longUrl
    });
    return spec;
  }

  /**
   * @param {PrintManager} pm Print manager.
   * @param {string} ref Ref.
   * @param {function(string)=} callback Optional callback function.
   * @private
   */
  getStatus_(pm, ref, callback) {
    pm.getStatus(ref).then((resp) => {
      if (resp.status === 200) {
        resp.json().then((data) => {
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
            window.setTimeout(() => this.getStatus_(pm, ref, callback), 1000);
          }
        });
      }
    });
  }

  /**
   * Get the layer containing highlighted features.
   * @export
   * @api
   * @return {VectorLayer} The show layer.
   */
  getShowLayer() {
    return this.showLayer_;
  }

  /**
   * Get the layer containing drawn features.
   * @export
   * @api
   * @return {VectorLayer} The show layer.
   */
  getDrawingLayer() {
    return this.drawingLayer_;
  }

  /**
   * Remove the drawings.
   * @export
   * @api
   */
  removeDrawings() {
    return this.drawingLayer_.getSource().clear();
  }


  /**
   * @param {string} lang Set the new language.
   * @param {Object} translations Set the new translations.
   * @export
   */
  addNewLanguage(lang, translations) {
    lux.languages[lang.toLowerCase()] = translations;
  }

  /**
   * @param {string} lang Set the language.
   * @export
   * @api
   */
  setLanguage(lang) {
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

    this.i18nPromise = fetch(langUrl).then(function (resp) {
      if (resp === null || resp === undefined) {
        throw new Error('Invalid response');
      }
      if (resp.ok) {
        return resp.json();
      }
      throw new Error('' + resp.status + ' ' + resp.statusText);
    }).then(function (json) {
      lux.languages[curLang] = json[curLang];
      if (this.layerManagerControl_ !== null &&
        this.layerManagerControl_ !== undefined) {
        this.layerManagerControl_.update();
      }
    }.bind(this)).catch(function (error) {
      console.log(error);
      lux.lang = previousLang;
    }.bind(this));
  }

  /**
   * Set the queryable layers. If undefined then use the default value
   * from metadata.
   * @param {Array<string|number>|undefined} queryableLayers An array of
   * queryable layers
   * @export
   * @api
   */
  setQueryableLayers(queryableLayers) {
    this.queryableLayers_ = queryableLayers;
  }

  /**
   * Show a marker on the map at the given location.
   * @param {boolean} show Set to true will allow to display the feature
   * information popup when clicking on an object.
   * @export
   * @api
   */
  showLayerInfoPopup(show) {
    this.showLayerInfoPopup_ = show;
  }

  /**
   * Set the information callback function.
   * @param {function()=|undefined} layerInfoCb The callback function.
   * @export
   * @api
   */
  setLayerInfoCb(layerInfoCb) {
    this.layerInfoCb_ = layerInfoCb;
  }

  /**
   * Get the area of a geometry in square meters.
   * @param {ol.geom.Geometry} geometry The geometry the get the area.
   * @param {string} srs the geometry's srs. Default is EPSG:3857.
   * @return {number} The spherical area (in square meters).
   * @export
   * @api
   */
  getGeometryArea(geometry, srs) {
    const curSrs = ((srs === undefined) ? 'EPSG:3857' : srs);
    let area = 0;
    switch (geometry.getType()) {
      case 'Polygon':
        area = geometry.clone().transform(curSrs, 'EPSG:2169').getArea();
        break;
      case 'MultiPolygon':
        area = geometry.clone().transform(curSrs, 'EPSG:2169').getArea();
        break;
    }
    return area;
  }

  /**
   * Get the length of a geometry in meters.
   * @param {ol.geom.Geometry} geometry The geometry the get the area.
   * @param {string} srs the geometry's srs. Default is EPSG:3857.
   * @return {number} The spherical length (in meters).
   * @export
   * @api
   */
  getGeometryLength(geometry, srs) {
    const curSrs = ((srs === undefined) ? 'EPSG:3857' : srs);
    let length = 0;
    switch (geometry.getType()) {
        case 'Polygon':
          length = new ol.geom.LineString(geometry.getLinearRing(0).clone().transform(curSrs, 'EPSG:2169').getCoordinates()).getLength();
          break;
        case 'MultiPolygon':
          length = new ol.geom.LineString(geometry.getPolygon(0).getLinearRing(0).clone().transform(curSrs, 'EPSG:2169').getCoordinates()).getLength();
          break;
        case 'LineString':
          length = geometry.clone().transform(curSrs, 'EPSG:2169').getLength();
          break;
      }
    return length;
  }

  /**
   * Sets the popup target or undefined to let the api create popup.
   * @param {Element|string|undefined} optPopupTarget The container for map
   * popups, either the element itself or the `id` of the element. Undefined lets
   * the popup be created by the api.
   * @param {string|undefined} optPopupClass The css class of the row.
   * @export
   * @api
   */
  setPopupTarget(optPopupTarget, optPopupClass) {
    this.popupTarget_ = typeof optPopupTarget === 'string' ?
      document.getElementById(optPopupTarget) :
      optPopupTarget;
    this.popupClass_ = optPopupClass;
  }

  /**
   * Show a marker on the map at the given location.
   * @param {MarkerOptions=} opt_options Config options
   * @return {Overlay} The overlay containing the marker
   * or null if the marker target is not conform.
   * @export
   * @api
   */
  showMarker(opt_options) {
    var options = opt_options || {};
    var element = document.createElement('DIV');
    var image = document.createElement('IMG');
    // Overlay compute the position where the image must be displayed using
    // the size of the element. But as the size of the image is only known
    // after the image is loaded, then we have to refresh the map, to be sure
    //  the marker is displayed at the right position.
    image.style.display = 'none';
    image.onload = function () {
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
      'https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/icon.png';
    element.appendChild(image);

    var position;
    if (options.position) {
      position = proj.transform(
        options.position,
        (options.positionSrs) ?
          'EPSG:' + options.positionSrs.toString() : 'EPSG:2169',
        'EPSG:3857'
      );
    } else {
      position = this.getView().getCenter();
    }
    var markerOverlay = new Overlay({
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
      listen(element, MapBrowserEventType.CLICK, options.onClick);
    }
    if (options.html) {
      var popup;
      var showPopupEvent = options.click ? MapBrowserEventType.CLICK : MapBrowserEventType.POINTERMOVE;

      listen(element, showPopupEvent, (function (event) {
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
          var cb = !options.click ? undefined : function () {
            this.removeOverlay(popup);
          }.bind(this);
          var element = lux.buildPopupLayout(options.html, cb);
          popup = new Overlay({
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
        listen(element, MapBrowserEventType.POINTEROUT, function () {
          if (options.target) {
            el.innerHTML = '';
            return;
          }
          this.removeOverlay(popup);
        }.bind(this));
      }
    }
    return markerOverlay;
  }

  /**
   * @param {string|number} layer Layer id
   * @return {Object} The layer config
   * @private
   */
  findLayerConf_(layer) {
    var conf = this.layersConfig;
    var layerConf;
    if (typeof layer === 'number' || !isNaN(parseInt(layer, 10))) {
      layerConf = conf[layer];
    } else if (typeof layer === 'string') {
      layerConf = findLayerByName_(layer, conf);
    }
    if (!layerConf) {
      console.error('Layer "' + layer + '" not present in layers list');
      return null;
    }
    return layerConf;
  }


  prependMapBoxBackgroundLayer(target, mapBoxStyle, mapBoxStyleXYZ) {

    return new MapBoxLayer({
      'style': mapBoxStyle,
      'xyz': mapBoxStyleXYZ,
      'container': target,
      'label': 'MVT'
    });
  }

  /**
   * @param {Array<string|number>} layers Array of layer names.
   * @param {Array<number>} opacities Array of layer opacities.
   * @param {Array<boolean>} visibilities Array of layer visibility.
   * @param {Object} options The map options.
   * @private
   */
  addLayers_(layers, opacities, visibilities, options) {

    var conf = this.layersConfig;
    if (!conf) {
      return;
    }
    layers.forEach(function (layer, index) {
      if (layer == 'blank') {
        this.getLayers().push(this.blankLayer_);
        return;
      }
      var layerConf = this.findLayerConf_(layer);
      if (layerConf !== null) {
        if (layer == 'basemap_2015_global' ||
          layer == 'topogr_global' ||
          layer == 'topo_bw_jpeg') {
          if (this.mvtLayer_ === undefined) {
            this.mvtLayer_ = this.MVTLayerFactory_(options, layer);
          }
          this.getLayers().push(this.mvtLayer_);
          return;
        }
        var fn = (layerConf.type.indexOf('WMS') != -1) ?
          lux.WMSLayerFactory : lux.WMTSLayerFactory;
        var opacity = (opacities[index] !== undefined) ? opacities[index] : 1;
        var visible = (visibilities[index] !== undefined) ? visibilities[index] : true;
        var curLayer = fn(layerConf, opacity, visible);
        curLayer.set('__source__', 'geoportail')
        this.getLayers().push(curLayer);
      }
    }.bind(this));
  }

  MVTLayerFactory_(options, layerName) {
    const target = this.getTargetElement();
    // FIXME: should be taken from the layer config
    // TODO: when config is handled by c2cgeoportal
    // Here we use roadmap_jsapi due to https://jira.camptocamp.com/browse/GSLUX-264
    const host = new URL(window.location).host;
    const keywords = {
        'basemap_2015_global': 'roadmap_jsapi',
        'topogr_global': 'topomap',
        'topo_bw_jpeg': 'topomap_gray'
    };
    let layer = keywords[layerName] || layerName || 'roadmap_jsapi';
    if (layer === 'roadmap_jsapi' && 
        this.grantedUrls.find(element => host.endsWith(element)) !== undefined) {
      layer = 'roadmap';
    }
    let mapBoxStyle = 'https://vectortiles.geoportail.lu/styles/' + layer + '/style.json';
    let mapBoxStyleXYZ = 'https://vectortiles.geoportail.lu/styles/' + layer + '/{z}/{x}/{y}.png';
    if (options && options.bgLayerStyle) {
      mapBoxStyle = options.bgLayerStyle;
    }
    if (options && options.bgLayerStyleXYZ) {
      mapBoxStyleXYZ = options.bgLayerStyleXYZ;
    }
    const mvtLayer_ = this.prependMapBoxBackgroundLayer(target, mapBoxStyle, mapBoxStyleXYZ);
    mvtLayer_.set('name', layerName);
    return (mvtLayer_);
  }


  /**
   * @param {CollectionEventType} event The event.
   * @private
   */
  checkForExclusion_(event) {
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
  }

  /**
   * Adds the given layer to the top of this map. If you want to add a layer
   * elsewhere in the stack, use `getLayers()` and the methods available on
   * {@link Collection}.
   * @param {string|number} layer The layer id.
   * @param {number=} opt_opacity The layer opacity. Default is 1.
   * @param {boolean=} opt_visibility The layer visibility. Default is true.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html}
   * @export
   * @api
   */
  addLayerById(layer, opt_opacity, opt_visibility) {
    this.layersPromise.then(function (layers) {
      var opacity = (opt_opacity !== undefined) ? opt_opacity : 1;
      var visibility = (opt_visibility === undefined) ? opt_visibility : true;
      this.addLayers_([layer], [opacity], [visibility]);
    }.bind(this));
  }

  /**
   * It adds a simple background selector control into a specific html element.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example3}
   * @param {Element|string} target Dom element or id of the element to render
   * bgSelector in.
   * @param {Array<string|number>|undefined} bglayers Array of overlay layer identifiers.
   * 'blank' acts as blank layer.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/iterate_layers_api.html?background}
   * @export
   * @api
   */
  addBgSelector(target, bglayers) {
    this.layersPromise.then(function () {
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
      var backgrounds = Object.keys(conf).filter(function (l) {
        if (bglayers === undefined) {
          return conf[l].isBgLayer;
        }
        if (conf[l].isBgLayer) {
          return bglayers.indexOf(conf[l].id) != -1;
        }
        return false;
      }).map(function (l) {
        return conf[l];
      });
      var active = this.getLayers().item(0).get('name');
      backgrounds.forEach(function (background) {
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

      select.addEventListener('change', function () {
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
      listen(this.getLayers(), CollectionEventType.ADD,
        function (event) {
          var layer = this.getLayers().getArray()[0];
          if (layer == this.blankLayer_) {
            blankOption.setAttribute('selected', 'selected');
          }
        }, this);

    }.bind(this));
  }

  /**
   * @param {string|number} layer The layer identifier
   * @param {Array<string|number>} ids Array of features identifiers
   * @param {boolean?} opt_click True if click is needed to show popup
   * @param {Element|string|undefined} opt_target Element to render popup content in
   * @param {boolean|undefined} isShowMarker True if a marker has to be displayed.
   * @param {number|undefined} maxZoom The maximum zoom to fit.
   * @param {function(string, boolean, object)=|undefined} callback Optional callback function 
   *    called for each id.
   * @export
   * @api
   */
  showFeatures(layer, ids, opt_click, opt_target, isShowMarker, maxZoom, callback) {
    // remove any highlighted feature
    this.showLayer_.getSource().clear();
    this.layersPromise.then(function () {
      var lid = this.findLayerConf_(layer).id;
      // check if layer corresponding to feature is shown on the map
      // if so, then highlight the feature
      var visible = this.getLayers().getArray().some(function (l) {
        return l.get('id') === lid;
      });
      if (!Array.isArray(ids)) {
        ids = [ids];
      }
      ids.forEach(function (id) {
        var uri = lux.queryUrl + 'fid=' + lid + '_' + id + '&tooltip';
        fetch(uri).then(function (resp) {
          return resp.json();
        }).then(function (json) {
          this.addFeature_(json, visible, opt_click, opt_target,
            (isShowMarker === undefined) ? true : isShowMarker, maxZoom);
          if (callback !== undefined) {
            var found = true;
            if (json.length === 0) {
              found = false;
            }
            if (!('features' in json[0])) {
              found = false;
            } else {
              found = (json[0]['features'].length > 0);
            }
            callback.call(this, id, found, json);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }

  /**
   * @param {Object} json GeoJSON object
   * @return {Array<ol.Feature>} the features.
   * @private
   */
  readJsonFeatures_(json) {
    var features = [];
    if (json.features != undefined) {
      json.features.forEach(function (f) {
        f.properties = f.attributes;
      });
      features = new GeoJSON().readFeatures({
        type: 'FeatureCollection',
        features: json.features
      }, {
        dataProjection: 'EPSG:2169',
        featureProjection: 'EPSG:3857'
      });
    }
    return features;
  }

  /**
   * @param {Object} json GeoJSON object
   * @param {boolean} highlight Whether or not to highlight the features.
   * @param {boolean?} opt_click True if click is needed to show popup
   * @param {Element|string|undefined} opt_target Element to render popup content in
   * @param {boolean} isShowMarker True if the marker should be shown.
   * @param {number | undefined} maxZoom The maxZoom to fit.
   * @private
   */
  addFeature_(json, highlight, opt_click, opt_target, isShowMarker, maxZoom) {
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
    features.forEach(function (feature) {
      if (isShowMarker) {
        this.showMarker({
          position: getCenter(feature.getGeometry().getExtent()),
          positionSrs: '3857',
          autoCenter: true,
          click: opt_click,
          target: opt_target,
          html: tooltip
        });
      }
      this.featureExtent_ = extendExtent(this.featureExtent_, feature.getGeometry().getExtent()
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
  }

  /**
   * It adds the search control into an html element.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example6}
   * @param {Element|string} target Dom element or id of the element to render search widget in.
   * @param {Array<string>=} dataSets=['Adresse'] Array of layer used as search sources.
   * @param {function(Event, String, Element)=} onSelect Optional function called when result is selected.
   * @param {boolean=} selectFirst Optional True select the first result element on enter.
   * @export
   * @api
   */
  addSearch(target, dataSets, onSelect, selectFirst) {
    var layers = [];
    var searchCoordinates = false;
    if (dataSets !== undefined && dataSets.length > 0) {
      dataSets.forEach(function (layer) {
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
      selectFunction = function (e, term, item, clearButton) {
        var coord = item.getAttribute('data-coord').split(',').map(parseFloat);
        var extent = item.getAttribute('data-extent').split(',').map(parseFloat);
        this.searchLayer_.getSource().clear();
        this.searchLayer_.getSource().addFeature(new Feature(
          new Point(
            proj.transform(coord, 'EPSG:4326', 'EPSG:3857')
          )
        ));
        this.getView().fit(
          fromExtent(
            proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857')
          ),
        /** @type {olx.view.FitOptions} */({
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

    clear.addEventListener('click', function () {
      input.value = '';
      clear.style.display = '';
      this.searchLayer_.getSource().clear();
    }.bind(this));
    input.addEventListener('keyup', function () {
      clear.style.display = (input.value == '') ? '' : 'block';
    });

    this.searchLayer_ = new VectorLayer({
      source: new VectorSource()
    });

    this.searchLayer_.setStyle(this.vectorStyle_);
    this.searchLayer_.setMap(this);

    var format = new GeoJSON();
    if (selectFirst == undefined) {
      selectFirst = false;
    }
    var first = selectFirst;
    /* eslint-disable no-undef */
    new autoComplete({
      'selector': input,
      'minChars': 2,
      'cache': 0,
      'menuClass': 'lux-search-suggestions',
      'source': function (term, suggest) {
        first = selectFirst;
        var coordResults = [];
        if (searchCoordinates) {
          coordResults = this.matchCoordinate_(term);
          suggest(coordResults);
        }
        if (layers.length > 0) {
          term = term.toLowerCase();
          fetch(lux.searchUrl + 'limit=5&layer=' + layers.join(',') + '&query=' + term).then(function (resp) {
            return resp.json();
          }).then(function (json) {
            suggest(coordResults.concat(json.features));
          });
        }
      }.bind(this),
      'renderItem': function (item, search) {
        var label = item.properties.label;
        var layerName = item.properties['layer_name'];
        search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi');
        var geom = /** @type {Point} */ (format.readGeometry(item.geometry));
        var bbox = (!item['bbox'] || !item['bbox']['join']) ? geom.getExtent() : item['bbox'];
        var suggestionClass = 'autocomplete-suggestion';
        if (first) {
          suggestionClass = 'autocomplete-suggestion selected';
        }
        first = false;
        return '<div class="'+ suggestionClass +'" data-val="' + label + '"' +
          ' data-coord="' + geom.getCoordinates().join(',') + '"' +
          ' data-layer="' + layerName + '"' +
          ' data-extent="' + bbox.join(',') + '">' +
          label.replace(re, '<b>$1</b>') +
          '</div>';
      },
      'onSelect': function (e, term, item) {
        selectFunction.call(this, e, term, item, clear);
      }.bind(this)
    });

  }

  /**
   * @param {string} searchString The search string.
   * @return {Array<ol.Feature>} The result.
   * @private
   */
  matchCoordinate_(searchString) {
    searchString = searchString.replace(/,/gi, '.');
    var results = [];
    var format = new GeoJSON();
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
            if (includes(northArray, m[2].toUpperCase()) && includes(eastArray, m[4].toUpperCase())) {
              easting = parseFloat(m[3].replace(',', '.'));
              northing = parseFloat(m[1].replace(',', '.'));
            } else if (includes(northArray, m[4].toUpperCase()) && includes(eastArray, m[2].toUpperCase())) {
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
          var point = new Point([easting, northing]).transform(epsgCode, mapEpsgCode);
          var flippedPoint = new Point([northing, easting]).transform(epsgCode, mapEpsgCode);
          var feature = /** @type {ol.Feature} */ (null);
          if (containsCoordinate(this.maxExtent_, point.getCoordinates())) {
            feature = new Feature(point);
          } else if (epsgCode === 'EPSG:4326' && containsCoordinate(this.maxExtent_, flippedPoint.getCoordinates())) {
            feature = new Feature(flippedPoint);
          }
          if (feature !== null) {
            var resultPoint = /** @type {Point} */ (feature.getGeometry());
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
  }

  /**
   * @param {Array.<string | undefined>} m The matched result.
   * @return {Object | undefined} Returns the coordinate.
   * @private
   */
  decDegFromMatch_(m) {
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
  }

  /**
   * It displays a GPX file on the map.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example4}
   * @param {string} url Url to the GPX file.
   * @param {VectorOptions=} opt_options Options.
   * @return {Promise} The vector layer promise.
   * @export
   * @api
   */
  addGPX(url, opt_options = {}) {
    /** @type {ol.StyleFunction | undefined}*/
    var styleFunction;
    if (opt_options.style !== undefined) {
      styleFunction = opt_options.style;
    } else {
      var style = {
        'Point': new Style({
          image: new CircleStyle({
            fill: new FillStyle({
              color: 'rgba(255,255,0,0.4)'
            }),
            radius: 5,
            stroke: new StrokeStyle({
              color: '#ff0',
              width: 1
            })
          })
        }),
        'LineString': new Style({
          stroke: new StrokeStyle({
            color: '#f00',
            width: 3
          })
        }),
        'MultiLineString': new Style({
          stroke: new StrokeStyle({
            color: '#f00',
            width: 3
          })
        })
      };
      styleFunction = function (feature) {
        return style[feature.getGeometry().getType()];
      };
    }

    return this.addVector_(url, new GPX(), {
      style: styleFunction,
      reloadInterval: opt_options.reloadInterval,
      click: opt_options.click,
      target: opt_options.target,
      fit: opt_options.fit
    });
  }

  /**
   * It displays a KML file on the map.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example4}
   * @param {string} url Url to the KML file.
   * @param {VectorOptions=} opt_options Options.
   * @export
   * @api
   */
  addKML(url, opt_options) {
    this.addVector_(url, new KML(), opt_options);
  }

  /**
   * It displays a GeoJSON file on the map.
   * @param {string} url Url to the GeoJSON file.
   * @param {VectorOptions=} opt_options Options.
   * @return {Promise} The vector layer promise.
   * @export
   * @api
   */
  addGeoJSON(url, opt_options = {}) {
    var opt_format = {};
    if (opt_options.dataProjection !== undefined) {
      opt_format['defaultDataProjection'] = opt_options.dataProjection;
    }
    return this.addVector_(url, new GeoJSON(opt_format), opt_options);
  }

  /**
   * It displays a GeoJSON object on the map.
   * The default data projection is EPSG:4326.
   * @param {Object} geojson The GeoJSON object.
   * @param {VectorOptions=} opt_options Options.
   * @return {Promise} The vector layer promise.
   * @export
   * @api
   */
  addGeoJSONObject(geojson, opt_options = {}) {
    var opt_format = {
        dataProjection: 'EPSG:4326',
        featureProjection: this.getView().getProjection()
      };
    if (opt_options.dataProjection !== undefined) {
      opt_format['dataProjection'] = opt_options.dataProjection;
    }
    var vector = new VectorLayer(opt_options);
    const vectorSource = new VectorSource({
      features: new GeoJSON(opt_format).readFeatures(geojson),
    });
    vector.setSource(vectorSource);
    this.addLayer(vector);
    return Promise.resolve(vector);
  }

  /**
   * Adds a KML or gpx file on the map
   * @param {string} url Url to the vector file
   * @param {GPX|KML|GeoJSON} format The format.
   * @param {VectorOptions=} opt_options Options.
   * @return {Promise} The vector layer promise.
   * @private
   */
  addVector_(url, format, opt_options = {}) {
    var popup;
    var vector;
    var el;
    var fit = true;
    if (opt_options.fit === undefined) {
      fit = true;
    }
    if (opt_options.fit === false) {
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
      vector.setSource(new VectorSource({
        url: uri.toString(),
        format: format
      }));
    }

    var options = {};
    if (opt_options.style) {
      options.style = opt_options.style;
    }
    if (opt_options.name) {
      options.name = opt_options.name;
    }
    return this.layersPromise.then(function () {
      vector = new VectorLayer(options);

      var interval = opt_options.reloadInterval;
      if (interval) {
        console.assert(typeof interval === 'number', 'Reload interval must be a number');
        window.setInterval(function () {
          setSource(true);
        }, interval * 1000);
      }
      setSource();
      this.addLayer(vector);
      this.addedKmlLayers_.push(vector);
      this.addedKmlOnClick_.push(opt_options.onClick);
      if (fit || opt_options.onFeatureAdd !== undefined) {
        listen(vector.getSource(), VectorEventType.ADDFEATURE,
          function (evt) {
            if (fit) {
              var size = this.getSize();
              console.assert(size !== undefined, 'size should be defined');
              this.getView().fit(vector.getSource().getExtent(), {size: size});
            }
            if (opt_options.onFeatureAdd !== undefined) {
              opt_options.onFeatureAdd.call(this, evt.feature);
            }
          }.bind(this)
        );
      }

      if (opt_options.click) {
        if (this.addedKmlLayersSelectInteraction_ !== undefined) {
          this.removeInteraction(this.addedKmlLayersSelectInteraction_);
          this.addedKmlLayersSelectInteraction_ = undefined;
        }
        this.addedKmlLayersSelectInteraction_ = new SelectInteraction({
          layers: this.addedKmlLayers_
        });
        this.getLayers().on('remove', function(event) {
          if (event.element == vector) {
            if (this.addedKmlLayersSelectInteraction_ !== undefined) {
              this.removeInteraction(this.addedKmlLayersSelectInteraction_);
              this.addedKmlLayersSelectInteraction_ = undefined;
            }
          }
        }.bind(this));
        this.addInteraction(this.addedKmlLayersSelectInteraction_);
        if (opt_options.onClick) {
          this.addedKmlLayersSelectInteraction_.on('select', function (e) {
            var features = e.target.getFeatures();
            var curLayer = this.addedKmlLayersSelectInteraction_.getLayer(features.getArray()[0]);
            for (var iLayer = 0; iLayer < this.addedKmlLayers_.length; iLayer++) {
              if (this.addedKmlLayers_[iLayer] == curLayer) {
                this.addedKmlOnClick_[iLayer].call(null, features, e.mapBrowserEvent.coordinate);
              }
            }
            this.addedKmlLayersSelectInteraction_.getFeatures().clear();
          }.bind(this));
        } else {
          this.addedKmlLayersSelectInteraction_.on('select', function (e) {
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
            var element = lux.buildPopupLayout(html, function () {
              this.removeOverlay(popup);
              this.addedKmlLayersSelectInteraction_.getFeatures().clear();
            }.bind(this));
            popup = new Overlay({
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
      return vector;
    }.bind(this));
  }

  /**
   * It shows a popup.
   * @param {ol.Coordinate} position The position of the popup.
   * @param {string} title The popup title.
   * @param {string} content The popup content.
   * @return {Overlay} The popup overlay.
   * @export
   * @api
   */
  showPopup(position, title, content) {
    var popup;
    var element = lux.buildPopupLayout(content, function () {
      if (popup !== undefined) {
        this.removeOverlay(popup);
      }
    }.bind(this), title);
    popup = new Overlay({
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
  }

  /**
   * It loads a MyMaps layer.
   * @see {@link https://apiv4.geoportail.lu/proj/1.0/build/apidoc/examples/index.html#example8}.
   * @example
   * var map8 = new lux.Map({
   *   target: 'map8',
   *   bgLayer: 'topo_bw_jpeg',
   *   zoom: 12,
   *   position: [76825, 75133]
   * });
   * map8.addMyMapLayer({
   *   mapId: '0416ef680fbe4cdaa2d8009262d1127c'
   * });
   * @param {MyMapOptions} options The options.
   * @return {Promise} Promise of the mymaps object.
   * @export
   * @api
   */
  addMyMapLayer(options) {
    if (options.mapId !== undefined) {
      this.stateManager_.setMyMap(options.mapId);
    }
    return Promise.all([this.i18nPromise, this.layersPromise]).then(function () {
      var mymap = new MyMap(options);
      mymap.setMap(this);
      return mymap;
    }.bind(this));
  }

  /**
   * Get the popup overlay.
   * @return {Overlay} The popup overlay.
   * @export
   */
  getPopupOverlay() {
    return this.queryPopup_;
  }

  /**
   * Removes the popup or the information content.
   * @export
   */
  removeInfoPopup() {
    if (this.queryPopup_) {
      this.removeOverlay(this.queryPopup_);
    }
    if (this.popupTarget_) {
      this.popupTarget_.innerHTML = '';
    }
  }


  /**
   * @param {string|number} layer Layer id
   * @param {Array<string|number>} ids The ids to retrieve.
   * @param {function(Object)} callback The function to call.
   * @export
   */
  getFeatureInfoByIds(layer, ids, callback) {
    this.layersPromise.then(function () {
      var lid = this.findLayerConf_(layer).id;
      if (!Array.isArray(ids)) {
        ids = [ids];
      }
      ids.forEach(function (id) {
        var uri = lux.queryUrl + 'fid=' + lid + '_' + id + '&tooltip';
        fetch(uri).then(function (resp) {
          return resp.json();
        }).then(function (json) {
          callback.call(this, json);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }

  /**
   * @param {Object} evt The click event.
   * @param {function(?)} callback The function to call.
   * @export
   */
  getFeatureInfo(evt, callback) {
    var layers = this.getLayers().getArray();

    // collect the queryable layers
    var layersToQuery = [];
    if (this.queryableLayers_ === undefined) {
      layers.forEach(function (layer) {
        var metadata = layer.get('metadata');
        if (metadata && metadata['is_queryable'] === true &&
          layer.getVisible() && layer.getOpacity() > 0) {
          layersToQuery.push(layer.get('id'));
        }
      });
    } else {
      this.queryableLayers_.forEach(function (layer) {
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

    var lb = proj.transform(
      this.getCoordinateFromPixel(
        [evt.pixel[0] - bigBuffer, evt.pixel[1] + bigBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
    var rt = proj.transform(
      this.getCoordinateFromPixel(
        [evt.pixel[0] + bigBuffer, evt.pixel[1] - bigBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
    var big_box = lb.concat(rt);

    lb = proj.transform(
      this.getCoordinateFromPixel(
        [evt.pixel[0] - smallBuffer, evt.pixel[1] + smallBuffer]),
      this.getView().getProjection(), 'EPSG:2169');
    rt = proj.transform(
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
      'srs': 'EPSG:3857',
      'zoom': Math.round(this.getView().getZoom())
    };
    var url = document.createElement('A');
    url.href = lux.queryUrl;

    Object.keys(params).forEach(function (key) {
      url.search = url.search + '&' + key + '=' + params[key];
    });
    fetch(url.toString()).then(function (resp) {
      return resp.json();
    }).then(function (json) {
      this.getViewport().style.cursor = '';
      callback.call(this, json);
    }.bind(this));
  }

  /**
   * @param {Object} evt The drawend event.
   * @param {function(?)} callback The function to call.
   * @export
   */
  getFeatureInfoByGeometry(evt, callback) {
    var layers = this.getLayers().getArray();

    // collect the queryable layers
    var layersToQuery = [];
    if (this.queryableLayers_ === undefined) {
      layers.forEach(function (layer) {
        var metadata = layer.get('metadata');
        if (metadata && metadata['is_queryable'] === true &&
          layer.getVisible() && layer.getOpacity() > 0) {
          layersToQuery.push(layer.get('id'));
        }
      });
    } else {
      this.queryableLayers_.forEach(function (layer) {
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


    this.getViewport().style.cursor = 'wait';
    var writer = new WKT();
    const options = {dataProjection: 'EPSG:2169', featureProjection: 'EPSG:3857'};

    var params = {
      'layers': layersToQuery.join(),
      'geometry': writer.writeGeometry(evt.feature.getGeometry(), options)
    };
    var url = document.createElement('A');
    url.href = lux.queryUrl;

    Object.keys(params).forEach(function (key) {
      url.search = url.search + '&' + key + '=' + params[key];
    });
    fetch(url.toString()).then(function (resp) {
      return resp.json();
    }).then(function (json) {
      this.getViewport().style.cursor = '';
      callback.call(this, json);
    }.bind(this));
  }

  /**
   * @param {Style|Array.<Style>|ol.StyleFunction|null|undefined}
   *      style The style of the show layer.
   * @export
   * @api
   */
  setShowlayerStyle(style) {
    this.showLayer_.setStyle(style);
  }


  /**
   * @param {Object} evt The event.
   * @private
   */
  handleDrawendEvent_(evt) {
    if (!this.queryOnDrawEnd_) {
      return;
    }
    this.removeInfoPopup();

    this.showLayer_.getSource().clear();

    this.getFeatureInfoByGeometry(evt, function (json) {
      if (!json || !json.length) {
        this.showLayer_.getSource().clear();
        return;
      }
      // each item in the result corresponds to a layer
      var htmls = [];
      json.forEach(function (resultLayer) {
        var curHtml = undefined;
        if ('tooltip' in resultLayer) {
          if (this.popupTarget_ !== undefined && this.popupClass_ !== undefined) {
            curHtml = '<div class="' + this.popupClass_ +
              '_' + resultLayer['layer'] + '">' +
              resultLayer['tooltip'] + '</div>';
          } else {
            curHtml = resultLayer['tooltip'];
          }
        }
        var features = this.readJsonFeatures_(resultLayer);

        if (features.length != 0) {
          this.showLayer_.getSource().addFeatures(features);
          if (this.showLayerInfoPopup_ && this.popupContentTransformer_ !== undefined) {
            curHtml = this.popupContentTransformer_.call(this, resultLayer, features, curHtml);
          }
        }
        if (curHtml !== undefined) {
          htmls.push(curHtml);
        }
        if (this.layerInfoCb_ !== undefined) {
          if (features.length > 0) {
            this.layerInfoCb_.call(this, features);
          }
        }
      }.bind(this));
      if (this.showLayerInfoPopup_) {
        if (this.popupTarget_) {
          this.popupTarget_.innerHTML = htmls.join('');
        } else {
          var element = lux.buildPopupLayout(htmls.join('<hr>'), function () {
            this.removeOverlay(this.queryPopup_);
          }.bind(this));
          this.queryPopup_ = new Overlay({
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
      }
    }.bind(this));

  }


  /**
   * @param {Object} evt The event.
   * @private
   */
  handleSingleclickEvent_(evt) {
    this.removeInfoPopup();
    if (!this.queryOnClick_) {
      return;
    }
    if ((this.curDrawInteraction_ !== undefined) || (!this.showLayerInfoPopup_ && this.layerInfoCb_ === undefined)) {
      return;
    }
    this.showLayer_.getSource().clear();
    this.getFeatureInfo(evt, function (json) {
      if (!json || !json.length) {
        this.showLayer_.getSource().clear();
        return;
      }
      // each item in the result corresponds to a layer
      var htmls = [];
      json.forEach(function (resultLayer) {
        var curHtml = undefined;
        if ('tooltip' in resultLayer) {
          if (this.popupTarget_ !== undefined && this.popupClass_ !== undefined) {
            curHtml = '<div class="' + this.popupClass_ +
              '_' + resultLayer['layer'] + '">' +
              resultLayer['tooltip'] + '</div>';
          } else {
            curHtml = resultLayer['tooltip'];
          }
        }
        var features = this.readJsonFeatures_(resultLayer);
        if (this.layerInfoCb_ !== undefined) {
          if (features.length > 0) {
            this.layerInfoCb_.call(this, features);
          }
        }

        if (features.length != 0) {
          if (this.showSelectedFeature_) {
            var iFeature = 0;
            features.forEach(function(feature){
              if (feature.getId()==null) {
                iFeature++;
                feature.setId(""+iFeature);
              }
            });
            this.showLayer_.getSource().addFeatures(features);
          }
          if (this.showLayerInfoPopup_ && this.popupContentTransformer_ !== undefined) {
            curHtml = this.popupContentTransformer_.call(this, resultLayer, features, curHtml);
          }
        }
        if (curHtml !== undefined && curHtml !== null && curHtml.length > 0) {
          htmls.push(curHtml);
        }
      }.bind(this));
      if (this.showLayerInfoPopup_) {
        if (htmls.length > 0) {
          if (this.popupTarget_) {
            this.popupTarget_.innerHTML = htmls.join('');
          } else {
            var element = lux.buildPopupLayout(htmls.join('<hr>'), function () {
              this.removeOverlay(this.queryPopup_);
            }.bind(this));
            this.queryPopup_ = new Overlay({
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
        }
      }
    }.bind(this));

  }

  /**
   * Set the center of the current view in EPSG:2169.
   * @param {ol.Coordinate} coordinate The coordinate of the center.
   * @param {number|undefined} zoom The zoom numer.
   * @param {string|number|undefined} positionSrs The projection of the position coordinates.
   * Default is `2169`.
   * @export
   * @api
   */
  setCenter(coordinate, zoom, positionSrs) {
    var lonlat = /** @type {ol.Coordinate} */
      (proj.transform(coordinate,
        (positionSrs !== undefined) ? 'EPSG:' + positionSrs.toString() : 'EPSG:2169', 'EPSG:3857'));
    this.getView().setCenter(lonlat);
    if (zoom !== undefined) {
      this.getView().setZoom(zoom);
    }
  }

  /**
   * Destroy the map.
   * @export
   * @api
   */
  destroyMap() {
    var target = this.getTarget();
    var elem = document.getElementById(target);
    this.setTarget(null);
    while (elem.firstChild) {
      elem.removeChild(elem.lastChild);
    }
  }


  /**
   * Transforms features into geojson
   * @param {Array.<ol.Feature>} fArray features array.
   * @param {olx.format.GeoJSONOptions=} opt_options Options.
   * @param {boolean=} exportMeasures True if length and area should be added to attributes.
   * @return {string} The geojson string.
   * @export
   * @api
   */
  exportGeoJSON(fArray, opt_options, exportMeasures) {
    let options = opt_options;
    if (opt_options == undefined) {
      options = {dataProjection: 'EPSG:4326', featureProjection: this.getView().getProjection()};
    }
    if (exportMeasures === true && fArray !== null && fArray !== undefined) {
      fArray.forEach(function (feature) {
        feature.set('__length__', this.getGeometryLength(feature.getGeometry()));
        feature.set('__area__', this.getGeometryArea(feature.getGeometry()));
      }, this);
    }
    const writer = new GeoJSON(options);
    return writer.writeFeatures(fArray);
  }
  /**
   * Fit the map to an extent. The default extent is content of a vector layer.
   * @param {ol.Extent | undefined} extent The extent to fit on. Default is the one of the drawing layer.
   * @param {object | undefined} opt_options Options.
   * @export
   * @api
   */
  fit = function(extent, opt_options) {
    let curExtent = undefined;
    if (extent !== undefined && extent !== null) {
      curExtent = extent;
    } else {
      let curExtentDL = this.getDrawingLayer().getSource().getExtent();
      let curExtentSL = this.getShowLayer().getSource().getExtent();
      if (!ol.extent.isEmpty(curExtentDL) && !ol.extent.isEmpty(curExtentSL)) {
        curExtent = ol.extent.extend(curExtentDL, curExtentSL)
      } else if (!ol.extent.isEmpty(curExtentDL)) {
        curExtent = curExtentDL;
      } else if (!ol.extent.isEmpty(curExtentSL)) {
        curExtent = curExtentSL;
      }
      
      this.showVectorLayerArray_.forEach(function(curLayer) {
        if (curExtent !== undefined && curExtent !== null) {
          if (!ol.extent.isEmpty(curLayer.getSource().getExtent())) {
            curExtent = ol.extent.extend(curExtent, curLayer.getSource().getExtent());
          }
        } else {
          if (!ol.extent.isEmpty(curLayer.getSource().getExtent())) {
            curExtent = curLayer.getSource().getExtent();
          }
        }
      }.bind(this));
      this.getLayers().forEach(function(layer) {
          if(layer instanceof ol.layer.Group) {
              layer.getLayers().forEach(function(groupLayer) {
                  if(layer instanceof ol.layer.Vector) {
                    if (curExtent !== undefined && curExtent !== null) {
                      ol.extent.extend(curExtent, groupLayer.getSource().getExtent());
                    } else {
                      curExtent = groupLayer.getSource().getExtent();
                    }
                  }
              });
          } else {
            if(layer instanceof ol.layer.Vector) {
              if (curExtent !== undefined && curExtent !== null) {
                ol.extent.extend(curExtent, layer.getSource().getExtent());
              } else {
                curExtent = layer.getSource().getExtent();
              }
            }
          }
      });
    }
    if (curExtent !== undefined && !ol.extent.isEmpty(curExtent)) {
      this.getView().fit(curExtent, opt_options);
    }
  }
}
export default Map;

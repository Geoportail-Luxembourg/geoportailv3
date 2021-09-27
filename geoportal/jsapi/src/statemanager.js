import lux from './index.js';
import CollectionEventType from 'ol/CollectionEventType';
import {listen, unlistenByKey} from 'ol/events';
import {assign} from 'ol/obj';


/**
 * @typedef {Object} State
 * @property {number} X
 * @property {number} Y
 * @property {number} zoom
 * @property {Array<number>} layers
 * @property {Array<number>} opacities
 * @property {string} bgLayer
 */


/**
 * @classdesc
 * @constructor
 */
export default class StateManager {

  constructor() {
    /**
     * @type {lux.Map}
     */
    this.map_ = null;

    /**
     * @type {State}
     */
    this.state_ = {};

    /**
     * @type {string}
     * @private
     */
    this.url_ = '';
  }

  /**
   * @param {lux.Map} map The map.
   */
  setMap(map) {
    this.map_ = map;
    var view = map.getView();

    function onViewUpdate() {
      var center = view.getCenter();
      var zoom = view.getZoom();
      var object = {};
      object['X'] = Math.round(center[0]);
      object['Y'] = Math.round(center[1]);
      object['zoom'] = zoom;
      this.updateState(object);
    }

    // make sure the state is updated the first time
    onViewUpdate.call(this);

    listen(view, 'propertychange',
      lux.debounce(onViewUpdate, 250).bind(this));

    var layersListenerKeys = [];

    function onLayersUpdate() {
      // remove any listener on visibility change
      layersListenerKeys.forEach(key => unlistenByKey(key));
      layersListenerKeys.length = 0;

      var object = {};
      var layers = [];
      var opacities = [];
      map.getLayers().forEach(function (layer, index) {
        // first layer is bg layer
        if (index === 0) {
          object['bgLayer'] = layer.get('name');
        } else {
          layers.unshift(layer.get('id'));
          opacities.unshift(layer.get('visible') ? layer.getOpacity() : 0);
          layersListenerKeys[layer.get('id')] = listen(
            layer,
            'change:visible',
            onLayersUpdate,
            this);
        }
        if (layer.get('metadata') !== undefined &&
          layer.get('metadata')['attribution'] !== undefined) {
          var source = layer.getSource();
          source.setAttributions(
            layer.get('metadata')['attribution']
          );
        }
      }.bind(this));
      object['layers'] = layers.join('-');
      object['opacities'] = opacities.join('-');
      this.updateState(object);
    }

    listen(map.getLayers(), CollectionEventType.ADD,
      onLayersUpdate, this);
    listen(map.getLayers(), CollectionEventType.REMOVE,
      onLayersUpdate, this);
  }

  /**
   * @param {string} id The mymap id.
   */
  setMyMap(id) {
    this.updateState({'map_id': id});
  }

  /**
   * Updates the attribution logo href.
   * @param {State} object The params to update.
   */
  updateState(object) {
    if (this.state_ !== null) {
      assign(this.state_, object);

      console.assert(this.state_);

      var el = this.map_.getTargetElement();
      var logo = el.querySelectorAll('.ol-attribution a')[0];

      this.url_ = 'https://map.geoportail.lu/theme/main?';
      this.url_ += Object.keys(this.state_).map(function (key) {
        return key + '=' + encodeURIComponent(this.state_[key]);
      }.bind(this)).join('&');
      this.url_ += '&version=3';

      if (logo) {
        logo.href = this.url_;
        logo.target = '_blank';
      }
    }
  }

  /**
   * @return {string} the url to the map
   */
  getUrl() {
    return this.url_;
  }
}

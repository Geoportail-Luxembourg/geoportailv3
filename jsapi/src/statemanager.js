goog.provide('lux.StateManager');

goog.require('lux');
goog.require('ol.CollectionEventType');
goog.require('ol.events');


/**
 * @classdesc
 * @constructor
 */
lux.StateManager = function() {

  /**
   * @type {lux.Map}
   */
  this.map_ = null;

  /**
   * @type {luxx.State}
   */
  this.state_ = {};

  /**
   * @type {string}
   * @private
   */
  this.url_ = '';
};

/**
 * @param {lux.Map} map The map.
 */
lux.StateManager.prototype.setMap = function(map) {
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

  ol.events.listen(view, 'propertychange',
      lux.debounce(onViewUpdate, 250).bind(this));

  var layersListenerKeys = [];

  function onLayersUpdate() {
    // remove any listener on visibility change
    layersListenerKeys.forEach(function(key) {
      ol.events.unlistenByKey(key);
    });
    layersListenerKeys.length = 0;

    var object = {};
    var layers = [];
    var opacities = [];
    map.getLayers().forEach(function(layer, index) {
      // first layer is bg layer
      if (index === 0) {
        object['bgLayer'] = layer.get('name');
      } else {
        layers.unshift(layer.get('id'));
        opacities.unshift(layer.get('visible') ? layer.getOpacity() : 0);
        layersListenerKeys[layer.get('id')] = ol.events.listen(
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

  ol.events.listen(map.getLayers(), ol.CollectionEventType.ADD,
    onLayersUpdate, this);
  ol.events.listen(map.getLayers(), ol.CollectionEventType.REMOVE,
    onLayersUpdate, this);
};

/**
 * @param {string} id The mymap id.
 */
lux.StateManager.prototype.setMyMap = function(id) {
  this.updateState({'map_id': id});
};

/**
 * Updates the attribution logo href.
 * @param {luxx.State} object The params to update.
 */
lux.StateManager.prototype.updateState = function(object) {
  goog.object.extend(this.state_, object);

  goog.asserts.assertObject(this.state_);

  var el = this.map_.getTargetElement();
  var logo = el.querySelectorAll('.ol-attribution a')[0];

  this.url_ = 'https://map.geoportail.lu/theme/main?';
  this.url_ += Object.keys(this.state_).map(function(key) {
    return key + '=' + encodeURIComponent(this.state_[key]);
  }.bind(this)).join('&');
  this.url_ += '&version=3';

  if (logo) {
    logo.href = this.url_;
    logo.target = '_blank';
  }
};

/**
 * @return {string} the url to the map
 */
lux.StateManager.prototype.getUrl = function() {
  return this.url_;
};

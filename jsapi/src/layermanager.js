goog.provide('lux.LayerManager');

goog.require('goog.dom');
goog.require('ol.control.Control');

/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ControlOptions} options Layer manager options.
 * @export
 */
lux.LayerManager = function(options) {
  var element = goog.dom.createDom('UL');
  element.classList.add('lux-layer-manager');

  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });
};

goog.inherits(lux.LayerManager, ol.control.Control);


/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
lux.LayerManager.prototype.setMap = function(map) {
  ol.control.Control.prototype.setMap.call(this, map);
  if (map) {
    var layers = map.getLayers();
    this.listenerKeys.push(
        ol.events.listen(layers, ol.Collection.EventType.ADD,
            this.update, this),
        ol.events.listen(layers, ol.Collection.EventType.REMOVE,
            this.update, this)
    );
    this.update();
  }
};


/**
 * Update the component adequately.
 */
lux.LayerManager.prototype.update = function() {
  goog.dom.removeChildren(this.element);
  // get the layers list in reverse order and with background excluded
  var layers = this.getMap().getLayers().getArray().slice(1).reverse();
  layers.forEach(function(layer) {
    var li = document.createElement('li');

    var label = document.createElement('label');
    var name = /** @type {string} */ (layer.get('name'));
    label.innerHTML = lux.i18n[name];
    li.appendChild(label);

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = layer.get('visible');
    input.onchange = function(e) {
      layer.set('visible', e.target.checked);
    };
    label.insertBefore(input, label.firstChild);

    this.element.appendChild(li);
  }, this);
};

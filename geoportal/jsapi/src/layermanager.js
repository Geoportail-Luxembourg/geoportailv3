goog.provide('lux.LayerManager');

goog.require('lux');
goog.require('ol');
goog.require('ol.control.Control');
goog.require('ol.events');
goog.require('ol.CollectionEventType');


/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ControlOptions} options Layer manager options.
 * @export
 */
lux.LayerManager = function(options) {
  var element = document.createElement('UL');
  element.classList.add('lux-layer-manager');

  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });
};

ol.inherits(lux.LayerManager, ol.control.Control);


/**
 * @inheritDoc
 */
lux.LayerManager.prototype.setMap = function(map) {
  ol.control.Control.prototype.setMap.call(this, map);
  if (map) {
    var layers = map.getLayers();
    this.listenerKeys.push(
        ol.events.listen(layers, ol.CollectionEventType.ADD,
            this.update, this),
        ol.events.listen(layers, ol.CollectionEventType.REMOVE,
            this.update, this)
    );
    this.update();
  }
};


/**
 * Update the component adequately.
 */
lux.LayerManager.prototype.update = function() {
  while (this.element.firstChild) {
    this.element.removeChild(this.element.firstChild);
  }
  // get the layers list in reverse order and with background excluded
  var layers = this.getMap().getLayers().getArray().slice(1).reverse();
  layers.forEach(function(layer) {
    var li = document.createElement('li');

    var label = document.createElement('label');
    var name = /** @type {string} */ (layer.get('name'));

    if (lux.lang in lux.languages &&
        lux.languages[lux.lang][name] !== undefined) {
      label.innerHTML = lux.languages[lux.lang][name];
    } else {
      label.innerHTML = name;
    }

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

/**
 * @module lux.LayerManager
 */
import luxBase from './index.js';
import olBase from 'ol.js';
import olControlControl from 'ol/control/Control.js';
import olEvents from 'ol/events.js';
import olCollectionEventType from 'ol/CollectionEventType.js';

/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ControlOptions} options Layer manager options.
 * @export
 */
const exports = function(options) {
  var element = document.createElement('UL');
  element.classList.add('lux-layer-manager');

  olControlControl.call(this, {
    element: element,
    target: options.target
  });
};

olBase.inherits(exports, olControlControl);


/**
 * @inheritDoc
 */
exports.prototype.setMap = function(map) {
  olControlControl.prototype.setMap.call(this, map);
  if (map) {
    var layers = map.getLayers();
    this.listenerKeys.push(
        olEvents.listen(layers, olCollectionEventType.ADD,
            this.update, this),
        olEvents.listen(layers, olCollectionEventType.REMOVE,
            this.update, this)
    );
    this.update();
  }
};


/**
 * Update the component adequately.
 */
exports.prototype.update = function() {
  while (this.element.firstChild) {
    this.element.removeChild(this.element.firstChild);
  }
  // get the layers list in reverse order and with background excluded
  var layers = this.getMap().getLayers().getArray().slice(1).reverse();
  layers.forEach(function(layer) {
    var li = document.createElement('li');

    var label = document.createElement('label');
    var name = /** @type {string} */ (layer.get('name'));

    if (luxBase.lang in luxBase.languages &&
        luxBase.languages[luxBase.lang][name] !== undefined) {
      label.innerHTML = luxBase.languages[luxBase.lang][name];
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


export default exports;

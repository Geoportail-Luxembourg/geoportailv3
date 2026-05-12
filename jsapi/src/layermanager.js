
import lux from './index.js';
import Control from 'ol/control/Control';
import {listen} from 'ol/events';
import CollectionEventType from 'ol/CollectionEventType';


export default class LayerManager extends Control {

  /**
   * @constructor
   * @param {olx.control.ControlOptions} options Layer manager options.
   * @export
   */
  constructor(options) {
    var element = document.createElement('UL');
    element.classList.add('lux-layer-manager');

    super({
      element: element,
      target: options.target
    });
  }

  /**
   * @inheritDoc
   */
  setMap(map) {
    super.setMap(map);
    if (map) {
      var layers = map.getLayers();
      this.listenerKeys.push(
        listen(layers, CollectionEventType.ADD, this.update, this),
        listen(layers, CollectionEventType.REMOVE, this.update, this)
      );
      this.update();
    }
  }


  /**
   * Update the component adequately.
   */
  update() {
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
    // get the layers list in reverse order and with background excluded
    var layers = this.getMap().getLayers().getArray().slice(1).reverse();
    layers.forEach(function (layer) {
      var li = document.createElement('li');

      var label = document.createElement('label');
      var name = /** @type {string} */ (layer.get('name'));
      li.classList.add(layer.get("__source__") || 'custom');
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
      input.onchange = function (e) {
        layer.set('visible', e.target.checked);
      };
      label.insertBefore(input, label.firstChild);

      this.element.appendChild(li);
    }, this);
  }
}

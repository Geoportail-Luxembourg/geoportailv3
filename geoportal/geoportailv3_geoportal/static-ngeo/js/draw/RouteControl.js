/**
 * @module app.draw.RouteControl
 */
/**
 * @fileoverview This file defines the geolocation control.
 *
 */


import {CLASS_UNSELECTABLE, CLASS_CONTROL} from 'ol/css.js';
import olControlControl from 'ol/control/Control.js';
import {listen} from 'ol/events.js';

class RouteControl extends olControlControl{
  /**
   * @constructor
   * @extends {ol.control.Control}
   * @param {app.draw.RouteControlOptions} options Location Control
   * options.
   * @ngInject
   */
  constructor(options) {

    super({
      target: options.target
    });

    var className = options.className !== undefined ? options.className :
        'route-button';

    /**
     * @type {app.interaction.DrawRoute}
     * @private
     */
    this.drawLineInteraction_ = options.drawLineInteraction;

    var label = options.label !== undefined ? options.label : 'L';
    var tipLabel = options.tipLabel !== undefined ?
        options.tipLabel : 'Route';
    var button = document.createElement('BUTTON');
    button.appendChild(document.createTextNode(label));
    button.setAttribute('type', 'button');
    button.setAttribute('title', tipLabel);

    var cssClasses = className + ' ' + CLASS_UNSELECTABLE + ' ' +
        CLASS_CONTROL + ' ' +
        (this.drawLineInteraction_.getMapMatching() ? 'route-on' : '');

    /**
     * @type {!Element}
     */
    this.element = document.createElement('DIV');
    this.element.setAttribute('class', cssClasses);
    this.element.appendChild(button);

    listen(button, 'click',
        this.handleClick_, this);

    listen(button, 'mouseout', function() {
      this.blur();
    });

  };


  /**
   * @param {ol.MapBrowserEvent} event The event to handle
   * @private
   */
  handleClick_(event) {
    event.preventDefault();
    this.drawLineInteraction_.toggleMapMatching();
    this.element.classList.toggle('route-on');
  };
}

export default RouteControl;

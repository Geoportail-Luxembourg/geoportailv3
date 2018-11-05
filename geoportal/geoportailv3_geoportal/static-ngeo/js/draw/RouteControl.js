/**
 * @module app.draw.RouteControl
 */
/**
 * @fileoverview This file defines the geolocation control.
 *
 */

import olBase from 'ol.js';
import olCss from 'ol/css.js';
import olControlControl from 'ol/control/Control.js';
import {listen} from 'ol/events.js';

/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {app.draw.RouteControlOptions} options Location Control
 * options.
 * @ngInject
 */
const exports = function(options) {
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

  var cssClasses = className + ' ' + olCss.CLASS_UNSELECTABLE + ' ' +
      olCss.CLASS_CONTROL + ' ' +
      (this.drawLineInteraction_.getMapMatching() ? 'route-on' : '');

  /**
   * @type {!Element}
   */
  this.element = document.createElement('DIV');
  this.element.setAttribute('class', cssClasses);
  this.element.appendChild(button);

  listen(button, olEvents.EventType.CLICK,
      this.handleClick_, this);

  listen(button, olEvents.EventType.MOUSEOUT, function() {
    this.blur();
  });

  olControlControl.call(this, {
    element: this.element,
    target: options.target
  });

};

olBase.inherits(exports, olControlControl);


/**
 * @param {ol.MapBrowserEvent} event The event to handle
 * @private
 */
exports.prototype.handleClick_ = function(event) {
  event.preventDefault();
  this.drawLineInteraction_.toggleMapMatching();
  this.element.classList.toggle('route-on');
};


export default exports;

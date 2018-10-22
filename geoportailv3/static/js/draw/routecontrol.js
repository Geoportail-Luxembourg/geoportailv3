/**
 * @fileoverview This file defines the geolocation control.
 *
 */
goog.provide('app.draw.RouteControl');

goog.require('ol');
goog.require('ol.css');
goog.require('ol.control.Control');
goog.require('ol.events');


/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {app.draw.RouteControlOptions} options Location Control
 * options.
 * @ngInject
 */
app.draw.RouteControl = function(options) {
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

  var cssClasses = className + ' ' + ol.css.CLASS_UNSELECTABLE + ' ' +
      ol.css.CLASS_CONTROL + ' ' +
      (this.drawLineInteraction_.getMapMatching() ? 'route-on' : '');

  /**
   * @type {!Element}
   */
  this.element = document.createElement('DIV');
  this.element.setAttribute('class', cssClasses);
  this.element.appendChild(button);

  ol.events.listen(button, ol.events.EventType.CLICK,
      this.handleClick_, this);

  ol.events.listen(button, ol.events.EventType.MOUSEOUT, function() {
    this.blur();
  });

  ol.control.Control.call(this, {
    element: this.element,
    target: options.target
  });

};
ol.inherits(app.draw.RouteControl, ol.control.Control);


/**
 * @param {ol.MapBrowserEvent} event The event to handle
 * @private
 */
app.draw.RouteControl.prototype.handleClick_ = function(event) {
  event.preventDefault();
  this.drawLineInteraction_.toggleMapMatching();
  this.element.classList.toggle('route-on');
};

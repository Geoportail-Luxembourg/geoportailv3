/**
 * @fileoverview This file defines the geolocation control.
 *
 */
goog.provide('app.RouteControl');

goog.require('app.RouteControlOptions');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('ol.css');
goog.require('ol.control.Control');
goog.require('ol.events');


/**
 * @typedef {{className: (string|undefined),
 *     label: (string|undefined),
 *     tipLabel: (string|undefined),
 *     target: (Element|undefined),
 *     drawLineInteraction: app.interaction.DrawRoute
 * }}
 */
app.RouteControlOptions;


/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {app.RouteControlOptions} options Location Control
 * options.
 * @ngInject
 */
app.RouteControl = function(options) {
  var className = goog.isDef(options.className) ? options.className :
      'route-button';
  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = options.window;

  /**
   * @type {app.interaction.DrawRoute}
   * @private
   */
  this.drawLineInteraction_ = options.drawLineInteraction;

  var label = goog.isDef(options.label) ? options.label : 'L';
  var tipLabel = goog.isDef(options.tipLabel) ?
      options.tipLabel : 'Route';
  var button = goog.dom.createDom(goog.dom.TagName.BUTTON, {
    'type': 'button',
    'title': tipLabel
  }, label);

  var cssClasses = className + ' ' + ol.css.CLASS_UNSELECTABLE + ' ' +
      ol.css.CLASS_CONTROL + ' ' +
      (this.drawLineInteraction_.getMapMatching() ? 'route-on' : '');

  /**
   * @type {!Element}
   */
  this.element = goog.dom.createDom(goog.dom.TagName.DIV, cssClasses, button);

  ol.events.listen(button, ol.events.EventType.CLICK,
      this.handleClick_, this);

  ol.events.listen(button, ol.events.EventType.MOUSEOUT, function() {
    this.blur();
  });

  goog.base(this, {
    element: this.element,
    target: options.target
  });

};
goog.inherits(app.RouteControl, ol.control.Control);


/**
 * @param {ol.MapBrowserEvent} event The event to handle
 * @private
 */
app.RouteControl.prototype.handleClick_ = function(event) {
  event.preventDefault();
  this.drawLineInteraction_.toggleMapMatching();
  this.element.classList.toggle('route-on');
};

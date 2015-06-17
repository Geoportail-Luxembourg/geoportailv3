/**
 * @fileoverview This file defines the geolocation control.
 *
 */

goog.require('app.VectorOverlay');
goog.require('app.VectorOverlayMgr');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('ol.Feature');
goog.require('ol.Geolocation');
goog.require('ol.GeolocationProperty');
goog.require('ol.Object');
goog.require('ol.control.Control');
goog.require('ol.geom.Point');


goog.provide('app.LocationControl');


/**
 * @typedef {{className: (string|undefined),
 *     label: (string|undefined),
 *     tipLabel: (string|undefined),
 *     target: (Element|undefined),
 *     vectorOverlayMgr: app.VectorOverlayMgr
 * }}
 */
app.LocationControlOptions;



/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {app.LocationControlOptions} options Location Control
 * options.
 */
app.LocationControl = function(options) {

  var className = goog.isDef(options.className) ? options.className :
      'location-button';

  /**
   * @type {ol.Feature}
   * @private
   */
  this.accuracyFeature_ = new ol.Feature();

  /**
   * @type {ol.Feature}
   * @private
   */
  this.positionFeature_ = new ol.Feature();

  /**
   * @type {ol.Geolocation}
   * @private
   */
  this.geolocation_ = null;

  /**
   * @type {app.VectorOverlay}
   * @private
   */
  this.vectorOverlay_ = options.vectorOverlayMgr.getVectorOverlay();

  var label = goog.isDef(options.label) ? options.label : 'L';
  var tipLabel = goog.isDef(options.tipLabel) ?
      options.tipLabel : 'Location';
  var button = goog.dom.createDom(goog.dom.TagName.BUTTON, {
    'type': 'button',
    'title': tipLabel
  }, label);

  var cssClasses = className + ' ' + ol.css.CLASS_UNSELECTABLE + ' ' +
      ol.css.CLASS_CONTROL + ' ' + 'tracker-off';

  /**
   * @type {!Element}
   */
  this.element = goog.dom.createDom(goog.dom.TagName.DIV, cssClasses, button);

  goog.events.listen(button, goog.events.EventType.CLICK,
      this.handleClick_, false, this);

  goog.events.listen(button, [
    goog.events.EventType.MOUSEOUT,
    goog.events.EventType.FOCUSOUT
  ], function() {
    this.blur();
  }, false);

  goog.base(this, {
    element: this.element,
    target: options.target
  });

};
goog.inherits(app.LocationControl, ol.control.Control);


/**
 * @param {goog.events.BrowserEvent} event The event to handle
 * @private
 */
app.LocationControl.prototype.handleClick_ = function(event) {
  event.preventDefault();
  this.handleCenterToLocation_();
};


/**
 * @private
 */
app.LocationControl.prototype.handleCenterToLocation_ = function() {
  if (goog.isNull(this.geolocation_)) {
    this.initGeoLocation_();
  }
  if (!this.geolocation_.getTracking()) {
    this.initVectorOverlay_();
    this.getMap().getView().setZoom(17);
    this.geolocation_.setTracking(true);
  } else {
    this.clearVectorOverlay_();
    this.geolocation_.setTracking(false);
  }
};


/**
 *
 * @private
 */
app.LocationControl.prototype.initGeoLocation_ = function() {

  this.geolocation_ = new ol.Geolocation({
    projection: this.getMap().getView().getProjection(),
    trackingOptions: /** @type {GeolocationPositionOptions} */ ({
      enableHighAccuracy: true,
      maximumAge: 60000,
      timeout: 7000
    })
  });

  goog.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.TRACKING),
      /**
       * @param {ol.ObjectEvent} e Object event.
       */
      function(e) {
        if (this.geolocation_.getTracking()) {
          goog.dom.classlist.swap(this.element, 'tracker-off', 'tracker-on');
        } else {
          goog.dom.classlist.swap(this.element, 'tracker-on', 'tracker-off');
        }
      }, false, this);

  goog.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.POSITION),
      /**
       * @param {ol.ObjectEvent} e Object event.
       */
      function(e) {
        var position = /** @type {ol.Coordinate} */
            (this.geolocation_.getPosition());
        this.positionFeature_.setGeometry(new ol.geom.Point(position));
        this.getMap().getView().setCenter(position);
      }, false, this);

  goog.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.ACCURACY_GEOMETRY),
      /**
       * @param {ol.ObjectEvent} e Object event.
       */
      function(e) {
        this.accuracyFeature_.setGeometry(
            this.geolocation_.getAccuracyGeometry());
      }, false, this);

};


/**
 * @private
 */
app.LocationControl.prototype.initVectorOverlay_ = function() {
  this.accuracyFeature_.setGeometry(null);
  this.positionFeature_.setGeometry(null);
  this.vectorOverlay_.addFeature(this.accuracyFeature_);
  this.vectorOverlay_.addFeature(this.positionFeature_);
};


/**
 * @private
 */
app.LocationControl.prototype.clearVectorOverlay_ = function() {
  this.vectorOverlay_.clear();
};

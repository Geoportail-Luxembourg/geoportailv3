/**
 * @fileoverview This file defines the geolocation control.
 *
 */
goog.provide('app.LocationControl');

goog.require('app.LocationControlOptions');
goog.require('app.NotifyNotificationType');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('ol.GeolocationProperty');
goog.require('ol.css');
goog.require('ol.Feature');
goog.require('ol.Geolocation');
goog.require('ol.Object');
goog.require('ol.control.Control');
goog.require('ol.events');
goog.require('ol.geom.Point');


/**
 * @typedef {{className: (string|undefined),
 *     label: (string|undefined),
 *     tipLabel: (string|undefined),
 *     target: (Element|undefined),
 *     featureOverlayMgr: ngeo.map.FeatureOverlayMgr,
 *     notify: app.Notify,
 *     gettextCatalog: angularGettext.Catalog,
 *     scope: angular.Scope,
 *     window: angular.$window
 * }}
 */
app.LocationControlOptions;


/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {app.LocationControlOptions} options Location Control
 * options.
 * @ngInject
 */
app.LocationControl = function(options) {
  var className = goog.isDef(options.className) ? options.className :
      'location-button';
  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = options.window;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = options.scope;

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = options.gettextCatalog;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = options.notify;

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
   * @type {ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = options.featureOverlayMgr.getFeatureOverlay();

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
goog.inherits(app.LocationControl, ol.control.Control);


/**
 * @param {ol.MapBrowserEvent} event The event to handle
 * @private
 */
app.LocationControl.prototype.handleClick_ = function(event) {
  event.preventDefault();
  if (this.window_.location.protocol !== 'https:') {
    this.scope_['mainCtrl']['showRedirect'] = true;
  } else {
    this.handleCenterToLocation();
  }
};


/**
 * Active or unactive the tracking.
 */
app.LocationControl.prototype.handleCenterToLocation = function() {
  if (goog.isNull(this.geolocation_)) {
    this.initGeoLocation_();
  }
  if (!this.geolocation_.getTracking()) {
    this.initFeatureOverlay_();
    this.getMap().getView().setZoom(17);
    this.geolocation_.setTracking(true);
  } else {
    this.clearFeatureOverlay_();
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

  ol.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.TRACKING),
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        if (this.geolocation_.getTracking()) {
          goog.dom.classlist.swap(this.element, 'tracker-off', 'tracker-on');
        } else {
          goog.dom.classlist.swap(this.element, 'tracker-on', 'tracker-off');
        }
      }, this);

  ol.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.POSITION),
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        var position = /** @type {ol.Coordinate} */
            (this.geolocation_.getPosition());
        this.positionFeature_.setGeometry(new ol.geom.Point(position));
        this.getMap().getView().setCenter(position);
      }, this);

  ol.events.listen(this.geolocation_,
      ol.Object.getChangeEventType(ol.GeolocationProperty.ACCURACY_GEOMETRY),
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        this.accuracyFeature_.setGeometry(
            this.geolocation_.getAccuracyGeometry());
      }, this);

  ol.events.listen(this.geolocation_,
      ol.events.EventType.ERROR,
      function(e) {
        this.featureOverlay_.clear();
        if (e.message && e.message.length > 0) {
          var msg = this.gettextCatalog_.getString(
              'Erreur lors de l\'acquisition de la position :');
          msg = msg + e.message;
          this.notify_(msg, app.NotifyNotificationType.ERROR);
        }
      }.bind(this));

};


/**
 * @private
 */
app.LocationControl.prototype.initFeatureOverlay_ = function() {
  this.featureOverlay_.clear();
  this.accuracyFeature_.setGeometry(null);
  this.positionFeature_.setGeometry(null);
  this.featureOverlay_.addFeature(this.accuracyFeature_);
  this.featureOverlay_.addFeature(this.positionFeature_);
};


/**
 * @private
 */
app.LocationControl.prototype.clearFeatureOverlay_ = function() {
  this.featureOverlay_.clear();
};

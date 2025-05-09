/**
 * @module app.LocationControl
 */
/**
 * @fileoverview This file defines the geolocation control.
 *
 */

import appNotifyNotificationType from './NotifyNotificationType.js';
import {CLASS_CONTROL, CLASS_UNSELECTABLE} from 'ol/css.js';
import olControlControl from 'ol/control/Control.js';
import {listen} from 'ol/events.js';
import olFeature from 'ol/Feature.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeolocation from 'ol/Geolocation.js';
import {getChangeEventType} from 'ol/Object.js';

/**
 * @enum {string}
 */
const olGeolocationProperty = {
  ACCURACY: 'accuracy',
  ACCURACY_GEOMETRY: 'accuracyGeometry',
  ALTITUDE: 'altitude',
  ALTITUDE_ACCURACY: 'altitudeAccuracy',
  HEADING: 'heading',
  POSITION: 'position',
  PROJECTION: 'projection',
  SPEED: 'speed',
  TRACKING: 'tracking',
  TRACKING_OPTIONS: 'trackingOptions'
};

class LocationControl extends olControlControl {
  /**
   * @constructor
   * @extends {ol.control.Control}
   * @param {app.LocationControlOptions} options Location Control
   * options.
   * @ngInject
   */
  constructor(options) {
    var label = (options.label !== undefined) ? options.label : 'L';
    var tipLabel = (options.tipLabel !== undefined) ?
        options.tipLabel : 'Location';

    var button = document.createElement('BUTTON');
    button.appendChild(document.createTextNode(label));
    button.setAttribute('type', 'button');
    button.setAttribute('title', tipLabel);

    var className = (options.className !== undefined) ? options.className :
        'location-button';

    var cssClasses = className + ' ' + CLASS_UNSELECTABLE + ' ' +
        CLASS_CONTROL + ' ' + 'tracker-off';

    /**
     * @type {!Element}
     */
    var element = document.createElement('DIV');
    element.setAttribute('class', cssClasses);
    element.appendChild(button);
    super({
      element: element,
      target: options.target
    });

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
    this.accuracyFeature_ = new olFeature();

    /**
     * @type {ol.Feature}
     * @private
     */
    this.positionFeature_ = new olFeature();

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
    if (this.window_.location.protocol !== 'https:') {
      this.scope_['mainCtrl']['showRedirect'] = true;
    } else {
      this.handleCenterToLocation();
    }
  };


  /**
   * Active or unactive the tracking.
   */
  handleCenterToLocation() {
    if (this.geolocation_ === null) {
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
  initGeoLocation_() {

    this.geolocation_ = new olGeolocation({
      projection: this.getMap().getView().getProjection(),
      trackingOptions: /** @type {GeolocationPositionOptions} */ ({
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 7000
      })
    });

    listen(this.geolocation_,
        getChangeEventType(olGeolocationProperty.TRACKING),
        /**
         * @param {ol.Object.Event} e Object event.
         */
        function(e) {
          if (this.geolocation_.getTracking()) {
            this.element.classList.remove('tracker-off');
            this.element.classList.add('tracker-on');
          } else {
            this.element.classList.remove('tracker-on');
            this.element.classList.add('tracker-off');
          }
        }, this);

    listen(this.geolocation_,
        getChangeEventType(olGeolocationProperty.POSITION),
        /**
         * @param {ol.Object.Event} e Object event.
         */
        function(e) {
          var position = /** @type {ol.Coordinate} */
              (this.geolocation_.getPosition());
          this.positionFeature_.setGeometry(new olGeomPoint(position));
          this.getMap().getView().setCenter(position);
        }, this);

    listen(this.geolocation_,
        getChangeEventType(olGeolocationProperty.ACCURACY_GEOMETRY),
        /**
         * @param {ol.Object.Event} e Object event.
         */
        function(e) {
          this.accuracyFeature_.setGeometry(
              this.geolocation_.getAccuracyGeometry());
        }, this);

    listen(this.geolocation_,
        'error',
        function(e) {
          this.featureOverlay_.clear();
          if (e.message && e.message.length > 0) {
            var msg = this.gettextCatalog_.getString(
                'Erreur lors de l\'acquisition de la position :');
            msg = msg + e.message;
            this.notify_(msg, appNotifyNotificationType.ERROR);
          }
        }.bind(this));

  };


  /**
   * @private
   */
  initFeatureOverlay_() {
    this.featureOverlay_.clear();
    this.accuracyFeature_.setGeometry(null);
    this.positionFeature_.setGeometry(null);
    this.featureOverlay_.addFeature(this.accuracyFeature_);
    this.featureOverlay_.addFeature(this.positionFeature_);
  };


  /**
   * @private
   */
  clearFeatureOverlay_() {
    this.featureOverlay_.clear();
  };
}

export default LocationControl;

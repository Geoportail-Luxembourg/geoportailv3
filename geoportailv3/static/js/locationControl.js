/**
 * @fileoverview This file defines the geolocation control.
 *
 */
goog.require('ol.control.Control');
goog.require('ol.Geolocation');
goog.require('ol.Feature');
goog.require('ol.FeatureOverlay');


goog.provide('app.LocationControl');

/**
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} opt_options Control options.
 */
app.LocationControl = function(opt_options) {

  var options = opt_options || {};
  var className = goog.isDef(options.className) ? options.className :
      'location-button';
  /**
   * @type {?ol.Geolocation}
   * @private
   */
  this.geolocation_ = null;
  /**
   * @type {?ol.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = null;
  this.positionPoint_ = new ol.geom.Point([0, 0]);
  
  var label = goog.isDef(options.label) ? options.label : 'L';
  var tipLabel = goog.isDef(options.tipLabel) ?
      options.tipLabel : 'Location';
  this.button = goog.dom.createDom(goog.dom.TagName.BUTTON, {
    'type': 'button',
    'title': tipLabel,
    'class': 'tracker-off'
  }, label);


  
  var cssClasses = className + ' ' + ol.css.CLASS_UNSELECTABLE + ' ' +
      ol.css.CLASS_CONTROL;
  
    /**
   * @type {!Element}
   * @private
   */
  var element = goog.dom.createDom(goog.dom.TagName.DIV, cssClasses, this.button);

  goog.events.listen(this.button, goog.events.EventType.CLICK,
      this.handleClick_, false, this);

  goog.events.listen(this.button, [
    goog.events.EventType.MOUSEOUT,
    goog.events.EventType.FOCUSOUT
  ], function() {
    this.blur();
  }, false);

  goog.base(this, {
    element: element,
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
  if (this.geolocation_ == null){
    this.initGeoLocation_();
  }

  if (!this.geolocation_.getTracking()){
    this.initFeatureOverlay_();
    this.getMap().getView().setZoom(17);
    this.geolocation_.setTracking(true);
  }else{
    this.clearFeatureOverlay_();
    this.geolocation_.setTracking(false);
    
  }
};

/**
 *
 * @private
 */
app.LocationControl.prototype.initGeoLocation_ = function() {

  var map = this.getMap();
  var view = map.getView();
  this.geolocation_ = /** @type {ol.Geolocation} */ (new ol.Geolocation({
         projection: view.getProjection()
      }));

  this.geolocation_.on('change:tracking', goog.bind(function(e) {
    
    if(this.geolocation_.getTracking()){
      goog.dom.classlist.swap(this.button, "tracker-off", "tracker-on");
    }else{
      goog.dom.classlist.swap(this.button, "tracker-on", "tracker-off");
    }
  },this));
  this.geolocation_.on('change:position', goog.bind(function(e) {
    var position = /** @type {ol.Coordinate} */ 
      (this.geolocation_.getPosition());

    this.positionPoint_.setCoordinates(position);
    view.setCenter(position);
  },this));
}
/**
 *
 * @private
 */
app.LocationControl.prototype.initFeatureOverlay_ = function() {

  var map = this.getMap();
  var positionFeature = new ol.Feature(this.positionPoint_);

  var accuracyFeature = new ol.Feature();
  accuracyFeature.bindTo('geometry', this.geolocation_, 'accuracyGeometry');

  this.featureOverlay_ = new ol.FeatureOverlay({
    features: [positionFeature, accuracyFeature]
  });
  this.featureOverlay_.setMap(map);
}
/**
 *
 * @private
 */
app.LocationControl.prototype.clearFeatureOverlay_ = function() {
  if (this.featureOverlay_!=null){
    var features = this.featureOverlay_.getFeatures();
    if (features != null){
      features.clear();
    }
  }
}

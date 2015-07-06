/**
 * @fileoverview This file provides a service that wraps an "unmanaged" vector
 * layer, used as a shared vector layer accross the application.
 */
goog.provide('app.VectorOverlay');
goog.provide('app.VectorOverlayMgr');

goog.require('app');
goog.require('goog.object');
goog.require('ol.Feature');
goog.require('ol.layer.Vector');
goog.require('ol.source.Vector');
goog.require('ol.style.Style');
goog.require('ol.style.StyleFunction');


/**
 * @typedef {{
 *  styleFunction: ol.style.StyleFunction,
 *  features: Object.<string, ol.Feature>
 * }}
 */
app.VectorOverlayGroup;



/**
 * @constructor
 */
app.VectorOverlayMgr = function() {

  /**
   * @type {Object.<string, number>}
   * @private
   */
  this.featureUidToGroupIndex_ = {};

  /**
   * @type {Array.<app.VectorOverlayGroup>}
   * @private
   */
  this.groups_ = [];

  /**
   * @type {ol.source.Vector}
   * @private
   */
  this.source_ = new ol.source.Vector();

  /**
   * @type {ol.layer.Vector}
   * @private
   */
  this.layer_ = new ol.layer.Vector({
    source: this.source_,
    style: goog.bind(this.styleFunction_, this),
    useSpatialgroupIndex: false
  });

};


/**
 * @param {ol.Feature} feature The feature to add.
 * @param {number} groupIndex The group groupIndex.
 * @protected
 */
app.VectorOverlayMgr.prototype.addFeature = function(feature, groupIndex) {
  goog.asserts.assert(groupIndex >= 0);
  goog.asserts.assert(groupIndex < this.groups_.length);
  var featureUid = goog.getUid(feature).toString();
  this.featureUidToGroupIndex_[featureUid] = groupIndex;
  this.groups_[groupIndex].features[featureUid] = feature;
  this.source_.addFeature(feature);
};


/**
 * @param {ol.Feature} feature The feature to add.
 * @param {number} groupIndex The group groupIndex.
 * @protected
 */
app.VectorOverlayMgr.prototype.removeFeature = function(feature, groupIndex) {
  goog.asserts.assert(groupIndex >= 0);
  goog.asserts.assert(groupIndex < this.groups_.length);
  var featureUid = goog.getUid(feature).toString();
  delete this.featureUidToGroupIndex_[featureUid];
  delete this.groups_[groupIndex].features[featureUid];
  this.source_.removeFeature(feature);
};


/**
 * @param {number} groupIndex The group groupIndex.
 * @protected
 */
app.VectorOverlayMgr.prototype.clear = function(groupIndex) {
  goog.asserts.assert(groupIndex >= 0);
  goog.asserts.assert(groupIndex < this.groups_.length);
  var group = this.groups_[groupIndex];
  for (var featureUid in group.features) {
    this.removeFeature(group.features[featureUid], groupIndex);
  }
  goog.asserts.assert(goog.object.isEmpty(group.features));
};


/**
 * @return {ol.layer.Vector} The vector layer used internally.
 */
app.VectorOverlayMgr.prototype.getLayer = function() {
  return this.layer_;
};


/**
 * @return {app.VectorOverlay} Vector overlay.
 */
app.VectorOverlayMgr.prototype.getVectorOverlay = function() {
  var groupIndex = this.groups_.length;
  this.groups_.push({
    styleFunction: ol.style.defaultStyleFunction,
    features: {}
  });
  return new app.VectorOverlay(this, groupIndex);
};


/**
 * @param {ol.Map} map Map.
 */
app.VectorOverlayMgr.prototype.init = function(map) {
  this.layer_.setMap(map);
};


/**
 * @param {ol.style.Style|Array.<ol.style.Style>|ol.style.StyleFunction} style
 * Style.
 * @param {number} groupIndex Group index.
 * @protected
 */
app.VectorOverlayMgr.prototype.setStyle = function(style, groupIndex) {
  goog.asserts.assert(groupIndex >= 0);
  goog.asserts.assert(groupIndex < this.groups_.length);
  this.groups_[groupIndex].styleFunction = goog.isNull(style) ?
      ol.style.defaultStyleFunction : ol.style.createStyleFunction(style);
};


/**
 * @param {ol.Feature} feature Feature.
 * @param {number} resolution Resolution.
 * @return {Array.<ol.style.Style>} Styles.
 * @private
 */
app.VectorOverlayMgr.prototype.styleFunction_ = function(feature, resolution) {
  var featureUid = goog.getUid(feature).toString();
  goog.asserts.assert(featureUid in this.featureUidToGroupIndex_);
  var groupIndex = this.featureUidToGroupIndex_[featureUid];
  var group = this.groups_[groupIndex];
  return group.styleFunction(feature, resolution);
};



/**
 * @constructor
 * @param {app.VectorOverlayMgr} manager The vector overlay manager.
 * @param {number} index This vector overlay's index.
 */
app.VectorOverlay = function(manager, index) {

  /**
   * @type {app.VectorOverlayMgr}
   * @private
   */
  this.manager_ = manager;

  /**
   * @type {number}
   * @private
   */
  this.index_ = index;
};


/**
 * Add a feature to the vector overlay.
 * @param {ol.Feature} feature The feature to add.
 */
app.VectorOverlay.prototype.addFeature = function(feature) {
  this.manager_.addFeature(feature, this.index_);
};


/**
 * Remove a feature from the vector overlay.
 * @param {ol.Feature} feature The feature to add.
 */
app.VectorOverlay.prototype.removeFeature = function(feature) {
  this.manager_.removeFeature(feature, this.index_);
};


/**
 * Remove all the features from the vector overlay.
 */
app.VectorOverlay.prototype.clear = function() {
  this.manager_.clear(this.index_);
};


/**
 * Set a style for the vector overlay.
 * @param {ol.style.Style|Array.<ol.style.Style>|ol.style.StyleFunction} style
 * Style.
 */
app.VectorOverlay.prototype.setStyle = function(style) {
  this.manager_.setStyle(style, this.index_);
};


app.module.service('appVectorOverlayMgr', app.VectorOverlayMgr);

/**
 * TODO
 */

goog.provide('app.MymapsOffline');

goog.require('app');
goog.require('app.Mymaps');


/**
 * @constructor
 * @param {app.Mymaps} appMymaps app mymaps service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @ngInject
 */
app.MymapsOffline = function(appMymaps, appDrawnFeatures) {
  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {app.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {Object}
   * @private
   */
  this.storage_ = window.localStorage;
}

/**
 * Save data to local storage
 */
app.MymapsOffline.prototype.save = function() {
  var myMapsAllcategories = JSON.stringify(this.appMymaps_.allcategories);
  var myMapsMapInfo = JSON.stringify(this.appMymaps_.getMapInfo());
  var myMapsMapFeatures = JSON.stringify(this.appMymaps_.getMapFeatures());
  this.storage_.setItem('myMapsallCategories', myMapsAllcategories);
  this.storage_.setItem('myMapsMapInfo', myMapsMapInfo);
  this.storage_.setItem('myMapsMapFeatures', myMapsMapFeatures);
};

/**
 * Retore on the map data from local storage
 */
app.MymapsOffline.prototype.restore = function() {
  var myMapsAllcategories = this.storage_.getItem('myMapsallCategories');
  var myMapsMapInfo = this.storage_.getItem('myMapsMapInfo');
  var myMapsMapFeatures = this.storage_.getItem('myMapsMapFeatures');
  if (myMapsAllcategories) {
    myMapsAllcategories = /** @type {Array<(Object|null)>} */ (JSON.parse(myMapsAllcategories));
    this.appMymaps_.allcategories = (myMapsAllcategories);
  }
  if (myMapsMapInfo) {
    myMapsMapInfo = /** @type {Object} */ (JSON.parse(myMapsMapInfo));
    this.appMymaps_.setMapInformation(myMapsMapInfo);
  };
  if(myMapsMapFeatures) {
    myMapsMapFeatures = JSON.parse(myMapsMapFeatures);
    this.appMymaps_.setFeatures(myMapsMapFeatures, this.drawnFeatures_.getCollection());
  }
};

app.module.service('appMymapsOffline', app.MymapsOffline);

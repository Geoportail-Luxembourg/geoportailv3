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

  /**
   * @type {string}
   * @private
   */
  this.storageGroupeKey_ = 'offline_mymaps';
}

/**
 * Save data to local storage
 */
app.MymapsOffline.prototype.save = function() {
  var item = JSON.stringify({
    'allCategories': this.appMymaps_.allcategories,
    'mapInfo': this.appMymaps_.getMapInfo(),
    'mapFeatures': this.appMymaps_.getMapFeatures()
  });
  this.storage_.setItem(this.storageGroupeKey_, item);
};

/**
 * Restore on the map data from local storage
 */
app.MymapsOffline.prototype.restore = function() {
  var storedItem = this.storage_.getItem(this.storageGroupeKey_);
  if (!storedItem) {
    return;
  }
  storedItem = JSON.parse(storedItem);

  var allcategories = /** @type {Array<(Object|null)>} */ (storedItem['allCategories']);
  if (allcategories) {
    this.appMymaps_.allcategories = (allcategories);
  };

  var mapInfo = /** @type {Object} */ (storedItem['mapInfo']);
  if (mapInfo) {
    this.appMymaps_.setMapInformation(mapInfo);
  };

  var mapFeatures = storedItem['mapFeatures'];
  if (mapFeatures) {
    this.appMymaps_.setFeatures(mapFeatures, this.drawnFeatures_.getCollection());
  };
};

app.module.service('appMymapsOffline', app.MymapsOffline);

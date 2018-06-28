goog.provide('app.MymapsOffline');

goog.require('app');
goog.require('app.Mymaps');
goog.require('ngeo.offline.DefaultConfiguration');


/**
 * @constructor
 * @param {app.Mymaps} appMymaps app mymaps service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {ngeo.offline.DefaultConfiguration} ngeoOfflineConfiguration ngeo Offline Configuration
 * @ngInject
 */
app.MymapsOffline = function(appMymaps, appDrawnFeatures, ngeoOfflineConfiguration) {
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
   * @type {ngeo.offline.DefaultConfiguration}
   * @private
   */
  this.ngeoOfflineConfiguration_ = ngeoOfflineConfiguration;

  /**
   * @type {string}
   * @private
   */
  this.storageGroupeKey_ = 'offline_mymaps';
}

/**
 * Save data into the storage system.
 */
app.MymapsOffline.prototype.save = function() {
  var item = {
    'allCategories': this.appMymaps_.allcategories,
    'mapInfo': this.appMymaps_.getMapInfo(),
    'mapFeatures': this.appMymaps_.getMapFeatures(),
    'mapId': this.appMymaps_.getMapId()
  };
  this.ngeoOfflineConfiguration_.setItem(this.storageGroupeKey_, item);
};

/**
 * Restore on the map and on the mymaps component the data from the storage.
 */
app.MymapsOffline.prototype.restore = function() {
  this.ngeoOfflineConfiguration_.getItem(this.storageGroupeKey_).then((storedItem) => {
    if (!storedItem) {
      return;
    }
  
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
      const collection = this.drawnFeatures_.getCollection();
      collection.clear();
      this.appMymaps_.setFeatures(mapFeatures, collection);
    };
  
    var mapId = storedItem['mapId'];
    if (mapId) {
      this.appMymaps_.setMapId(mapId);
    };
  });
};

app.module.service('appMymapsOffline', app.MymapsOffline);

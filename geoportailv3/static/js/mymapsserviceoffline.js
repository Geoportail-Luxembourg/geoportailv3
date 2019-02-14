goog.provide('app.MymapsOffline');

goog.require('app');
goog.require('app.Mymaps');
goog.require('ngeo.offline.Configuration');


/**
 * @constructor
 * @param {app.Mymaps} appMymaps app mymaps service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration ngeo Offline Configuration
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
   * @type {ngeo.offline.Configuration}
   * @private
   */
  this.ngeoOfflineConfiguration_ = ngeoOfflineConfiguration;

  /**
   * @type {string}
   * @private
   */
  this.storageGroupeKey_ = 'offline_mymaps';
};

/**
 * Save data into the storage system.
 */
app.MymapsOffline.prototype.save = function() {
  this.appMymaps_.getFullMymaps().then(function(full_mymaps) {
    var item = {};
    if (full_mymaps) {
      item['full_mymaps'] = full_mymaps;
    }
    this.ngeoOfflineConfiguration_.setItem(this.storageGroupeKey_, item);
  }.bind(this));
};

/**
 * Restore on the map and on the mymaps component the data from the storage.
 */
app.MymapsOffline.prototype.restore = function() {
  this.ngeoOfflineConfiguration_.getItem(this.storageGroupeKey_).then((storedItem) => {
    if (!storedItem) {
      return;
    }

    var full_mymaps = /** @type {Object} */ (storedItem['full_mymaps']);
    if (!full_mymaps) {
      return;
    }

    var maps = /** @type {app.MapsResponse|undefined} */ (full_mymaps['maps']);
    if (maps) {
      this.appMymaps_.setMaps(maps);
    }

    var users_categories = /** @type {Array<(Object)>} */ (full_mymaps['users_categories']);
    if (users_categories) {
      this.appMymaps_.setUsersCategories(users_categories);
    }

    // var allcategories = /** @type {Array<(Object|null)>} */ (storedItem['allCategories']);
    // if (allcategories) {
    //   this.appMymaps_.allcategories = (allcategories);
    // }

    // var mapInfo = /** @type {Object} */ (storedItem['mapInfo']);
    // if (mapInfo) {
    //   this.appMymaps_.setMapInformation(mapInfo);
    // }

    // var mapFeatures = storedItem['mapFeatures'];
    // if (mapFeatures) {
    //   const collection = this.drawnFeatures_.getCollection();
    //   collection.clear();
    //   this.appMymaps_.setFeatures(mapFeatures, collection);
    // }

    // var mapId = storedItem['mapId'];
    // if (mapId) {
    //   this.appMymaps_.setMapId(mapId);
    // }
  });
};

app.module.service('appMymapsOffline', app.MymapsOffline);

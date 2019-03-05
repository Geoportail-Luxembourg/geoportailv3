goog.provide('app.MymapsOffline');

goog.require('app');
goog.require('app.Mymaps');
goog.require('ngeo.offline.Configuration');


/**
 * @constructor
 * @param {app.Mymaps} appMymaps app mymaps service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration ngeo Offline Configuration
 * @param {String} dataVersion The data version used in the localstorage.
 * @ngInject
 */
app.MymapsOffline = function(appMymaps, appDrawnFeatures, ngeoOfflineConfiguration, dataVersion) {
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

  /**
   * @type {String}
   * @private
   */
  this.dataVersion_ = dataVersion;

  // Check if data in local storage are in the multi-mymaps format.
  this.checkDataFormat();
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
    item['data_version'] = this.dataVersion_;
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

    var usersCategories = /** @type {Array<(Object)>} */ (full_mymaps['users_categories']);
    if (usersCategories) {
      this.appMymaps_.setUsersCategories(usersCategories);
    }

    var mapsElements = /** @type {Object} */ (full_mymaps['maps_elements']);
    if (mapsElements) {
      this.appMymaps_.setMapsElements(mapsElements);
    }
  });
};

/**
 * Check if the stored data has the new format (multi-mymaps)
 * If no, clear the cache
 */
app.MymapsOffline.prototype.checkDataFormat = function() {
  this.ngeoOfflineConfiguration_.getItem(this.storageGroupeKey_).then((storedItem) => {
    if (!storedItem) {
      return;
    }

    if (storedItem['data_version'] !== this.dataVersion_) {
      this.ngeoOfflineConfiguration_.clear();
    }
  });
};

app.module.service('appMymapsOffline', app.MymapsOffline);

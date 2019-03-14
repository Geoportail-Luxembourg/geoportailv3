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
  this.storageGroupKey_ = 'offline_mymaps';

  /**
   * @type {string}
   * @private
   */
  this.dataVersion_ = '1.0';

  // Check if data in local storage are in the multi-mymaps format.
  this.checkDataFormat();

  /**
   * @private
   */
  this.format_ = new ol.format.GeoJSON();
};

/**
 * Save data into the storage system.
 * @return {Promise|angular.$q.Promise} a promise.
 */
app.MymapsOffline.prototype.save = function() {
  const conf = this.ngeoOfflineConfiguration_;
  return this.appMymaps_.getFullMymaps().then(function(full_mymaps) {
    const maps = full_mymaps['maps'];
    const mapsElements = full_mymaps['maps_elements'];
    const categories = full_mymaps['users_categories'];
    const promises = [
      conf.setItem('mymaps_data_version', this.dataVersion_),
      conf.setItem('mymaps_maps', maps),
      conf.setItem('mymaps_users_categories', categories)
    ];
    for (const mapElementKey in mapsElements) {
      const mapElement = mapsElements[mapElementKey];
      promises.push(conf.setItem(`mymaps_element_${mapElementKey}`, mapElement));
    }

    return Promise.all(promises);
  }.bind(this));
};

/**
 * Restore on the map and on the mymaps component the data from the storage.
 */
app.MymapsOffline.prototype.restore = function() {
  const conf = this.ngeoOfflineConfiguration_;
  conf.getItem('mymaps_maps').then((maps) => {
    if (!maps) {
      return;
    }

    this.appMymaps_.setMaps(maps);

    const uuids = maps.map(obj => obj['uuid']);
    const promises = uuids.map(uuid => conf.getItem(`mymaps_element_${uuid}`));
    const allElementsPromise = Promise.all(promises).then(elementsArray => {
      const mapsElements = {};
      elementsArray.forEach((element, idx) => {
        const uuid = uuids[idx];
        mapsElements[uuid] = element;
      });
      this.appMymaps_.setMapsElements(mapsElements);
    });

    const userCategoriesPromise = conf.getItem('mymaps_users_categories').then(usersCategories => {
      if (usersCategories) {
        if (usersCategories) {
          this.appMymaps_.setUsersCategories(usersCategories);
        }
      }
    });
    return Promise.all([
      allElementsPromise,
      userCategoriesPromise
    ]);
  });
};

/**
 * Check if the stored data has the new format (multi-mymaps)
 * If no, clear the cache
 */
app.MymapsOffline.prototype.checkDataFormat = function() {
  this.ngeoOfflineConfiguration_.getItem('mymaps_data_version').then(version => {
    if (!version) {
      return;
    }

    if (version !== this.dataVersion_) {
      this.ngeoOfflineConfiguration_.clear();
    }
  });
};

/**
 * @param {Object} spec The spec.
 * @return {Promise<app.MapsResponse>} a promise resolving when done.
 */
app.MymapsOffline.prototype.createMapOffline = function(spec) {
  this.setUpdatedNow_(spec);
  spec['is_editable'] = true;
  const fakeUuid = `-${Math.random()}`;
  const conf = this.ngeoOfflineConfiguration_;
  return conf.getItem('mymaps_maps').then((m) => {
    const maps = m || [];
    spec['uuid'] = fakeUuid;
    maps.unshift(spec);
    const element = {
      'map': spec,
      'features': '{"type": "FeatureCollection", "features": []}'
    };
    return conf.setItem('mymaps_maps', maps)
    .then(() => conf.setItem(`mymaps_element_${fakeUuid}`, element))
    .then(() => {
      this.appMymaps_.setMaps(maps);
      this.appMymaps_.updateMapsElements(fakeUuid, element);
      return {
        'uuid': fakeUuid,
        'success': true
      };
    });
  });
};

/**
 * @param {string} uuid The map uuid.
 * @param {Object} spec The spec.
 * @return {Promise<app.MapsResponse>} a promise resolving when done.
 */
app.MymapsOffline.prototype.updateMapOffline = function(uuid, spec) {
  const now = new Date().toISOString();
  spec['update_date'] = now;
  const conf = this.ngeoOfflineConfiguration_;
  return conf.getItem('mymaps_maps').then((maps) => {
    for (const key in maps) {
      const m = maps[key];
      if (m['uuid'] === uuid) {
        Object.assign(m, spec);
        return conf.setItem('mymaps_maps', maps);
      }
    }
    return Promise.reject(`Map with uuid ${uuid} not found`);
  });
};

/**
 * @param {string} uuid The map uuid.
 * @return {Promise<app.MapsResponse>} a promise resolving to a fake response when done.
 */
app.MymapsOffline.prototype.getMapOffline = function(uuid) {
  const conf = this.ngeoOfflineConfiguration_;
  return conf.getItem('mymaps_maps').then((maps) => {
    for (let i = 0; i < maps.length; ++i) {
      const m = maps[i];
      if (m['uuid'] === uuid) {
        return m;
      }
    }
    return Promise.reject(`Map with uuid ${uuid} not found`);
  });
};

/**
 * @param {string} uuid The map uuid.
 * @param {Array.<ol.Feature>} features The features to save.
 * @param {olx.format.ReadOptions} encOpt Encoding options.
 * @return {Promise<app.MapsResponse>} a promise resolving to a fake response when done.
 */
app.MymapsOffline.prototype.saveFeaturesOffline = function(uuid, features, encOpt) {
  const conf = this.ngeoOfflineConfiguration_;
  const key = `mymaps_element_${uuid}`;

  return conf.getItem(key).then(myElements => {
    if (!myElements) {
      return Promise.reject(`Map with uuid ${uuid} not found`);
    }
    const existingFeatures = this.format_.readFeatures(myElements['features'], encOpt);

    features.forEach(newFeature => {
      let newFeatureId = newFeature.get('fid') || newFeature.getId();
      if (!newFeatureId) {
        newFeatureId = -Math.random();
        newFeature.set('fid', newFeatureId, true);
        newFeature.setId(newFeatureId);
      }
      for (let i = 0; i < existingFeatures.length; ++i) {
        const curFeatureId = existingFeatures[i].get('fid') || existingFeatures[i].getId();
        console.assert(curFeatureId);
        if (curFeatureId === newFeatureId) {
          existingFeatures.splice(i, 1);
          return; // continue
        }
      }
    });
    existingFeatures.push(...features);

    existingFeatures.forEach((feature, idx) => {
      feature.set('display_order', idx, true);
    });

    // Removing private properties from features as they should not be stored in the db
    const previousProperties = features.map(f => {
      const properties = f.getProperties();
      const newProperties = {};
      for (const k in properties) {
        if (!k.startsWith('__')) {
          newProperties[k] = properties[k];
        }
      }
      f.setProperties(newProperties, true);
      return properties;
    });
    myElements['features'] = this.format_.writeFeatures(existingFeatures, encOpt);
    features.forEach((f, idx) => {
      f.setProperties(previousProperties[idx], true);
    });
    return conf.setItem(key, myElements).then(() => {
      const now = new Date().toISOString();
      const spec = {
        'last_feature_update': now
      };
      return this.updateMapOffline(uuid, spec);
    });
  });
};

/**
 * @private
 * @param {Object} obj Any object.
 */
app.MymapsOffline.prototype.setUpdatedNow_ = function(obj) {
  const now = new Date().toISOString();
  obj['create_date'] = now;
  obj['update_date'] = now;
  obj['last_feature_update'] = now;
};

app.module.service('appMymapsOffline', app.MymapsOffline);

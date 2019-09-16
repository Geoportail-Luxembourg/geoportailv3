/**
 * @module app.MymapsOffline
 */
import olFormatGeoJSON from 'ol/format/GeoJSON.js';
import appModule from './module.js';

/**
 * @constructor
 * @param {app.Mymaps} appMymaps app mymaps service.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration ngeo Offline Configuration
 * @param {app.UserManager} appUserManager The user manager service.
 * @ngInject
 */
const exports = function(appMymaps, appDrawnFeatures, ngeoOfflineConfiguration, appUserManager) {

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {app.draw.DrawnFeatures}
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
  this.format_ = new olFormatGeoJSON();
};

/**
 * Save data into the storage system.
 * @return {Promise|angular.$q.Promise} a promise.
 */
exports.prototype.save = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    return Promise.all([]);
  }
  const conf = this.ngeoOfflineConfiguration_;
  return this.appMymaps_.getFullMymaps().then(function(full_mymaps) {
    if (full_mymaps !== null && full_mymaps !== undefined) {
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
    }
    return;
  }.bind(this));
};

/**
 * Restore on the map and on the mymaps component the data from the storage.
 */
exports.prototype.restore = function() {
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
 * Update the map element in storage
 * @param {number} old_uuid Old uuid before database insert.
 * @param {Object} mapsElement myMapsElement.
 * @return {Promise} Promise.
 */
exports.prototype.updateMyMapsElementStorage = function(old_uuid, mapsElement) {
  const conf = this.ngeoOfflineConfiguration_;
  const old_key = `mymaps_element_${old_uuid}`;
  const new_key = `mymaps_element_${mapsElement['map']['uuid']}`;
  this.appMymaps_.deleteMapsElement(String(old_uuid));
  this.appMymaps_.updateMapsElement(mapsElement['map']['uuid'], mapsElement);
  return Promise.all([conf.removeItem(old_key), conf.setItem(new_key, mapsElement)]);
};

/**
 * Check if the stored data has the new format (multi-mymaps)
 * If no, clear the cache
 */
exports.prototype.checkDataFormat = function() {
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
exports.prototype.createMapOffline = function(spec) {
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
      this.appMymaps_.updateMapsElement(fakeUuid, element);
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
 * @param {boolean} replace If the update merge the old object.
 * @return {Promise<app.MapsResponse>} a promise resolving when done.
 */
exports.prototype.updateMapOffline = function(uuid, spec, replace = false) {
  spec['update_date'] = new Date().toISOString();
  const conf = this.ngeoOfflineConfiguration_;
  return conf.getItem('mymaps_maps').then((maps) => {
    for (const key in maps) {
      let m = maps[key];
      if (m['uuid'] === uuid) {
        if (replace) {
          maps[key] = spec;
        } else {
          Object.assign(m, spec);
        }
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
exports.prototype.getMapOffline = function(uuid) {
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
 * @returns {Promise} The result promise.
 */
exports.prototype.getElementOffline = function(uuid) {
  const conf = this.ngeoOfflineConfiguration_;
  return conf.getItem(`mymaps_element_${uuid}`);
};

/**
 * @param {string} uuid The map uuid.
 * @param {Array.<ol.Feature>} features The features to save.
 * @param {olx.format.ReadOptions} encOpt Encoding options.
 * @return {Promise<app.MapsResponse>} a promise resolving to a fake response when done.
 */
exports.prototype.saveFeaturesOffline = function(uuid, features, encOpt) {
  const conf = this.ngeoOfflineConfiguration_;
  const key = `mymaps_element_${uuid}`;

  return conf.getItem(key).then(myElement => {
    if (!myElement) {
      return Promise.reject(`Map with uuid ${uuid} not found`);
    }
    const existingFeatures = this.format_.readFeatures(myElement['features'], encOpt);

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
    const previousProperties = existingFeatures.map(f => {
      const properties = f.getProperties();
      const newProperties = {};
      for (const k in properties) {
        if (!k.startsWith('__')) {
          newProperties[k] = properties[k];
        }
        f.unset(k, true);
      }
      f.setProperties(newProperties, true);
      return properties;
    });
    myElement['features'] = this.format_.writeFeatures(existingFeatures, encOpt);
    existingFeatures.forEach((f, idx) => {
      f.getKeys().forEach(k => f.unset(k, true));
      f.setProperties(previousProperties[idx], true);
      f.set('__saving__', false, true);
    });
    myElement['map']['dirty'] = true;
    this.appMymaps_.updateMapsElement(uuid, myElement);
    return conf.setItem(key, myElement).then(() => {
      const now = new Date().toISOString();
      const spec = {
        'last_feature_update': now,
        'dirty': true
      };
      return this.updateMapOffline(uuid, spec);
    });
  });
};

/**
 * @param {ol.Feature} feature The features to save.
 * @param {olx.format.ReadOptions} encOpt Encoding options.
 * @return {Promise<app.MapsResponse>} a promise resolving to a fake response when done.
 */
exports.prototype.deleteFeatureOffline = function(feature, encOpt) {
  const uuid = /** @type{string} */ (feature.get('__map_id__'));
  const conf = this.ngeoOfflineConfiguration_;
  const key = `mymaps_element_${uuid}`;

  return conf.getItem(key).then(myElements => {
    if (!myElements) {
      return Promise.reject(`Map with uuid ${uuid} not found`);
    }

    const featureId = feature.getId();
    const existingFeatures = this.format_.readFeatures(myElements['features'], encOpt);
    const idx = existingFeatures.findIndex(f => f.getId() === featureId);
    if (idx < 0) {
      return Promise.reject(`The feature with id ${featureId} was not found in map with uuid ${uuid}`);
    }
    existingFeatures.splice(idx, 1);
    existingFeatures.forEach((feature, idx) => {
      feature.set('display_order', idx, true);
    });
    myElements['features'] = this.format_.writeFeatures(existingFeatures, encOpt);
    myElements['map']['dirty'] = true;

    return conf.setItem(key, myElements).then(() => {
      const now = new Date().toISOString();
      const spec = {
        'last_feature_update': now,
        'dirty': true
      };
      return this.updateMapOffline(uuid, spec, false);
    });
  });
};

/**
 * @param {string} uuid The source map uuid.
 */
exports.prototype.deleteAllFeaturesOffline = function(uuid) {
  const conf = this.ngeoOfflineConfiguration_;
  const key = `mymaps_element_${uuid}`;

  return conf.getItem(key).then(myElements => {
    if (!myElements) {
      return Promise.reject(`Map with uuid ${uuid} not found`);
    }

    myElements['features'] = ""; // "features" is a string, it is emptied
    myElements['map']['dirty'] = true;

    return conf.setItem(key, myElements).then(() => {
      const now = new Date().toISOString();
      const spec = {
        'last_feature_update': now,
        'dirty': true
      };
      return this.updateMapOffline(uuid, spec, false);
    });
  });
};

/**
 * @param {string} uuid The source map uuid.
 * @param {Object} spec A map description.
 * @param {olx.format.ReadOptions} encOpt Encoding options.
 * @return {Promise<app.MapsResponse>} a promise resolving to a fake response when done.
 */
exports.prototype.copyMapOffline = function(uuid, spec, encOpt) {
  const conf = this.ngeoOfflineConfiguration_;
  const newMapUuid = (-Math.random()).toString();
  return conf.getItem(`mymaps_element_${uuid}`).then(element => {
    // Copy and add the element to mymaps_element_xx
    const features = this.format_.readFeatures(element['features'], encOpt);
    features.forEach(f => {
      const newFeatureId = -Math.random();
      f.setId(newFeatureId);
      f.set('fid', newFeatureId);
    });
    element['features'] = this.format_.writeFeatures(features, encOpt);
    element['map']['uuid'] = newMapUuid;
    this.setUpdatedNow_(spec);
    Object.assign(element['map'], spec);
    this.appMymaps_.updateMapsElement(newMapUuid, element);
    return conf.setItem(`mymaps_element_${newMapUuid}`, element);
  }).then(() => {
    // Copy and add the summary to mymaps_maps
    return conf.getItem('mymaps_maps').then(maps => {
      const idx = maps.findIndex(m => m['uuid'] === uuid);
      if (idx >= 0) {
        const newSummary = Object.assign({}, maps[idx], spec);
        newSummary['uuid'] = newMapUuid;
        this.setUpdatedNow_(newSummary);
        maps.unshift(newSummary);
        this.appMymaps_.setMaps(maps);
        return conf.setItem('mymaps_maps', maps);
      }
      return Promise.reject(`Map with uuid ${uuid} not found`);
    }).then(() => {
      return {
        'uuid': newMapUuid,
        'success': true
      };
    });
  });
};

/**
 * Remove the map from the storage.
 * @param {string} uuid The uuid of the map to delete.
 * @return {Promise} a promise resolving to a fake response when done.
 */
exports.prototype.deleteMapOffline = function(uuid) {
  const conf = this.ngeoOfflineConfiguration_;
  return Promise.all([
    conf.getItem('mymaps_maps').then(maps => {
      const idx = maps.findIndex(m => m['uuid'] === uuid);
      if (idx < 0) {
        return Promise.reject(`Map with uuid ${uuid} not found`);
      }
      if (parseFloat(uuid) < 0) {
        // Simply delete a pure offline map
        maps.splice(idx, 1);
      } else {
        // Mark the map as deleted so that we can propose to sync when back online
        maps[idx]['deletedWhileOffline'] = true;
        maps[idx]['dirty'] = true;
        maps[idx]['last_update'] = new Date().toISOString();
      }

      conf.getItem(`mymaps_element_${uuid}`).then(element => {
        element['map']['dirty'] = true;
        element['map']['deletedWhileOffline'] = true;
        element['map']['last_feature_update'] = new Date().toISOString();
        this.appMymaps_.updateMapsElement(uuid, element);
      });

      this.appMymaps_.setMaps(maps);
      return conf.setItem('mymaps_maps', maps);
    })
  ]);
};

/**
 * Remove a map from storage.
 * @param {string} uuid The uuid of the map to delete.
 *  @return {Promise} An object.
 */
exports.prototype.removeMapAndFeaturesFromStorage = function(uuid) {
  const conf = this.ngeoOfflineConfiguration_;
  return conf.getItem('mymaps_maps').then(maps => {
    let idx = maps.findIndex(map => map['uuid'] === uuid);
    maps.splice(idx, 1);
    return Promise.all([
      conf.setItem('mymaps_maps', maps),
      conf.removeItem(`mymaps_element_${uuid}`)
    ]);
  });
};

/**
 * @private
 * @param {Object} obj Any object.
 */
exports.prototype.setUpdatedNow_ = function(obj) {
  const now = new Date().toISOString();
  if (!('create_date' in obj)) {
    obj['create_date'] = now;
  }
  obj['update_date'] = now;
  obj['last_feature_update'] = now;
  obj['dirty'] = true;
};

appModule.service('appMymapsOffline', exports);


export default exports;

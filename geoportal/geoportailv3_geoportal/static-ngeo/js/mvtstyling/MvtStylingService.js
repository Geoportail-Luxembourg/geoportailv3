import appModule from '../module.js';

function hasLocalStorage() {
    return 'localStorage' in window && localStorage;
}

const url_get = '/get_userconfig';
const url_save = '/save_userconfig';
const url_delete = '/delete_userconfig';
const ls_ = window.localStorage;
const LS_KEY_EXPERT = 'expertStyling';
const LS_KEY_MEDIUM = 'mediumStyling';
const LS_KEY_HILLSHADE = 'hillshadeStyling';
export const defaultMapBoxStyle = 'https://vectortiles.geoportail.lu/styles/roadmap/style.json';
export const defaultMapBoxStyleXYZ = 'https://vectortiles.geoportail.lu/styles/roadmap/{z}/{x}/{y}.png';



class MvtStylingService {
  /**
   * @param {angular.$http} $http Angular http service.
   * @param {app.UserManager} appUserManager User manager service.
   * @paran {String} uploadvtstyleUrl URL to provision a style
   * @paran {String} deletevtstyleUrl URL to delete a provisionned style
   * @paran {String} getvtstyleUrl URL to get a provisionned style
   * @ngInject
   */
  constructor($http, appUserManager, uploadvtstyleUrl, deletevtstyleUrl, getvtstyleUrl) {
    this.http_ = $http;
    this.appUserManager_ = appUserManager;
    this.isCustomStyle = false;
    this.uploadvtstyleUrl_ = uploadvtstyleUrl;
    this.deletevtstyleUrl_ = deletevtstyleUrl;
    this.getvtstyleUrl_ = getvtstyleUrl;
  }

  getBgStyle() {
    const label = 'basemap_2015_global';
    const itemKey = this.createRemoteItemKey_(label);
    let id = localStorage.getItem(itemKey);
    const xyz_custom = id ? this.createXYZCustom_(id) : undefined;

    const config = {
      label,
      defaultMapBoxStyle,
      defaultMapBoxStyleXYZ,
      xyz: xyz_custom || defaultMapBoxStyleXYZ,
      xyz_custom,
      style: defaultMapBoxStyle
    };
    if (this.appUserManager_.isAuthenticated()) {
        return this.getDB_(LS_KEY_EXPERT).then(resultFromDB => {
            if (resultFromDB.data.length > 0) {
                console.log('Load mvt expert style from database and save it to local storage');
                this.isCustomStyle = true;
                this.saveLS_(LS_KEY_EXPERT, resultFromDB.data[0].value);
                config.style = JSON.parse(resultFromDB.data[0].value)
                return config;
            } else {
                // Default style if no existing in LS or DB
                console.log('Default mvt style loaded');
                this.isCustomStyle = false;
                return config;
            }
        });
    } else if (hasLocalStorage() && this.hasLS_(LS_KEY_EXPERT)) {
        console.log('Load mvt expert style from local storage');
        this.isCustomStyle = true;
        config.customStyle = this.isCustomStyle;
        config.style = JSON.parse(this.getLS_(LS_KEY_EXPERT));
        return Promise.resolve(config);
    } else {
        // Default style if no existing in LS or DB
        console.log('Default mvt style loaded');
        this.isCustomStyle = false;
        return Promise.resolve(config);
    }
}

createXYZCustom_(id) {
  return `https://vectortiles.geoportail.lu/styles/${id}/{z}/{x}/{y}.png`;
}

createRemoteItemKey_(label) {
  return 'remoteIdForStyle_' + label;
}


publishStyle(layer, data) {
  const label = layer.get('label');
  const itemKey = this.createRemoteItemKey_(label);
  let id = localStorage.getItem(itemKey);

  return this.unpublishStyle(layer).then(() => {
    const formData = new FormData();
    const blob = new Blob([data], {type: "application/json"});
    formData.append('style', blob, 'style.json');
    const options = {
      method: 'POST',
      body: formData,
    };
    return fetch(this.uploadvtstyleUrl_, options)
      .then(response => response.json())
      .then(result => {
        localStorage.setItem(this.createRemoteItemKey_(label), result.id);
        layer.set('xyz_custom', this.createXYZCustom_(result.id));
        return result.id;
      });
  });
}

unpublishStyle(layer) {
  const label = layer.get('label');
  const itemKey = this.createRemoteItemKey_(label);
  let id = localStorage.getItem(itemKey);

  if (id) {
    localStorage.removeItem(this.createRemoteItemKey_(label));
    const url = `${this.deletevtstyleUrl_}?id=${id}`;
    layer.unset('xyz_custom');
    return fetch(url).catch(() => '');
  }
  return Promise.resolve();
}

saveBgStyle(layer) {
    const mbMap =  layer.getMapBoxMap();
    const data = JSON.stringify(mbMap.getStyle());
    const promises = [];
    if (this.appUserManager_.isAuthenticated()) {
      console.log('Saving expert style in database');
      promises.push(this.saveDB_(LS_KEY_EXPERT, data));
    }
    this.isCustomStyle = true;
    this.saveLS_(LS_KEY_EXPERT, data);
    console.log('Expert style saved in local storage');
    promises.push(this.publishStyle(layer, data));
    return Promise.all(promises);
}

getMediumStyle() {
    if (this.appUserManager_.isAuthenticated()) {
        return this.getDB_(LS_KEY_MEDIUM).then(resultFromDB => {
            const styleFromDB = resultFromDB.data;
            if (styleFromDB.length > 0) {
                console.log('Load mvt medium style from database and save it to local storage');
                this.isCustomStyle = true;
                this.saveLS_(LS_KEY_MEDIUM, styleFromDB[0].value);
                return styleFromDB[0].value;
            }
        });
    } else if (hasLocalStorage() && this.hasLS_(LS_KEY_MEDIUM)) {
        console.log('Load mvt medium style from local storage');
        return Promise.resolve(this.getLS_(LS_KEY_MEDIUM));
    }
}

getUrlVtStyle(layer) {
  const label = layer.get('label');
  const itemKey = this.createRemoteItemKey_(label);
  let id = localStorage.getItem(itemKey);

  if (id == null) return defaultMapBoxStyle;
  return this.getvtstyleUrl_ + '?id=' + id;
}

getHillshadeStyle() {
    if (this.appUserManager_.isAuthenticated()) {
        return this.getDB_(LS_KEY_HILLSHADE).then(resultFromDB => {
            const styleFromDB = resultFromDB.data;
            if (styleFromDB.length > 0) {
                console.log('Load mvt hillshade style from database and save it to local storage');
                this.isCustomStyle = true;
                this.saveLS_(LS_KEY_HILLSHADE, styleFromDB[0].value);
                return styleFromDB[0].value;
            }
        });
    } else if (hasLocalStorage() && this.hasLS_(LS_KEY_HILLSHADE)) {
        console.log('Load mvt medium style from local storage');
        return Promise.resolve(this.getLS_(LS_KEY_HILLSHADE));
    }
}

saveHillshadeStyle(style) {
    const promises = [];
    this.isCustomStyle = true;
    if (this.appUserManager_.isAuthenticated()) {
        promises.push(this.saveDB_(LS_KEY_HILLSHADE, style));
        console.log('Medium style saved in database');
    }
    this.saveLS_(LS_KEY_HILLSHADE, style);
    console.log('Medium style saved in local storage');
    return Promise.all(promises);
}

saveMediumStyle(style) {
    const promises = [];
    this.isCustomStyle = true;
    if (this.appUserManager_.isAuthenticated()) {
        promises.push(this.saveDB_(LS_KEY_MEDIUM, style));
        console.log('Medium style saved in database');
    }
    this.saveLS_(LS_KEY_MEDIUM, style);
    console.log('Medium style saved in local storage');
    return Promise.all(promises);
}

removeStyles(layer) {
    this.deleteLS_(LS_KEY_EXPERT);
    this.deleteLS_(LS_KEY_MEDIUM);
    this.deleteLS_(LS_KEY_HILLSHADE);
    const promises = [];
    promises.push(this.unpublishStyle(layer));
    console.log('Removed mvt style from local storage');
    if (this.appUserManager_.isAuthenticated()) {
        promises.push(this.deleteDB_(LS_KEY_EXPERT));
        promises.push(this.deleteDB_(LS_KEY_MEDIUM));
        promises.push(this.deleteDB_(LS_KEY_HILLSHADE));
        console.log('Removed mvt style from database');
    }
    this.isCustomStyle = false;
    return Promise.all(promises);
}

// Local Storage methods
/**
 * @private
 */
getLS_(key) {
    return ls_.getItem(key);
}

/**
 * @private
 */
saveLS_(key, value) {
    return ls_.setItem(key, value);
}

/**
 * @private
 */
deleteLS_(key) {
    return ls_.removeItem(key);
}

/**
 * @private
 */
hasLS_(key) {
    return !!ls_.getItem(key);
}


// Database methods
/**
 * @private
 */
getDB_(key) {
    return this.http_.get(url_get + "?key=" + key);
}

/**
 * @private
 */
saveDB_(key, value) {
    const config = {
        headers: {'Content-Type': 'application/json'}
      };
    const data = {
        key,
        value
    };
    return this.http_.post(url_save, data, config);
}

/**
 * @private
 */
deleteDB_(key) {
    return this.http_.delete(url_delete + "?key=" + key);
  }
}

appModule.service('appMvtStylingService', MvtStylingService);

export default MvtStylingService;

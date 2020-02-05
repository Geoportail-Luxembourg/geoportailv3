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
export const defaultMapBoxStyle = 'https://vectortiles.geoportail.lu/styles/roadmap/style.json';
export const defaultMapBoxStyleXYZ = 'https://vectortiles.geoportail.lu/styles/roadmap/{z}/{x}/{y}.png';


/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {app.UserManager} appUserManager User manager service.
 * @ngInject
 */
const service = function($http, appUserManager) {
    this.http_ = $http;
    this.appUserManager_ = appUserManager;
    this.isCustomStyle = false;
}


service.prototype.getBgStyle = function() {
    if (this.appUserManager_.isAuthenticated()) {
        return this.getDB_(LS_KEY_EXPERT).then(resultFromDB => {
            if (resultFromDB.data.length > 0) {
                console.log('Load mvt expert style from database and save it to local storage');
                this.isCustomStyle = true;
                this.saveLS_(LS_KEY_EXPERT, resultFromDB.data[0].value);
                return JSON.parse(resultFromDB.data[0].value);
            } else {
                // Default style if no existing in LS or DB
                console.log('Default mvt style loaded');
                this.isCustomStyle = false;
                return defaultMapBoxStyle;
            }
        });
    } else if (hasLocalStorage() && this.hasLS_(LS_KEY_EXPERT)) {
        console.log('Load mvt expert style from local storage');
        this.isCustomStyle = true;
        return Promise.resolve(JSON.parse(this.getLS_(LS_KEY_EXPERT)));
    } else {
        // Default style if no existing in LS or DB
        console.log('Default mvt style loaded');
        this.isCustomStyle = false;
        return Promise.resolve(defaultMapBoxStyle);
    }
};

service.prototype.saveBgStyle = function(data) {
    if (this.appUserManager_.isAuthenticated()) {
        this.saveDB_(LS_KEY_EXPERT, data);
        console.log('Expert style saved in database');
    }
    this.isCustomStyle = true;
    this.saveLS_(LS_KEY_EXPERT, data);
    console.log('Expert style saved in local storage');
};

service.prototype.getMediumStyle = function() {
    if (this.appUserManager_.isAuthenticated()) {
        return this.getDB_(LS_KEY_MEDIUM).then(resultFromDB => {
            const styleFromDB = resultFromDB.data;
            if (styleFromDB.length > 0) {
                console.log('Load mvt medium style from database and save it to local storage');
                this.isCustomStyle = true;
                this.saveLS_(LS_KEY_MEDIUM, styleFromDB.value);
                return styleFromDB;
            }
        });
    } else if (hasLocalStorage() && this.hasLS_(LS_KEY_MEDIUM)) {
        console.log('Load mvt medium style from local storage');
        return this.getLS_(LS_KEY_MEDIUM);
    }
};

service.prototype.saveMediumStyle = function(style) {
    if (this.appUserManager_.isAuthenticated()) {
        this.saveDB_(LS_KEY_MEDIUM, style);
        console.log('Medium style saved in database');
    }
    this.saveLS_(LS_KEY_MEDIUM, style);
    console.log('Medium style saved in local storage');
};

service.prototype.removeStyles = function() {
    this.deleteLS_(LS_KEY_EXPERT);
    this.deleteLS_(LS_KEY_MEDIUM);
    console.log('Removed mvt style from local storage');
    if (this.appUserManager_.isAuthenticated()) {
        this.deleteDB_(LS_KEY_EXPERT);
        this.deleteDB_(LS_KEY_MEDIUM);
        console.log('Removed mvt style from database');
    }
    this.isCustomStyle = false;
};

// Local Storage methods
/**
 * @private
 */
service.prototype.getLS_ = function(key) {
    return ls_.getItem(key);
};

/**
 * @private
 */
service.prototype.saveLS_ = function(key, value) {
    return ls_.setItem(key, value);
};

/**
 * @private
 */
service.prototype.deleteLS_ = function(key) {
    return ls_.removeItem(key);
};

/**
 * @private
 */
service.prototype.hasLS_ = function(key) {
    return !!ls_.getItem(key);
};


// Database methods
/**
 * @private
 */
service.prototype.getDB_ = function(key) {
    return this.http_.get(url_get + "?key=" + key);
};

/**
 * @private
 */
service.prototype.saveDB_ = function(key, value) {
    const config = {
        headers: {'Content-Type': 'application/json'}
      };
    const data = {
        key,
        value
    };
    return this.http_.post(url_save, data, config);
};

/**
 * @private
 */
service.prototype.deleteDB_ = function(key) {
    return this.http_.delete(url_delete + "?key=" + key);
};


appModule.service('appMvtStylingService', service);

export default service;

/**
 * @module app.UserManager
 */
/**
 * @fileoverview This file defines the user manager service. this service
 * interacts with the Geoportail webservice to login logout and keep the state
 * of the user.
 */

import appModule from './module.js';
import appNotifyNotificationType from './NotifyNotificationType.js';
import ngeoOfflineServiceManager from 'ngeo/offline/ServiceManager.js';

/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {angular.$rootScope} $rootScope Angular rootScope service.
 * @param {string} loginUrl The application login URL.
 * @param {string} logoutUrl The application logout URL.
 * @param {string} getuserinfoUrl The url to get information about the user.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
const exports = function($http, $rootScope, loginUrl, logoutUrl,
    getuserinfoUrl, appNotify, gettextCatalog) {

  /**
   * @type {ngeo.offline.Mode}
   * @private
   */
  this.ngeoOfflineMode_;

  /**
   * @type {string}
   * @private
   */
  this.loginUrl_ = loginUrl;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {string}
   * @private
   */
  this.getuserinfoUrl_ = getuserinfoUrl;

  /**
   * @type {string}
   * @private
   */
  this.logoutUrl_ = logoutUrl;

  /**
   * @type {angular.$http}
   * @private
   */
  this.http_ = $http;


  /**
   * @type {string}
   */
  this.username = '';

  /**
   * @type {string|undefined}
   */
  this.email = undefined;

  /**
   * @type {string|undefined}
   */
  this.role = undefined;

  /**
   * @type {?number}
   */
  this.roleId = null;

  /**
   * @type {string|undefined}
   */
  this.name = undefined;

  /**
   * @type {?number}
   */
  this.mymapsRole = null;

  /**
   * @type {boolean}
   */
  this.isMymapsAdmin = false;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {angular.$rootScope}
   */
  this.$rootScope = $rootScope;
};

/**
 * @param {ngeo.offline.Mode} ngeoOfflineMode offline mode service.
 */
exports.prototype.setOfflineMode = function(ngeoOfflineMode) {
  this.ngeoOfflineMode_ = ngeoOfflineMode;
};

/**
 * @param {string} username The username.
 * @param {string} password The password.
 * @return {!angular.$q.Promise} Promise providing the authentication.
 */
exports.prototype.authenticate = function(username, password) {
  const isApp =
    location.search.includes('localforage=android') ||
    location.search.includes('localforage=ios') ||
    location.search.includes('applogin=yes');
  var req = $.param({
    login: username,
    password: password,
    app: isApp,
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.http_.post(this.loginUrl_, req, config).then(
      response => {
        if (response.status == 200) {
          this.setUserInfo(
            response.data['login'],
            response.data['role'],
            response.data['role_id'],
            response.data['mail'],
            response.data['sn'],
            response.data['mymaps_role'],
            response.data['is_admin'],
            response.data['typeUtilisateur']
          );
          this.$rootScope.$broadcast('authenticated');
          var msg = this.gettextCatalog.getString(
              'Vous êtes maintenant correctement connecté.');
          this.notify_(msg, appNotifyNotificationType.INFO);
        } else {
          this.clearUserInfo();
          this.notify_(this.gettextCatalog.getString(
              'Invalid username or password.'),
              appNotifyNotificationType.WARNING);
        }
        return response;
      }, response => {
        this.clearUserInfo();
        this.notify_(this.gettextCatalog.getString(
            'Invalid username or password.'),
            appNotifyNotificationType.WARNING);
        return response;
      });
};


/**
 * @return {!angular.$q.Promise} Promise providing the authentication.
 */
exports.prototype.logout = function() {
  return this.http_.get(this.logoutUrl_).then(
      response => {
        if (response.status == 200) {
          this.getUserInfo();
        } else {
          this.getUserInfo();
          this.notify_(this.gettextCatalog.getString(
              'Une erreur est survenue durant la déconnexion.'),
              appNotifyNotificationType.ERROR
              );
        }
        return response;
      }, response => {
        this.getUserInfo();
        this.notify_(this.gettextCatalog.getString(
            'Une erreur est survenue durant la déconnexion.'),
            appNotifyNotificationType.ERROR);
        return response;
      });
};


/**
 * @export
 */
exports.prototype.getUserInfo = function() {
  var req = {};
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };

  this.http_.post(this.getuserinfoUrl_, req, config).then(
      response => {
        if (response.status == 200) {
          this.setUserInfo(
              response.data['login'],
              response.data['role'],
              response.data['role_id'],
              response.data['mail'],
              response.data['sn'],
              response.data['mymaps_role'],
              response.data['is_admin'],
              response.data['typeUtilisateur']
          );
          this.$rootScope.$broadcast('authenticated');
        } else {
          this.clearUserInfo();
        }
        return response;
      }, response => {
        this.clearUserInfo();
        return response;
      });
};


/**
 * @return {boolean} True if authenticated.
 * @export
 */
exports.prototype.isAuthenticated = function() {
  if (this.ngeoOfflineMode_.isEnabled()) {
    return true;
  }

  if (this.getUsername()) {
    return this.username.length > 0;
  }

  this.clearUserInfo();
  return false;
};


/**
 * Clear the user information. This happens when logging out and in case
 * of error.
 */
exports.prototype.clearUserInfo = function() {
  this.setUserInfo('', undefined, null, undefined, undefined, null, false, 'prive');
};


/**
 * @param {string|undefined} username The username.
 * @param {string|undefined} role Role.
 * @param {?number} roleId Role id.
 * @param {string|undefined} mail Mail.
 * @param {string|undefined} name Name.
 * @param {?number} mymapsRole The role used by mymaps.
 * @param {boolean} isAdmin True if is a mymaps admin.
 * @param {string|undefined} typeUtilisateur type of user.
 */
exports.prototype.setUserInfo = function(
    username, role, roleId, mail, name, mymapsRole, isAdmin, typeUtilisateur) {
  if (username !== undefined) {
    this.username = username;
    this.role = role;
    this.roleId = roleId;
    this.email = mail;
    this.name = name;
    this.mymapsRole = mymapsRole;
    this.isMymapsAdmin = isAdmin;
    this.typeUtilisateur = typeUtilisateur;
  } else {
    this.clearUserInfo();
  }
};

/**
 * @return {string} The username.
 */
exports.prototype.getUsername = function() {
  return this.username;
};

/**
 * @return {string|undefined} The Email.
 */
exports.prototype.getEmail = function() {
  return this.email;
};

/**
 * @return {string|undefined} The user type.
 */
exports.prototype.getUserType = function() {
  return this.typeUtilisateur;
};

/**
 * @return {string|undefined} The Role.
 */
exports.prototype.getRole = function() {
  return this.role;
};


/**
 * @return {?number} The Role Id.
 */
exports.prototype.getRoleId = function() {
  return this.roleId;
};

/**
 * @return {?number} The Role Id.
 */
exports.prototype.getMymapsRole = function() {
  return this.mymapsRole;
};

/**
 * @return {boolean} True if is a mymaps admin.
 */
exports.prototype.getMymapsAdmin = function() {
  return this.isMymapsAdmin;
};


appModule.service('appUserManager', exports);


export default exports;

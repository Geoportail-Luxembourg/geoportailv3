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

/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {string} loginUrl The application login URL.
 * @param {string} logoutUrl The application logout URL.
 * @param {string} getuserinfoUrl The url to get information about the user.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {string} appAuthtktCookieName The authentication cookie name.
 * @ngInject
 */
const exports = function($http, loginUrl, logoutUrl,
    getuserinfoUrl, appNotify, gettextCatalog, appAuthtktCookieName) {
  /**
   * @type {string}
   * @private
   */
  this.appAuthtktCookieName_ = appAuthtktCookieName;

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
};


/**
 * @param {string} username The username.
 * @param {string} password The password.
 * @return {!angular.$q.Promise} Promise providing the authentication.
 */
exports.prototype.authenticate = function(username, password) {

  var req = $.param({
    'login': username,
    'password': password
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.http_.post(this.loginUrl_, req, config).then(
      function(response) {
        if (response.status == 200) {
          this.getUserInfo();
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
      }.bind(this), function(response) {
        this.clearUserInfo();
        this.notify_(this.gettextCatalog.getString(
            'Invalid username or password.'),
            appNotifyNotificationType.WARNING);
        return response;
      }.bind(this));
};


/**
 * @return {!angular.$q.Promise} Promise providing the authentication.
 */
exports.prototype.logout = function() {
  return this.http_.get(this.logoutUrl_).then(
      function(response) {
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
      }.bind(this), function(response) {
        this.getUserInfo();
        this.notify_(this.gettextCatalog.getString(
            'Une erreur est survenue durant la déconnexion.'),
            appNotifyNotificationType.ERROR);
        return response;
      }.bind(this));
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
      function(response) {
        if (response.status == 200) {
          this.setUserInfo(
              response.data['login'],
              response.data['role'],
              response.data['role_id'],
              response.data['mail'],
              response.data['sn'],
              response.data['mymaps_role'],
              response.data['is_admin']
          );
        } else {
          this.clearUserInfo();
        }
        return response;
      }.bind(this), function(response) {
        this.clearUserInfo();
        return response;
      }.bind(this));
};


/**
 * @return {boolean} True if authenticated.
 * @export
 */
exports.prototype.isAuthenticated = function() {
  if (this.hasCookie(this.appAuthtktCookieName_)) {
    return (this.username.length > 0);
  }
  this.clearUserInfo();
  return false;
};


/**
 * Clear the user information. This happens when logging out and in case
 * of error.
 */
exports.prototype.clearUserInfo = function() {
  this.setUserInfo('', undefined, null, undefined, undefined, null, false);
};


/**
 * @param {string|undefined} username The username.
 * @param {string|undefined} role Role.
 * @param {?number} roleId Role id.
 * @param {string|undefined} mail Mail.
 * @param {string|undefined} name Name.
 * @param {?number} mymapsRole The role used by mymaps.
 * @param {boolean} isAdmin True if is a mymaps admin.
 */
exports.prototype.setUserInfo = function(
    username, role, roleId, mail, name, mymapsRole, isAdmin) {
  if (username !== undefined) {
    this.username = username;
    this.role = role;
    this.roleId = roleId;
    this.email = mail;
    this.name = name;
    this.mymapsRole = mymapsRole;
    this.isMymapsAdmin = isAdmin;
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

/**
 * @param {string} cname The cookie name.
 * @return {boolean} True if the cookie exists.
 */
exports.prototype.hasCookie = function(cname) {
  var name = cname + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return true;
    }
  }
  return false;
};


appModule.service('appUserManager', exports);


export default exports;

/**
 * @fileoverview This file defines the user manager service. this service
 * interacts with the Geoportail webservice to login logout and keep the state
 * of the user.
 */

goog.provide('app.UserManager');

goog.require('app');
goog.require('app.Notify');


/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {string} loginUrl The application login URL.
 * @param {string} logoutUrl The application logout URL.
 * @param {string} getuserinfoUrl The url to get information about the user.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
app.UserManager = function($http, loginUrl, logoutUrl,
    getuserinfoUrl, appNotify, gettextCatalog) {
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
app.UserManager.prototype.authenticate = function(username, password) {

  var req = $.param({
    'login': username,
    'password': password
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.http_.post(this.loginUrl_, req, config).success(
      goog.bind(function(data, status, headers, config) {
        if (status == 200) {
          this.getUserInfo();
          var msg = this.gettextCatalog.getString(
              'Vous êtes maintenant correctement connecté.');
          this.notify_(msg, app.NotifyNotificationType.INFO);
        } else {
          this.clearUserInfo();
          this.notify_(this.gettextCatalog.getString(
              'Invalid username or password.'),
              app.NotifyNotificationType.WARNING);
        }
      },this)).error(
      goog.bind(function(data, status, headers, config) {
        this.clearUserInfo();
        this.notify_(this.gettextCatalog.getString(
            'Invalid username or password.'),
            app.NotifyNotificationType.WARNING);
      },this));
};


/**
 * @return {!angular.$q.Promise} Promise providing the authentication.
 */
app.UserManager.prototype.logout = function() {
  return this.http_.get(this.logoutUrl_).success(
      goog.bind(function(data, status, headers, config) {
        if (status == 200) {
          this.getUserInfo();
        } else {
          this.getUserInfo();
          this.notify_(this.gettextCatalog.getString(
              'Une erreur est survenue durant la déconnexion.'),
              app.NotifyNotificationType.ERROR
              );
        }
      }, this)).error(
      goog.bind(function(data, status, headers, config) {
        this.getUserInfo();
        this.notify_(this.gettextCatalog.getString(
            'Une erreur est survenue durant la déconnexion.'),
            app.NotifyNotificationType.ERROR);
      }, this));
};


/**
 * @export
 */
app.UserManager.prototype.getUserInfo = function() {
  var req = {};
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };

  this.http_.post(this.getuserinfoUrl_, req, config).success(
      goog.bind(function(data, status, headers, config) {
        if (status == 200) {
          this.setUserInfo(
              data['login'],
              data['role'],
              data['role_id'],
              data['mail'],
              data['sn'],
              data['mymaps_role'],
              data['is_admin']
          );
        } else {
          this.clearUserInfo();
        }
      },this)).error(
      goog.bind(function(data, status, headers, config) {
        this.clearUserInfo();
      },this));
};


/**
 * @return {boolean} True if authenticated.
 * @export
 */
app.UserManager.prototype.isAuthenticated = function() {
  return (this.username.length > 0);
};


/**
 * Clear the user information. This happens when logging out and in case
 * of error.
 */
app.UserManager.prototype.clearUserInfo = function() {
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
app.UserManager.prototype.setUserInfo = function(
    username, role, roleId, mail, name, mymapsRole, isAdmin) {
  if (goog.isDef(username)) {
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
app.UserManager.prototype.getUsername = function() {
  return this.username;
};

/**
 * @return {string|undefined} The Email.
 */
app.UserManager.prototype.getEmail = function() {
  return this.email;
};

/**
 * @return {?number} The Role Id.
 */
app.UserManager.prototype.getRoleId = function() {
  return this.roleId;
};

/**
 * @return {?number} The Role Id.
 */
app.UserManager.prototype.getMymapsRole = function() {
  return this.mymapsRole;
};

/**
 * @return {boolean} True if is a mymaps admin.
 */
app.UserManager.prototype.getMymapsAdmin = function() {
  return this.isMymapsAdmin;
};


app.module.service('appUserManager', app.UserManager);

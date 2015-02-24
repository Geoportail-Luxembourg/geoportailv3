/**
 * @fileoverview This file defines the controller class for the application's
 * user controller.
 *
 */
goog.provide('app.UserController');

goog.require('app');



/**
 * @param {angular.$http} $http Htpp.
 * @param {string} loginUrl the url to authenticate.
 * @param {string} logoutUrl the url to logout.
 * @param {string} getuserinfoUrl the url to get information about the user.
 * @constructor
 * @export
 * @ngInject
 */
app.UserController = function($http, loginUrl, logoutUrl, getuserinfoUrl) {

  /**
   * @type {string}
   * @private
   */
  this.loginUrl_ = loginUrl;

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
   * @type {object}
   * @private
   */
  this['credentials'] = {
    'login' : null,
    'password' : null
  };

  /**
   * @type {angular.$http}
   * @private
   */
  this['http_'] = $http;

  /**
   * @type {string}
   */
  this['login'] = null;


  /**
   * @type {string}
   */
  this['email'] = null;


  /**
   * @type {string}
   */
  this['role'] = null;

  /**
   * @type {number}
   */
  this['role_id'] = 0;

  /**
   * @type {string}
   */
  this['name'] = null;

  /**
   * @type {boolean}
   */
  this['isError'] = false;

  this.getUserInfo();
};


/**
 * @param {Object} credentials Credentials.
 * @export
 */
app.UserController.prototype.authenticate = function(credentials) {

  var that = this;
  this['http_']({
    method: 'POST',
    url: this.loginUrl_,
    data: $.param({
      'login': credentials['login'],
      'password': credentials['password']
    }),
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  }).success(function(data, status, headers, config) {

    if (status == 200) {
      that.getUserInfo();
      that['isError'] = false;
    }else {
      that['isError'] = true;
    }

  }). error(function(data, status, headers, config) {
    that['isError'] = true;
  });
};


/**
 * @export
 */
app.UserController.prototype.logout = function() {
  var that = this;
  this['http_']({
    method: 'POST',
    url: this.logoutUrl_,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  }).success(function(data, status, headers, config) {
    if (status == 200) {
      that.getUserInfo();
      that['isError'] = false;
    }else {
      that.getUserInfo();
      that['isError'] = true;
    }
  }). error(function(data, status, headers, config) {
    that.getUserInfo();
    that['isError'] = true;
  });
};


/**
 * @export
 */
app.UserController.prototype.getUserInfo = function() {
  var that = this;
  this['http_']({
    method: 'POST',
    url: this.getuserinfoUrl_
  }).success(function(data, status, headers, config) {

    if (status == 200) {
      that.setUserInfo(
          data['login'],
          data['role'],
          data['role_id'],
          data['mail'],
          data['sn']
      );
    }else {
      that.setUserInfo(null, null, null, null, null);
    }

  }).error(function(data, status, headers, config) {
    that.setUserInfo(null, null, null, null, null);
  });
};


/**
 * @return {boolean}
 * @export
 */
app.UserController.prototype.isAuthenticated = function() {
  if (!goog.isNull(this['login']) && this['login'].length > 0) {
    return true;
  }
  return false;
};


/**
 * @return {boolean}
 * @export
 */
app.UserController.prototype.hasError = function() {
  return this['isError'];
};


/**
 * @param {?string} login Login.
 * @param {?string} role Role.
 * @param {?number} role_id Role id.
 * @param {?string} mail Mail.
 * @param {?string} name Name.
 */
app.UserController.prototype.setUserInfo = function(
    login, role, role_id, mail, name) {
  this['login'] = login;
  this['role'] = role;
  this['role_id'] = role_id;
  this['mail'] = mail;
  this['name'] = name;
};


app.module.controller('UserController', app.UserController);

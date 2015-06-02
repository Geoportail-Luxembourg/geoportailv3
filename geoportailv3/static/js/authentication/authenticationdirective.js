goog.provide('app.authenticationDirective');

goog.require('app');


/**
 * @param {string} appAuthenticationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.authenticationDirective = function(appAuthenticationTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'roleId': '=appAuthenticationRoleid',
      'lang': '=appAuthenticationLang'
    },
    controller: 'AppAuthenticationController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appAuthenticationTemplateUrl
  };
};

app.module.directive('appAuthentication', app.authenticationDirective);



/**
 * @param {angular.$http} $http Angular http service.
 * @param {string} loginUrl The application login URL.
 * @param {string} logoutUrl The application logout URL.
 * @param {string} getuserinfoUrl The url to get information about the user.
 * @constructor
 * @export
 * @ngInject
 */
app.AuthenticationController = function($http, loginUrl, logoutUrl,
    getuserinfoUrl) {
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
   * @type {Object}
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
  this.http_ = $http;


  /**
   * @type {string|undefined}
   */
  this['login'] = undefined;


  /**
   * @type {string|undefined}
   */
  this['email'] = undefined;


  /**
   * @type {string|undefined}
   */
  this['role'] = undefined;

  /**
   * @type {number|undefined}
   */
  this['roleId'] = undefined;

  /**
   * @type {string|undefined}
   */
  this['name'] = undefined;

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
app.AuthenticationController.prototype.authenticate = function(credentials) {

  var that = this;
  var req = $.param({
    'login': credentials['login'],
    'password': credentials['password']
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  this.http_.post(this.loginUrl_, req, config).success(
      function(data, status, headers, config) {
        if (status == 200) {
          that.getUserInfo();
          that['isError'] = false;
        } else {
          that['isError'] = true;
        }
      }).error(
      function(data, status, headers, config) {
        that['isError'] = true;
      });
};


/**
 * @export
 */
app.AuthenticationController.prototype.logout = function() {
  var that = this;
  var req = {};
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  this.http_.post(this.logoutUrl_, req, config).success(
      function(data, status, headers, config) {
        if (status == 200) {
          that.getUserInfo();
          that['isError'] = false;
        } else {
          that.getUserInfo();
          that['isError'] = true;
        }
      }).error(
      function(data, status, headers, config) {
        that.getUserInfo();
        that['isError'] = true;
      });
};


/**
 * @export
 */
app.AuthenticationController.prototype.getUserInfo = function() {
  var that = this;
  var req = {};
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };

  this.http_.post(this.getuserinfoUrl_, req, config).success(
      function(data, status, headers, config) {
        if (status == 200) {
          that.setUserInfo(
              data['login'],
              data['role'],
              data['role_id'],
              data['mail'],
              data['sn']
          );
        } else {
          that.clearUserInfo();
        }
      }).error(
      function(data, status, headers, config) {
        that.clearUserInfo();
      });
};


/**
 * @return {boolean}
 * @export
 */
app.AuthenticationController.prototype.isAuthenticated = function() {
  if (goog.isDef(this['login']) && this['login'].length > 0) {
    return true;
  }
  return false;
};


/**
 * @return {boolean}
 * @export
 */
app.AuthenticationController.prototype.hasError = function() {
  return this['isError'];
};


/**
 * Clear the user information. This happens when logging out and in case
 * of error.
 */
app.AuthenticationController.prototype.clearUserInfo = function() {
  this.setUserInfo(undefined, undefined, undefined, undefined, undefined);
};


/**
 * @param {string|undefined} login Login.
 * @param {string|undefined} role Role.
 * @param {number|undefined} roleId Role id.
 * @param {string|undefined} mail Mail.
 * @param {string|undefined} name Name.
 */
app.AuthenticationController.prototype.setUserInfo = function(
    login, role, roleId, mail, name) {
  this['login'] = login;
  this['role'] = role;
  this['roleId'] = roleId;
  this['mail'] = mail;
  this['name'] = name;
};


app.module.controller('AppAuthenticationController',
    app.AuthenticationController);

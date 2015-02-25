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
    controller: 'AppAuthenticationController',
    controllerAs: 'userCtrl',
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
app.AuthenticationController.prototype.isAuthenticated = function() {
  if (!goog.isNull(this['login']) && this['login'].length > 0) {
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
 * @param {?string} login Login.
 * @param {?string} role Role.
 * @param {?number} role_id Role id.
 * @param {?string} mail Mail.
 * @param {?string} name Name.
 */
app.AuthenticationController.prototype.setUserInfo = function(
    login, role, role_id, mail, name) {
  this['login'] = login;
  this['role'] = role;
  this['role_id'] = role_id;
  this['mail'] = mail;
  this['name'] = name;
};


app.module.controller('AppAuthenticationController',
    app.AuthenticationController);

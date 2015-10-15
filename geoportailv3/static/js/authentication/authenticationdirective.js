goog.provide('app.AuthenticationController');
goog.provide('app.authenticationDirective');

goog.require('app');
goog.require('app.UserManager');


/**
 * @param {string} appAuthenticationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.authenticationDirective = function(appAuthenticationTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
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
 * @param {app.UserManager} appUserManager
 * @constructor
 * @export
 * @ngInject
 */
app.AuthenticationController = function(appUserManager) {
  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {Object}
   * @private
   */
  this['credentials'] = {
    'login' : null,
    'password' : null
  };
};


/**
 * @export
 */
app.AuthenticationController.prototype.authenticate = function() {

  this.appUserManager_.authenticate(this['credentials']);
};


/**
 * @export
 */
app.AuthenticationController.prototype.logout = function() {
  this.appUserManager_.logout();
};


/**
 * @export
 */
app.AuthenticationController.prototype.getUserInfo = function() {
  this.appUserManager_.getUserInfo();
};


/**
 * @return {boolean}
 * @export
 */
app.AuthenticationController.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
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
  this.appUserManager_.setUserInfo(undefined, undefined, undefined,
      undefined, undefined);
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
  this.appUserManager_.setUserInfo(login, role, roleId, mail, name);
};


/**
 * @return {string}
 * @export
 */
app.AuthenticationController.prototype.getMail = function() {
  return this.appUserManager_['mail'];
};


/**
 * @return {string}
 * @export
 */
app.AuthenticationController.prototype.getLogin = function() {
  return this.appUserManager_['login'];
};


app.module.controller('AppAuthenticationController',
    app.AuthenticationController);

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
   * @type {string}
   * @export
   */
  this.username = '';

  /**
   * @type {string}
   * @export
   */
  this.password = '';

};


/**
 * @export
 */
app.AuthenticationController.prototype.authenticate = function() {

  this.appUserManager_.authenticate(this.username, this.password);
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
 * @return {string|undefined}
 * @export
 */
app.AuthenticationController.prototype.getEmail = function() {
  return this.appUserManager_.getEmail();
};


/**
 * @return {string|undefined}
 * @export
 */
app.AuthenticationController.prototype.getUsername = function() {
  return this.appUserManager_.getUsername();
};


app.module.controller('AppAuthenticationController',
    app.AuthenticationController);

goog.provide('app.AuthenticationController');
goog.provide('app.authenticationDirective');

goog.require('app.module');


/**
 * @param {string} appAuthenticationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.authenticationDirective = function(appAuthenticationTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'lang': '=appAuthenticationLang',
      'userOpen': '=appAuthenticationUseropen'
    },
    controller: 'AppAuthenticationController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appAuthenticationTemplateUrl
  };
};

app.module.directive('appAuthentication', app.authenticationDirective);


/**
 * @param {app.UserManager} appUserManager The usermanager service.
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
  this.appUserManager_.authenticate(this.username, this.password).then(
      goog.bind(function(response) {
        if (response.status == 200) {
          this['userOpen'] = false;
        }
      }, this));
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
 * @return {boolean} True if is authenticated.
 * @export
 */
app.AuthenticationController.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @return {string|undefined} The email.
 * @export
 */
app.AuthenticationController.prototype.getEmail = function() {
  return this.appUserManager_.getEmail();
};


/**
 * @return {string|undefined} The username.
 * @export
 */
app.AuthenticationController.prototype.getUsername = function() {
  return this.appUserManager_.getUsername();
};


app.module.controller('AppAuthenticationController',
    app.AuthenticationController);

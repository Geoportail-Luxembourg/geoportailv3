goog.provide('app.authentication.AuthenticationController');

goog.require('app.module');


/**
 * @param {app.UserManager} appUserManager The usermanager service.
 * @constructor
 * @export
 * @ngInject
 */
app.authentication.AuthenticationController = function(appUserManager) {

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
app.authentication.AuthenticationController.prototype.authenticate = function() {
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
app.authentication.AuthenticationController.prototype.logout = function() {
  this.appUserManager_.logout();
};


/**
 * @export
 */
app.authentication.AuthenticationController.prototype.getUserInfo = function() {
  this.appUserManager_.getUserInfo();
};


/**
 * @return {boolean} True if is authenticated.
 * @export
 */
app.authentication.AuthenticationController.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @return {string|undefined} The email.
 * @export
 */
app.authentication.AuthenticationController.prototype.getEmail = function() {
  return this.appUserManager_.getEmail();
};


/**
 * @return {string|undefined} The username.
 * @export
 */
app.authentication.AuthenticationController.prototype.getUsername = function() {
  return this.appUserManager_.getUsername();
};


app.module.controller('AppAuthenticationController',
    app.authentication.AuthenticationController);

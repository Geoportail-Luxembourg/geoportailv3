goog.module('app.authentication.AuthenticationController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {app.UserManager} appUserManager The usermanager service.
 * @constructor
 * @export
 * @ngInject
 */
exports = function(appUserManager) {

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
exports.prototype.authenticate = function() {
  this.appUserManager_.authenticate(this.username, this.password).then(
      function(response) {
        if (response.status == 200) {
          this['userOpen'] = false;
        }
      }.bind(this));
};


/**
 * @export
 */
exports.prototype.logout = function() {
  this.appUserManager_.logout();
};


/**
 * @export
 */
exports.prototype.getUserInfo = function() {
  this.appUserManager_.getUserInfo();
};


/**
 * @return {boolean} True if is authenticated.
 * @export
 */
exports.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @return {string|undefined} The email.
 * @export
 */
exports.prototype.getEmail = function() {
  return this.appUserManager_.getEmail();
};


/**
 * @return {string|undefined} The username.
 * @export
 */
exports.prototype.getUsername = function() {
  return this.appUserManager_.getUsername();
};


appModule.controller('AppAuthenticationController',
    exports);

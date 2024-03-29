/**
 * @module app.query.foragevirtuelreportController
 */
import appModule from '../module.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';

/**
 * @constructor
 * @param {angular.$http} $http The angular http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {app.UserManager} appUserManager The usermanager service.
 * @export
 * @ngInject
 */
const exports = function($http, appNotify, gettextCatalog,
    appUserManager) {
  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {string}
   * @private
   */
  this.mail_ = '';
  if (this.appUserManager_.isAuthenticated()) {
    this.mail_ = /** @type {string} */ (this.appUserManager_.getEmail());
  }
};


/**
 * @param {string} mail Set the email.
 * @return {*} The email.
 * @export
 */
exports.prototype.getSetMail = function(mail) {
  if (arguments.length) {
    this.mail_ = mail;
  } else {
    return this.mail_;
  }
};


/**
 * Generate and send the repport.
 * @export
 */
exports.prototype.generateRepport = function() {
  let x = this['features'][0].geometry.coordinates[0];
  let y = this['features'][0].geometry.coordinates[1];
  var msg = this.gettextCatalog.getString('Veuillez saisir une adresse email valide');
  var re = /^\S+@\S+\.\S+$/;
  if (this.mail_.length === 0 || !re.test(this.mail_)) {
    this.notify_(msg, appNotifyNotificationType.WARNING);
  } else {
    this.$http_.post(
      '/getRapportForageVirtuel?x='+x+'&y='+y+'&email=' + this.mail_,
      {}
    );
    msg = this.gettextCatalog.getString('Votre rapport est en train d\'être généré. Un email vous sera envoyé à l\'adresse {{email}} dès qu\'il sera disponible',
        {'email': this.mail_});
    this.notify_(msg, appNotifyNotificationType.INFO);
  }
};

appModule.controller('AppForagevirtuelreportController',
                      exports);


export default exports;

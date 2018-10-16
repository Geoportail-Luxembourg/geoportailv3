goog.provide('app.query.PdsreportController');


goog.require('app.module');
goog.require('app.NotifyNotificationType');


/**
 * @constructor
 * @param {angular.$http} $http The angular http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {app.UserManager} appUserManager The usermanager service.
 * @param {string} pdsUrl Url to Pds Report Controller.
 * @export
 * @ngInject
 */
app.query.PdsreportController = function($http, appNotify, gettextCatalog,
    appUserManager, pdsUrl) {
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
   * @export
   * @type {ol.Feature}
   */
  this.featue = this['feature'];

  /**
   * @type {boolean}
   * @private
   */
  this.tac_ = false;

  /**
   * @type {string}
   * @private
   */
  this.mail_ = '';
  if (this.appUserManager_.isAuthenticated()) {
    this.mail_ = /** @type {string} */ (this.appUserManager_.getEmail());
  }

  /**
   * @type {string}
   * @private
   */
  this.pdsUrl_ = pdsUrl;

};

/**
 * @param {boolean} tac True to accept the terms and conditions.
 * @return {*} True if terms and conditions are accepted.
 * @export
 */
app.query.PdsreportController.prototype.getSetTAC = function(tac) {
  if (arguments.length) {
    this.tac_ = tac;
  } else {
    return this.tac_;
  }
};


/**
 * @param {string} mail Set the email.
 * @return {*} The email.
 * @export
 */
app.query.PdsreportController.prototype.getSetMail = function(mail) {
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
app.query.PdsreportController.prototype.generateRepport = function() {

  var msg = this.gettextCatalog.getString('Veuillez saisir une adresse email valide');
  var re = /^\S+@\S+\.\S+$/;
  if (this.mail_.length === 0 || !re.test(this.mail_)) {
    this.notify_(msg, app.NotifyNotificationType.WARNING);
  } else {
    this.$http_.post(
      this.pdsUrl_ + '/report/' + this['ids'] + '.pdf?email=' + this.mail_ + '&staging=' + this['staging'],
      {}
    );
    msg = this.gettextCatalog.getString('Votre attestation est en train d\'être généré. Un email vous sera envoyé à l\'adresse {{email}} dès qu\'il sera disponible',
        {'email': this.mail_});
    this.notify_(msg, app.NotifyNotificationType.INFO);
  }
};

app.module.controller('AppPdsreportController',
                      app.query.PdsreportController);


goog.provide('app.PagreportController');
goog.provide('app.pagreportDirective');

goog.require('app.Notify');


/**
 * @param {string} appPagreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.pagreportDirective = function(appPagreportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appPagreportIds'
    },
    controller: 'AppPagreportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPagreportTemplateUrl
  };
};
app.module.directive('appPagreport', app.pagreportDirective);


/**
 * @constructor
 * @param {angular.$http} $http The angular http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {app.UserManager} appUserManager The usermanager service.
 * @export
 * @ngInject
 */
app.PagreportController = function($http, appNotify, gettextCatalog,
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

}

/**
 * @param {boolean} tac True to accept the terms and conditions.
 * @return {*} True if terms and conditions are accepted.
 * @export
 */
app.PagreportController.prototype.getSetTAC = function(tac) {
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
app.PagreportController.prototype.getSetMail = function(mail) {
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
app.PagreportController.prototype.generateRepport = function() {

  var msg = this.gettextCatalog.getString('Veuillez saisir une adresse email valide');
  var re = /^\S+@\S+\.\S+$/;
  if (this.mail_.length === 0 || !re.test(this.mail_)) {
    this.notify_(msg);
  } else if (this.tac_ < 1) {
    msg = this.gettextCatalog.getString('Veuillez accepter les termes du rapport');
    this.notify_(msg);
  } else {
    this.$http_.post(
      'http://dev.geoportail.lu/pagreport/' + this['ids'] + '.pdf?email=' + this.mail_,
      {}
    );
    msg = this.gettextCatalog.getString('Votre rapport est en train d\'être généré. Un email vous sera envoyé à l\'adresse ' + this.mail_ + ' dès qu\'il sera disponible');
    this.notify_(msg);
  }
}

app.module.controller('AppPagreportController',
                      app.PagreportController);

goog.provide('app.PagreportController');
goog.provide('app.pagreportDirective');
goog.provide('app.CasiporeportController');
goog.provide('app.casiporeportDirective');

goog.provide('app.PdsreportController');
goog.provide('app.pdsreportDirective');


goog.require('app.module');
goog.require('app.NotifyNotificationType');


/**
 * @param {string} appPagreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.pagreportDirective = function(appPagreportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appPagreportIds',
      'staging': '=appPagreportStaging'
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
 * @param {string} pagUrl Url to Pag Report Controller.
 * @export
 * @ngInject
 */
app.PagreportController = function($http, appNotify, gettextCatalog,
    appUserManager, pagUrl) {
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
  this.pagUrl_ = pagUrl;

};

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
    this.notify_(msg, app.NotifyNotificationType.WARNING);
  } else if (this.tac_ < 1) {
    msg = this.gettextCatalog.getString('Veuillez accepter les termes du rapport');
    this.notify_(msg, app.NotifyNotificationType.WARNING);
  } else {
    this.$http_.post(
      this.pagUrl_ + '/report/' + this['ids'] + '.pdf?email=' + this.mail_ + '&staging=' + this['staging'],
      {}
    );
    msg = this.gettextCatalog.getString('Votre rapport est en train d\'être généré. Un email vous sera envoyé à l\'adresse {{email}} dès qu\'il sera disponible',
        {'email': this.mail_});
    this.notify_(msg, app.NotifyNotificationType.INFO);
  }
};

app.module.controller('AppPagreportController',
                      app.PagreportController);

/**
 * @param {string} appCasiporeportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.casiporeportDirective = function(appCasiporeportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appCasiporeportIds',
      'staging': '=appCasiporeportStaging'
    },
    controller: 'AppCasiporeportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appCasiporeportTemplateUrl
  };
};
app.module.directive('appCasiporeport', app.casiporeportDirective);


/**
 * @constructor
 * @param {angular.$http} $http The angular http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {app.UserManager} appUserManager The usermanager service.
 * @param {string} casipoUrl Url to Casipo Report Controller.
 * @export
 * @ngInject
 */
app.CasiporeportController = function($http, appNotify, gettextCatalog,
    appUserManager, casipoUrl) {
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
  this.casipoUrl_ = casipoUrl;

};

/**
 * @param {boolean} tac True to accept the terms and conditions.
 * @return {*} True if terms and conditions are accepted.
 * @export
 */
app.CasiporeportController.prototype.getSetTAC = function(tac) {
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
app.CasiporeportController.prototype.getSetMail = function(mail) {
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
app.CasiporeportController.prototype.generateRepport = function() {

  var msg = this.gettextCatalog.getString('Veuillez saisir une adresse email valide');
  var re = /^\S+@\S+\.\S+$/;
  if (this.mail_.length === 0 || !re.test(this.mail_)) {
    this.notify_(msg, app.NotifyNotificationType.WARNING);
  } else if (this.tac_ < 1) {
    msg = this.gettextCatalog.getString('Veuillez accepter les termes du rapport');
    this.notify_(msg, app.NotifyNotificationType.WARNING);
  } else {
    this.$http_.post(
      this.casipoUrl_ + '/report/' + this['ids'] + '.pdf?email=' + this.mail_ + '&staging=' + this['staging'],
      {}
    );
    msg = this.gettextCatalog.getString('Votre rapport est en train d\'être généré. Un email vous sera envoyé à l\'adresse {{email}} dès qu\'il sera disponible',
        {'email': this.mail_});
    this.notify_(msg, app.NotifyNotificationType.INFO);
  }
};

app.module.controller('AppCasiporeportController',
                      app.CasiporeportController);

/**
 * @param {string} appPdsreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.pdsreportDirective = function(appPdsreportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appPdsreportIds',
      'staging': '=appPdsreportStaging'
    },
    controller: 'AppPdsreportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPdsreportTemplateUrl
  };
};
app.module.directive('appPdsreport', app.pdsreportDirective);


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
app.PdsreportController = function($http, appNotify, gettextCatalog,
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
app.PdsreportController.prototype.getSetTAC = function(tac) {
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
app.PdsreportController.prototype.getSetMail = function(mail) {
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
app.PdsreportController.prototype.generateRepport = function() {

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
                      app.PdsreportController);


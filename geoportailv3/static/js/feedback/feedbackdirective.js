goog.provide('app.FeedbackController');
goog.provide('app.feedbackDirective');

goog.require('app.module');
goog.require('app.NotifyNotificationType');


/**
 * @param {string} appFeedbackTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.feedbackDirective = function(appFeedbackTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appFeedbackMap',
      'layers': '=appFeedbackLayers',
      'drawingTools': '=appFeedbackDrawingActive',
      'sidebarActive': '=appFeedbackSidebarActive',
      'active': '=appFeedbackActive'
    },
    controller: 'AppFeedbackController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeedbackTemplateUrl
  };
};

app.module.directive('appFeedback', app.feedbackDirective);


/**
 * @constructor
 * @param {angular.Scope} $scope The scope service.
 * @param {angular.$http} $http The http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.UserManager} appUserManager The User Manager service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {ngeo.statemanager.Location} ngeoLocation The location service.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr The Background
 * service.
 * @param {string} postFeedbackUrl the feedback post url.
 * @ngInject
 * @export
 */
app.FeedbackController = function($scope, $http, appNotify, appUserManager,
    gettextCatalog, ngeoLocation, ngeoBackgroundLayerMgr, postFeedbackUrl) {

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {string}
   * @private
   */
  this.postFeedbackUrl_ = postFeedbackUrl;

  /**
   * @type {string|undefined}
   * @export
   */
  this.email = '';

  /**
   * @type {string}
   * @export
   */
  this.description = '';

  /**
   * @type {string}
   * @export
   */
  this.concernedLayer = this.gettextCatalog.getString('Please pick a layer');

  /**
   * @type {ol.layer.Base}
   * @export
   */
  this.bgLayer = null;

  /**
   * @type {string}
   * @export
   */
  this.url = '';

  $scope.$watch(goog.bind(function() {
    return this['active'];
  }, this), goog.bind(function(newVal) {
    if (newVal === true) {
      if (this.appUserManager_.isAuthenticated()) {
        this.email = this.appUserManager_.getEmail();
      }
      this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      this.concernedLayer =
        this.gettextCatalog.getString('Please pick a layer');
      this.setUrl_();
      this.removeListener =
      $scope.$on('ngeoLocationChange', goog.bind(function(event) {
        this.setUrl_();
        this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      }, this));
    } else if (newVal === false && this.removeListener) {
      this.removeListener();
      this.email = this.description = this.url = '';
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this['sidebarActive'];
  }, this), goog.bind(function(newVal) {
    if (newVal) {
      this['active'] = false;
    }
  }, this));
};

/**
 * @private
 */
app.FeedbackController.prototype.setUrl_ = function() {
  this.url = this.ngeoLocation_.getUriString();
};

/**
 * @export
 */
app.FeedbackController.prototype.activateDrawingTools = function() {
  this['drawingTools'] = true;
};

/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
app.FeedbackController.prototype.setConcernedLayer = function(layer) {
  this.concernedLayer = /** @type {string} */ (layer.get('label'));
};

/**
 * @export
 */
app.FeedbackController.prototype.sendReport = function() {
  var req = {
    url: this.url,
    email: this.email,
    description: this.description,
    layer: this.concernedLayer
  };
  var config = {
    headers: {'Content-Type': 'application/json; charset=utf-8'}
  };
  var supportEmail = 'support@geoportail.lu';
  this.$http_.post(this.postFeedbackUrl_, req, config)
    .then(goog.bind(function(response) {
      var msg = this.gettextCatalog.getString(
        'Feedback sent to <a href="mailto:' + supportEmail + '">' +
        supportEmail + '</a>');
      this.notify_(msg, app.NotifyNotificationType.INFO);
      this['active'] = false;
    }, this), goog.bind(function(response) {
      var msg = this.gettextCatalog.getString(
        'Feedback could not be sent to <a href="mailto:' + supportEmail + '">' +
        supportEmail + '</a>');
      this.notify_(msg, app.NotifyNotificationType.ERROR);
    }, this));
};

app.module.controller('AppFeedbackController', app.FeedbackController);

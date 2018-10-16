goog.provide('app.feedback.FeedbackController');

goog.require('app.module');
goog.require('app.NotifyNotificationType');


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
app.feedback.FeedbackController = function($scope, $http, appNotify, appUserManager,
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

  $scope.$watch(function() {
    return this['active'];
  }.bind(this), function(newVal) {
    if (newVal === true) {
      if (this.appUserManager_.isAuthenticated()) {
        this.email = this.appUserManager_.getEmail();
      }
      this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      this.concernedLayer =
        this.gettextCatalog.getString('Please pick a layer');
      this.setUrl_();
      this.removeListener =
      $scope.$on('ngeoLocationChange', function(event) {
        this.setUrl_();
        this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      }.bind(this));
    } else if (newVal === false && this.removeListener) {
      this.removeListener();
      this.email = this.description = this.url = '';
    }
  }.bind(this));

  $scope.$watch(function() {
    return this['sidebarActive'];
  }.bind(this), function(newVal) {
    if (newVal) {
      this['active'] = false;
    }
  }.bind(this));
};

/**
 * @private
 */
app.feedback.FeedbackController.prototype.setUrl_ = function() {
  this.url = this.ngeoLocation_.getUriString();
};

/**
 * @export
 */
app.feedback.FeedbackController.prototype.activateDrawingTools = function() {
  this['drawingTools'] = true;
};

/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
app.feedback.FeedbackController.prototype.setConcernedLayer = function(layer) {
  this.concernedLayer = /** @type {string} */ (layer.get('label'));
};

/**
 * @export
 */
app.feedback.FeedbackController.prototype.sendReport = function() {
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
    .then(function(response) {
      var msg = this.gettextCatalog.getString(
        'Feedback sent to <a href="mailto:' + supportEmail + '">' +
        supportEmail + '</a>');
      this.notify_(msg, app.NotifyNotificationType.INFO);
      this['active'] = false;
    }.bind(this), function(response) {
      var msg = this.gettextCatalog.getString(
        'Feedback could not be sent to <a href="mailto:' + supportEmail + '">' +
        supportEmail + '</a>');
      this.notify_(msg, app.NotifyNotificationType.ERROR);
    }.bind(this));
};

app.module.controller('AppFeedbackController', app.feedback.FeedbackController);

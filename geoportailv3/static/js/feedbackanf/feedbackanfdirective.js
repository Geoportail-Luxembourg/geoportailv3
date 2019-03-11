goog.provide('app.FeedbackanfController');
goog.provide('app.feedbackanfDirective');

goog.require('app');
goog.require('app.LotChasse');
goog.require('app.Notify');
goog.require('app.UserManager');
goog.require('ngeo.map.BackgroundLayerMgr');
goog.require('ngeo.statemanager.Location');


/**
 * @param {string} appFeedbackanfTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.feedbackanfDirective = function(appFeedbackanfTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appFeedbackanfMap',
      'layers': '=appFeedbackanfLayers',
      'drawingTools': '=appFeedbackanfDrawingActive',
      'sidebarActive': '=appFeedbackanfSidebarActive',
      'active': '=appFeedbackanfActive'
    },
    controller: 'AppFeedbackanfController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeedbackanfTemplateUrl
  };
};

app.module.directive('appFeedbackanf', app.feedbackanfDirective);


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
 * @param {string} postFeedbackAnfUrl the feedbackanf post url.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.LotChasse} appLotChasse The selected lot de chasse.
 * @ngInject
 * @export
 */
app.FeedbackanfController = function($scope, $http, appNotify, appUserManager,
    gettextCatalog, ngeoLocation, ngeoBackgroundLayerMgr, postFeedbackAnfUrl,
    appDrawnFeatures, appLotChasse) {
  /**
   * @type {app.LotChasse}
   * @private
   */
  this.appLotChasse_ = appLotChasse;

  /**
   * @type {app.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

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
  this.postFeedbackanfUrl_ = postFeedbackAnfUrl;

  /**
   * @type {string|undefined}
   * @export
   */
  this.email = '';

  /**
   * @type {string|undefined}
   * @export
   */
  this.name = '';

  /**
   * @type {string}
   * @export
   */
  this.lot = '';

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
      this.lot = this.appLotChasse_.getLotChasse();
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
app.FeedbackanfController.prototype.setUrl_ = function() {
  this.url = this.ngeoLocation_.getUriString();
};

/**
 * @export
 */
app.FeedbackanfController.prototype.activateDrawingTools = function() {
  this['drawingTools'] = true;
};

/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
app.FeedbackanfController.prototype.setConcernedLayer = function(layer) {
  this.concernedLayer = /** @type {string} */ (layer.get('label'));
};

/**
 * @export
 */
app.FeedbackanfController.prototype.sendReport = function() {
  var features = this.drawnFeatures_.getCollection().getArray();
  if (features.length === 0) {
    this.activateDrawingTools();
    var msg = this.gettextCatalog.getString(
      'Veuillez dessiner sur la carte où se situe le problème.');
    this.notify_(msg, app.NotifyNotificationType.INFO);
    return;
  }
  var encOpt = /** @type {olx.format.ReadOptions} */ ({
    dataProjection: 'EPSG:2169',
    featureProjection: this['map'].getView().getProjection()
  });

  var req = {
    'url': this.url,
    'email': this.email,
    'name': this.name,
    'description': this.description,
    'lot': this.lot,
    'layer': this.concernedLayer,
    'features': (new ol.format.GeoJSON()).writeFeatures(features, encOpt)
  };
  var config = {
    headers: {'Content-Type': 'application/json; charset=utf-8'}
  };
  this.$http_.post(this.postFeedbackanfUrl_, req, config)
    .then(goog.bind(function(response) {
      var msg = this.gettextCatalog.getString(
        'Le feedback a bien été envoyé à l\'ANF.');
      this.notify_(msg, app.NotifyNotificationType.INFO);
      this['active'] = false;
    }, this), goog.bind(function(response) {
      var msg = this.gettextCatalog.getString('Feedback to ANF could not be sent.');
      this.notify_(msg, app.NotifyNotificationType.ERROR);
    }, this));
};

app.module.controller('AppFeedbackanfController', app.FeedbackanfController);

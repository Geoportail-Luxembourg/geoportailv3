/**
 * @module app.feedbackcrues.FeedbackcruesController
 */
import appModule from '../module.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';
import olFormatGeoJSON from 'ol/format/GeoJSON.js';

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
 * @param {string} postFeedbackCruesUrl the feedbackcrues post url.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @ngInject
 * @export
 */
const exports = function($scope, $http, appNotify, appUserManager,
    gettextCatalog, ngeoLocation, ngeoBackgroundLayerMgr, postFeedbackCruesUrl,
    appDrawnFeatures) {

  /**
   * @type {app.draw.DrawnFeatures}
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
  this.postFeedbackcruesUrl_ = postFeedbackCruesUrl;

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
   * @type {ol.layer.Base}
   * @export
   */
  this.bgLayer = null;

  /**
   * @type {string}
   * @export
   */
  this.url = '';

  $scope.$watch(
    () => this['active'], newVal => {
    if (newVal === true) {
      if (this.appUserManager_.isAuthenticated()) {
        this.email = this.appUserManager_.getEmail();
      }
      this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      this.setUrl_();
      this.removeListener =
      $scope.$on('ngeoLocationChange', function(event) {
        this.setUrl_();
        this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      }.bind(this));
    } else if (newVal === false && this.removeListener) {
      this.removeListener();
      this.url = '';
    }
  });

  $scope.$watch(() => this['sidebarActive'], newVal => {
    if (newVal) {
      this['active'] = false;
    }
  });
};

/**
* @private
*/
exports.prototype.setUrl_ = function() {
  this.url = this.ngeoLocation_.getUriString();
};

/**
* @export
*/
exports.prototype.activateDrawingTools = function() {
  this['drawingTools'] = true;
};

/**
* @export
*/
exports.prototype.sendReport = function() {
  var features = this.drawnFeatures_.getCollection().getArray();
  if (features.length === 0) {
    this.activateDrawingTools();
    var msg = this.gettextCatalog.getString(
      'Veuillez dessiner sur la carte où se situe le problème.');
    this.notify_(msg, appNotifyNotificationType.INFO);
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
    'features': (new olFormatGeoJSON()).writeFeatures(features, encOpt)
  };
  var config = {
    headers: {'Content-Type': 'application/json; charset=utf-8'}
  };
  this.$http_.post(this.postFeedbackcruesUrl_, req, config)
    .then(response => {
      var msg = this.gettextCatalog.getString(
        'Le feedback a bien été envoyé à l\'AGE.');
      this.notify_(msg, appNotifyNotificationType.INFO);
      this['active'] = false;
    }, response => {
      var msg = this.gettextCatalog.getString('Feedback to AGE could not be sent.');
      this.notify_(msg, appNotifyNotificationType.ERROR);
    });
};


appModule.controller('AppFeedbackcruesController', exports);


export default exports;

/**
 * @module app.feedbackanf.FeedbackanfController
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
 * @param {string} postFeedbackAnfUrl the feedbackanf post url.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.LotChasse} appLotChasse The selected lot de chasse.
 * @ngInject
 * @export
 */
const exports = function($scope, $http, appNotify, appUserManager,
    gettextCatalog, ngeoLocation, ngeoBackgroundLayerMgr, postFeedbackAnfUrl,
    appDrawnFeatures, appLotChasse) {
  /**
   * @type {app.LotChasse}
   * @private
   */
  this.appLotChasse_ = appLotChasse;

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

  $scope.$watch(
    () => this['active'], newVal => {
    if (newVal) {
      if (this.appUserManager_.isAuthenticated()) {
        this.email = this.appUserManager_.getEmail();
      }
      this.lot = this.appLotChasse_.getLotChasse();
      this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      this.concernedLayer =
        this.gettextCatalog.getString('Please pick a layer');
      this.setUrl_();
      this.removeListener =
      $scope.$on('ngeoLocationChange', event => {
        this.setUrl_();
        this.bgLayer = this.backgroundLayerMgr_.get(this['map']);
      });
    } else if (!newVal && this.removeListener) {
      this.removeListener();
      this.email = this.description = this.url = '';
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
* @param {ol.layer.Layer} layer Layer.
* @export
*/
exports.prototype.setConcernedLayer = function(layer) {
  this.concernedLayer = /** @type {string} */ (layer.get('label'));
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
    'description': this.description,
    'lot': this.lot,
    'layer': this.concernedLayer,
    'features': (new olFormatGeoJSON()).writeFeatures(features, encOpt)
  };
  var config = {
    headers: {'Content-Type': 'application/json; charset=utf-8'}
  };
  this.$http_.post(this.postFeedbackanfUrl_, req, config)
    .then(response => {
      var msg = this.gettextCatalog.getString(
        'Le feedback a bien été envoyé à l\'ANF.');
      this.notify_(msg, appNotifyNotificationType.INFO);
      this['active'] = false;
    }, response => {
      var msg = this.gettextCatalog.getString('Feedback to ANF could not be sent.');
      this.notify_(msg, appNotifyNotificationType.ERROR);
    });
};


appModule.controller('AppFeedbackanfController', exports);


export default exports;

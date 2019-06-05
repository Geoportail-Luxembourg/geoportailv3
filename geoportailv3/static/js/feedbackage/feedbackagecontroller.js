goog.module('app.feedbackage.FeedbackageController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const appNotifyNotificationType = goog.require('app.NotifyNotificationType');
const olFormatGeoJSON = goog.require('ol.format.GeoJSON');


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
 * @param {string} postFeedbackAgeUrl the feedbackage post url.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @ngInject
 * @export
 */
exports = function($scope, $http, appNotify, appUserManager,
    gettextCatalog, ngeoLocation, ngeoBackgroundLayerMgr, postFeedbackAgeUrl,
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
  this.postFeedbackAgeUrl_ = postFeedbackAgeUrl;

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
  this.description = '';

  /**
   * @type {string}
   * @export
   */
  this.concernedLayer = this.gettextCatalog.getString('Please pick a layer');

  /**
   * @type {string}
   * @export
   */
  this.concernedLayerId = '0';

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
      this.concernedLayerId = '0';
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
 * Add or remove layer from map.
 * @param {Object} layer The layer.
 * @export
 */
exports.prototype.toggle = function(layer) {
  var map = this['map'];
  if (map.getLayers().getArray().indexOf(layer) >= 0) {
    map.removeLayer(layer);
  } else {
    var layerMetadata = layer.get('metadata');
    if (layerMetadata.hasOwnProperty('start_opacity') &&
        layerMetadata.hasOwnProperty('original_start_opacity')) {
      layerMetadata['start_opacity'] = layerMetadata['original_start_opacity'];
    }
    map.addLayer(layer);
  }
};

/**
 * @param {boolean|undefined} layer Layer to check.
 * @return {boolean} Value.
 * @export
 */
exports.prototype.isActive = function(layer) {
  var map = this['map'];
  if (!layer) {
    return false;
  }
  return map.getLayers().getArray().indexOf(layer) >= 0;
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
  this.concernedLayer = this.gettextCatalog.getString(/** @type {string} */ (layer.get('label')));
  this.concernedLayerId = '' + /** @type {number} */ (layer.get('queryable_id'));
  var map = this['map'];
  this['layers'].forEach(function(layer) {
    if (map.getLayers().getArray().indexOf(layer) >= 0) {
      map.removeLayer(layer);
    }
  }.bind(this));
  var layerMetadata = layer.get('metadata');
  if (layerMetadata.hasOwnProperty('start_opacity') &&
      layerMetadata.hasOwnProperty('original_start_opacity')) {
    layerMetadata['start_opacity'] = layerMetadata['original_start_opacity'];
  }
  map.addLayer(layer);
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
    'layer': this.concernedLayer,
    'layerId': this.concernedLayerId,
    'features': (new olFormatGeoJSON()).writeFeatures(features, encOpt)
  };
  var config = {
    headers: {'Content-Type': 'application/json; charset=utf-8'}
  };
  this.$http_.post(this.postFeedbackAgeUrl_, req, config)
    .then(goog.bind(function(response) {
      var msg = this.gettextCatalog.getString(
        'Le feedback a bien été envoyé à l\'AGE.');
      this.notify_(msg, appNotifyNotificationType.INFO);
      this['active'] = false;
    }, this), goog.bind(function(response) {
      var msg = this.gettextCatalog.getString('Feedback to AGE could not be sent.');
      this.notify_(msg, appNotifyNotificationType.ERROR);
    }, this));
};


appModule.controller('AppFeedbackageController', exports);

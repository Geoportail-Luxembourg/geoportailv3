/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */
goog.provide('app.MymapsDirectiveController');
goog.provide('app.mymapsDirective');

goog.require('app');
goog.require('app.FeaturePopup');
goog.require('app.Mymaps');
goog.require('app.Notify');
goog.require('app.SelectedFeatures');
goog.require('app.UserManager');
goog.require('goog.array');
goog.require('ngeo.modalDirective');
goog.require('ol.format.GeoJSON');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appMymapsTemplateUrl
 * @ngInject
 */
app.mymapsDirective = function(appMymapsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'useropen': '=appMymapsUseropen',
      'drawopen': '=appMymapsDrawopen'
    },
    controller: 'AppMymapsController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMymapsTemplateUrl
  };
};


app.module.directive('appMymaps', app.mymapsDirective);



/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.$compile} $compile The compile provider.
 * @param {gettext} gettext Gettext service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.UserManager} appUserManager
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @constructor
 * @export
 * @ngInject
 */

app.MymapsDirectiveController = function($scope, $compile, gettext,
    appMymaps, appNotify, appFeaturePopup, appSelectedFeatures,
    appUserManager, appDrawnFeatures) {

  /**
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.featuresList = appDrawnFeatures.getArray();

  /**
   * @type {app.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {gettext}
   * @private
   */
  this.gettext_ = gettext;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * Tells whether the 'modifying' modal window is open or not.
   * @type {boolean}
   * @export
   */
  this.modifying = false;

  /**
   * Tells whether the 'choosing a map' modal window is open or not.
   * @type {boolean}
   * @export
   */
  this.choosing = false;

  /**
   * List of Mymaps
   * @type {app.MapsResponse}
   * @export
   */
  this.maps = [];

  /**
   * String to be used in the title field in the modifying window.
   * Helps canceling modifications.
   * @type {string}
   * @export
   */
  this.newTitle = '';

  /**
   * String to be used in the description field in the modifying window.
   * Helps canceling modifications.
   * @type {string}
   * @export
   */
  this.newDescription = '';

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {Array.<ol.Feature>?}
   * @export
   */
  this.selectedFeaturesList = this.selectedFeatures_.getArray();

  /**
   * @type {app.FeaturePopup}
   * @private
   */
  this.featurePopup_ = appFeaturePopup;
};


/**
 * Closes the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.closeMap = function() {
  this.drawnFeatures_.clear();
  this.selectedFeatures_.clear();
};


/**
 * Returns if a mymaps is selected or not.
 * @return {boolean} returns true if a mymaps is selected.
 * @export
 */
app.MymapsDirectiveController.prototype.isMymapsSelected = function() {
  return this.appMymaps_.isMymapsSelected();
};


/**
 * @return {string} returns the description
 * @export
 */
app.MymapsDirectiveController.prototype.getMapDescription = function() {
  return this.appMymaps_.mapDescription;
};


/**
 * @return {string} returns the title
 * @export
 */
app.MymapsDirectiveController.prototype.getMapTitle = function() {
  return this.appMymaps_.mapTitle;
};


/**
 * @return {string} returns the title
 * @export
 */
app.MymapsDirectiveController.prototype.getMapOwner = function() {
  return this.appMymaps_.mapOwner;
};


/**
 * Creates and load a new map.
 * @export
 */
app.MymapsDirectiveController.prototype.createMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.createMap(this.gettext_('Sans titre'), '')
      .then(goog.bind(function(resp) {
          if (goog.isNull(resp)) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (goog.isDef(mapId)) {
              var map = {'uuid': mapId};
              this.onChosen(map);
              var msg = this.gettext_('Nouvelle carte créée');
              this.notify_(msg);
            }
          }}, this));
  }
};


/**
 * Delete the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteMap = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    }else {
      this.appMymaps_.deleteMap().then(goog.bind(function(resp) {
        if (goog.isNull(resp)) {
          this.askToConnect();
        } else {
          this.closeMap();
        }
      }, this));
    }
  }
};


/**
 * Open a map. Actually opens the map selector.
 * @export
 */
app.MymapsDirectiveController.prototype.chooseMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  }else {
    this.appMymaps_.getMaps().then(goog.bind(function(mymaps) {
      if (goog.isNull(mymaps)) {
        this.askToConnect();
      } else if (!goog.array.isEmpty(mymaps)) {
        this.choosing = true;
        this.maps = mymaps;
      }
    }, this));
  }
};


/**
 * Notify the user he has to connect
 * @export
 */
app.MymapsDirectiveController.prototype.askToConnect = function() {
  var msg = this.gettext_(
      'Veuillez vous identifier afin d\'accéder à vos cartes'
      );
  this.notify_(msg);
  this['useropen'] = true;
};


/**
 * Called when a map is choosen.
 * @param {Object} map The selected map.
 * @export
 */
app.MymapsDirectiveController.prototype.onChosen = function(map) {
  this.closeMap();
  this.appMymaps_.setCurrentMapId(map['uuid'],
      this.drawnFeatures_.getCollection());
  this['drawopen'] = true;
  this.choosing = false;
};


/**
 * Start the modification:
 *  - opens the modification modal,
 *  - set the values to form inputs.
 * @export
 */
app.MymapsDirectiveController.prototype.modifyMap = function() {
  if (this.appMymaps_.isEditable()) {
    this.newTitle = this.appMymaps_.mapTitle;
    this.newDescription = this.appMymaps_.mapDescription;
    if (this.appMymaps_.isEditable()) {
      this.modifying = true;
    }
  }
};


/**
 * Is the map editable
 * @return {boolean}
 * @export
 */
app.MymapsDirectiveController.prototype.isEditable = function() {
  return this.appMymaps_.isEditable();
};


/**
 * Saves the modifications made using the modification modal.
 * @export
 */
app.MymapsDirectiveController.prototype.saveModifications = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    }else {
      this.appMymaps_.updateMap(this.newTitle, this.newDescription).then(
          goog.bind(function(mymaps) {
            if (goog.isNull(mymaps)) {
              this.askToConnect();
            } else {
              this.modifying = false;
            }
          }, this));
    }
  }
};


/**
 * Selects feature.
 * @param {ol.Feature} feature
 * @export
 */
app.MymapsDirectiveController.prototype.selectFeature = function(feature) {
  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(feature);

  this.featurePopup_.show(feature);
};

app.module.controller('AppMymapsController', app.MymapsDirectiveController);

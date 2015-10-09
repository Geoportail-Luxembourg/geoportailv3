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
goog.require('app.DrawController');
goog.require('app.DrawnFeatures');
goog.require('app.FeaturePopup');
goog.require('app.Mymaps');
goog.require('app.Notify');
goog.require('app.SelectedFeatures');
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
      'map': '=appMymapsMap',
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
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @constructor
 * @export
 * @ngInject
 */

app.MymapsDirectiveController = function($scope, $compile, gettext,
    appMymaps, appNotify, appFeaturePopup,
    appDrawnFeatures, appSelectedFeatures) {

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
   * The currently displayed map id.
   * @type {?string}
   * @export
   */
  this.mapId = null;

  /**
   * The currently displayed map title.
   * @type {string}
   * @export
   */
  this.mapTitle = '';

  /**
   * The currently displayed map description.
   * @type {string}
   * @export
   */
  this.mapDescription = '';

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
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.featuresList = appDrawnFeatures.getArray();

  /**
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

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

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = app.DrawController.createStyleFunction();
};


/**
 * Closes the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.closeMap = function() {
  // TODO ensure that modifications are saved.
  this.appMymaps_.setCurrentMapId(null);
  this.mapId = null;
  this.mapTitle = '';
  this.mapDescription = '';
};


/**
 * Creates and load a new map.
 * @export
 */
app.MymapsDirectiveController.prototype.createMap = function() {
  this.mapTitle = this.gettext_('Map without title');
  this.appMymaps_.createMap(this.mapTitle, this.mapDescription)
    .then(goog.bind(function(resp) {
        var mapId = resp['uuid'];
        if (mapId === null) {
          this.askToConnect();
        } else {
          var map = {'uuid': mapId};
          this.onChosen(map);
        }}, this));
};


/**
 * Delete the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteMap = function() {

  this.appMymaps_.deleteMap().then(goog.bind(function(resp) {
    this.closeMap();
  }, this));
};


/**
 * Open a map. Actually opens the map selector.
 * @export
 */
app.MymapsDirectiveController.prototype.chooseMap = function() {
  this.appMymaps_.getMaps().then(goog.bind(function(mymaps) {
    if (mymaps === null) {
      this.askToConnect();
    } else if (!goog.array.isEmpty(mymaps)) {
      this.choosing = true;
      this.maps = mymaps;
    }
  }, this));
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

  this.appMymaps_.setCurrentMapId(map['uuid']);
  this.appMymaps_.loadMapInformation().then(
      goog.bind(function(mapinformation) {
        this.mapDescription = mapinformation['description'];
        this.mapTitle = mapinformation['title'];
      }, this));

  this.appMymaps_.loadFeatures().then(goog.bind(function(features) {
    var encOpt = /** @type {olx.format.ReadOptions} */ ({
      dataProjection: 'EPSG:2169',
      featureProjection: this['map'].getView().getProjection()
    });
    var jsonFeatures = ((new ol.format.GeoJSON()).
        readFeatures(features, encOpt));
    for (var i in jsonFeatures) {
      jsonFeatures[i].set('__source__', 'mymaps');
      jsonFeatures[i].set('__editable__', true);
      jsonFeatures[i].setStyle(this.featureStyleFunction_);
    }
    this.drawnFeatures_.extend(/** @type {!Array<(null|ol.Feature)>} */
        (jsonFeatures));
    this['drawopen'] = true;
  }, this));


  this.mapId = map['uuid'];
  this.choosing = false;
};


/**
 * Start the modification:
 *  - opens the modification modal,
 *  - set the values to form inputs.
 * @export
 */
app.MymapsDirectiveController.prototype.modifyMap = function() {
  this.newTitle = this.mapTitle;
  this.newDescription = this.mapDescription;
  this.modifying = true;
};


/**
 * Saves the modifications made using the modification modal.
 * @export
 */
app.MymapsDirectiveController.prototype.saveModifications = function() {
  this.mapTitle = this.newTitle;
  this.mapDescription = this.newDescription;
  this.appMymaps_.updateMap(this.mapTitle, this.mapDescription).then(
      goog.bind(function(mymaps) {
        this.modifying = false;
      }, this));
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

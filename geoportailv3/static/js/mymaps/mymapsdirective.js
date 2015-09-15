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
goog.require('ngeo.modalDirective');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appMymapsTemplateUrl
 * @ngInject
 */
app.mymapsDirective = function(appMymapsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'features': '=appMymapsFeatures',
      'selectedFeatures': '=appMymapsSelectedfeatures'
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
 * @param {app.FeaturePopup} appFeaturePopup Feature popup service.
 * @constructor
 * @export
 * @ngInject
 */
app.MymapsDirectiveController = function($scope, $compile, gettext,
    appFeaturePopup) {

  /**
   * @type {ol.Collection<ol.Feature>}
   *  @export
   */
  this.selectedFeatures;

  /**
   * @type {string}
   * @private
   */
  this.defaultTitle_ = $compile('<div translate>' +
      gettext('Map without title') + '</div>')($scope)[0];

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
   * @type {ol.Collection.<ol.Feature>}
   * @export
   */
  this.features;

  /**
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.featuresList = this.features.getArray();

  /**
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.selectedFeaturesList = this.selectedFeatures.getArray();

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
  // TODO ensure that modifications are saved.
  this.mapId = null;
  this.mapTitle = '';
  this.mapDescription = '';
};


/**
 * Creates a new map.
 * @export
 */
app.MymapsDirectiveController.prototype.createMap = function() {
  this.onChosen();
};


/**
 * Open a map. Actually opens the map selector.
 * @export
 */
app.MymapsDirectiveController.prototype.chooseMap = function() {
  this.choosing = true;
};


/**
 * Called when a map is choosen.
 * @export
 */
app.MymapsDirectiveController.prototype.onChosen = function() {
  this.mapId = 'mymap-987654321';
  this.mapTitle = $(this.defaultTitle_).children().html().toString();
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
  // TODO the modifications need to be saved on server before we close the
  // modal window
  this.modifying = false;
};


/**
 * Selects feature.
 * @param {ol.Feature} feature
 * @export
 */
app.MymapsDirectiveController.prototype.selectFeature = function(feature) {
  this.selectedFeatures.clear();
  this.selectedFeatures.push(feature);

  this.featurePopup_.show(feature);
};

app.module.controller('AppMymapsController', app.MymapsDirectiveController);

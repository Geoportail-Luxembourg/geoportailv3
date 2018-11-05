/**
 * @module app.draw.StyleEditingController
 */
import appModule from '../module.js';
import olGeomLineString from 'ol/geom/LineString.js';

/**
 * @param {angular.Scope} $scope The scope.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {string} mymapsUrl URL to "mymaps" Features service.
 * @constructor
 * @ngInject
 */
const exports = function($scope, appDrawnFeatures,
    appUserManager, mymapsUrl) {
  /**
   * @type {string}
   * @private
   */
  this.mymapsUrl_ = mymapsUrl;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {app.draw.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {ol.Feature}
   * @export
   */
  this.feature;

  /**
   * @type {ol.Feature}
   * @export
   */
  this.featureOrig;

  /**
   * @type {string}
   * @export
   */
  this.type = '';

  /**
   * @type {boolean}
   * @export
   */
  this.symbolselector = false;

  /**
   * @type {RegExp}
   * @export
   */
  this.numberRegexp = /^-?[0-9]+(\.[0-9]{1,2})?$/;

  /**
   * @type {Array<string>}
   * @export
   */
  this.colors = [
    ['#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8',
      '#3f48cc', '#a349a4'],
    ['#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea',
      '#7092be', '#c8bfe7'],
    ['#ffffff', '#f7f7f7', '#c3c3c3', '#000000']
  ];

  $scope.$watch(function() {
    return this.feature;
  }.bind(this), function() {
    if (this.feature === undefined) {
      return;
    }
    this.type = this.feature.getGeometry().getType().toLowerCase();
    if (this.type == 'point' && this.feature.get('isLabel')) {
      this.type = 'text';
    }
    this.featureOrig = this.feature.clone();
  }.bind(this));
};


/**
 * @param {string} lineStyle The line style.
 * @export
 */
exports.prototype.setLineDash = function(lineStyle) {
  if (this.feature === undefined) {
    return;
  }
  this.feature.set('linestyle', lineStyle);
};


/**
 * @param {string} symbol The symbol.
 * @export
 */
exports.prototype.setShape = function(symbol) {
  if (this.feature === undefined) {
    return;
  }
  this.feature.set('shape', symbol);
};

/**
 * @param {boolean} orientation True to show the orientation.
 * @return {*} The orientation.
 * @export
 */
exports.prototype.getSetOrientation = function(orientation) {
  if (this.feature === undefined) {
    return;
  }
  if (arguments.length) {
    this.feature.set('showOrientation', orientation);
  } else {
    return this.feature.get('showOrientation');
  }
};

/**
 * @export
 */
exports.prototype.reverseLine = function() {
  if (this.feature) {
    var coordinates = /** @type {ol.geom.LineString}*/
        (this.feature.getGeometry()).getCoordinates().reverse();
    this.feature.setGeometry(new olGeomLineString(coordinates));
    this.drawnFeatures_.saveFeature(this.feature);
  }
};


/**
 * @param {string} color The color.
 * @return {*} The color.
 * @export
 */
exports.prototype.getSetColor = function(color) {
  if (this.feature === undefined) {
    return;
  }
  if (arguments.length) {
    this.feature.set('color', color);
  } else {
    return this.feature.get('color');
  }
};


/**
 * @return {boolean} True if the input type color is supported in the current
 * browser.
 * @export
 */
exports.prototype.isHTML5ColorSupported = function() {
  return $('<input type="color">').prop('type') === 'color';
};


/**
 * @param {string} val The stroke.
 * @return {*} The stroke.
 * @export
 */
exports.prototype.getSetStroke = function(val) {
  if (this.feature === undefined) {
    return;
  }
  if (arguments.length) {
    this.feature.set('stroke', parseFloat(Math.abs(val)));
  } else {
    return this.feature.get('stroke');
  }
};


/**
 * @param {string} val The size.
 * @return {*} The size.
 * @export
 */
exports.prototype.getSetSize = function(val) {
  if (this.feature === undefined) {
    return;
  }
  if (arguments.length) {
    this.feature.set('size', parseFloat(Math.abs(val)));
  } else {
    return this.feature.get('size');
  }
};


/**
 * @param {string} val The rotation.
 * @return {*} The rotation.
 * @export
 */
exports.prototype.getSetRotation = function(val) {
  if (this.feature === undefined) {
    return;
  }
  if (arguments.length) {
    this.feature.set('angle', parseFloat(val) / 360 * Math.PI * 2);
  } else {
    var angle = /** @type {number} */ (this.feature.get('angle'));
    return Math.round((angle * 360 / Math.PI / 2) * 100) / 100;
  }
};


/**
 * @param {string} val The opacity.
 * @return {*} The opacity.
 * @export
 */
exports.prototype.getSetOpacity = function(val) {
  if (this.feature === undefined) {
    return;
  }
  if (arguments.length) {
    this.feature.set('opacity', (100 - parseFloat(Math.abs(val))) / 100);
  } else {
    var opacity = /** @type {number} */ (this.feature.get('opacity'));
    return Math.round ((100 - (opacity * 100)) * 100) / 100;
  }
};


/**
 * @param {string} val The color.
 * @export
 */
exports.prototype.setColor = function(val) {
  if (this.feature !== undefined && arguments.length) {
    this.feature.set('color', val);
  }
};


/**
 * @export
 */
exports.prototype.saveFeature = function() {
  this.drawnFeatures_.saveFeature(this.feature);
  this.editingStyle = false;
};


/**
 * @export
 */
exports.prototype.close = function() {
  this.feature.set('color', this.featureOrig.get('color'));
  this.feature.set('opacity', this.featureOrig.get('opacity'));
  this.feature.set('angle', this.featureOrig.get('angle'));
  this.feature.set('size', this.featureOrig.get('size'));
  this.feature.set('shape', this.featureOrig.get('shape'));
  this.feature.set('symbolId', this.featureOrig.get('symbolId'));
  this.feature.set('stroke', this.featureOrig.get('stroke'));
  this.feature.set('linestyle', this.featureOrig.get('linestyle'));
  this.feature.setGeometry(this.featureOrig.getGeometry());
  this.editingStyle = false;
};


/**
 * @param {string | undefined} symbol The symbol.
 * @return {string} The symbol path.
 * @export
 */
exports.prototype.getSymbolPath = function(symbol) {
  if (symbol) {
    return this.mymapsUrl_ + '/symbol/' + symbol;
  }
  return '';
};


/**
 * @return {boolean} True if is authenticated.
 * @export
 */
exports.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};

appModule.controller('AppStyleEditingController', exports);


export default exports;

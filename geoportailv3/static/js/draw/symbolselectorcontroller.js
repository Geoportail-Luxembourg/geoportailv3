goog.module('app.draw.SymbolSelectorController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * The constructor.
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$http} $http The Http service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {string} mymapsUrl URL to "mymaps" Feature service.
 * @constructor
 * @ngInject
 */
exports = function($scope, $http, appUserManager,
    mymapsUrl) {

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

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

  /**
   * @type {string}
   * @export
   */
  this.tab = 'stylable';

  /**
   * @type {Array}
   * @export
   */
  this.selectedSymbols = [];
  /**
   * @type {Object}
   * @export
   */
  this.newSymbol;
  /**
   * @type {angular.$http}
   * @private
   */
  this.http_ = $http;

  /**
   * @type {boolean}
   * @export
   */
  this.symbolSelector;

  /**
   * @type {ol.Feature}
   * @export
   */
  this.feature;

  /**
   * @type {Object.<string, !angular.$q.Promise>}
   * @private
   */
  this.symboltypes_ = {};

  /**
   * @type {string}
   * @private
   */
  this.mymapsUrl_ = mymapsUrl;

  $scope.$watch(function() {
    return this.newSymbol;
  }.bind(this), function() {
    if (!this.newSymbol) {
      return;
    }
    if (this.newSymbol['result']) {
      this.selectedSymbols.push(this.newSymbol['result']);
    }
  }.bind(this));
};


/**
 * @export
 *
 */
exports.prototype.close = function() {
  this.symbolSelector = false;
};


/**
 * @param {number} symbolId The Id of the symbol to select.
 * @export
 *
 */
exports.prototype.selectSymbol = function(symbolId) {
  this.feature.set('symbolId', symbolId);
  this.feature.set('size', 100);
  this.feature.set('shape', undefined);
  this.close();
};


/**
 * @param {string} shape The shape to select.
 * @export
 *
 */
exports.prototype.selectShape = function(shape) {
  this.feature.set('shape', shape);
  this.feature.set('symbolId', undefined);
  this.close();
};


/**
 * @export
 *
 */
exports.prototype.openMySymbols = function() {
  this.showPublicSymbols = false;
  this.showMySymbols = true;
};


/**
 * @export
 *
 */
exports.prototype.openPublicSymbols = function() {
  this.showPublicSymbols = true;
  this.showMySymbols = false;
};


/**
 * @return {?angular.$q.Promise} The promise.
 * @export
 *
 */
exports.prototype.getPublicSymbols = function() {
  if ('public' in this.symboltypes_) {
    return this.symboltypes_['public'].then(function(response) {
      return response['data'];
    });
  }

  return null;
};


/**
 * @return {?angular.$q.Promise} The promise.
 * @export
 *
 */
exports.prototype.getMySymbols = function() {
  if ('us' in this.symboltypes_) {
    return this.symboltypes_['us'].then(function(response) {
      return response['data'];
    });
  }

  return null;
};


/**
 * @param {string} symboltype the kind of symbols to load
 * @export
 *
 */
exports.prototype.openSymbols = function(symboltype) {
  this.tab = symboltype;
  if (symboltype !== 'stylable') {
    if (!(symboltype in this.symboltypes_) ||
        this.symboltypes_[symboltype]['status'] != 200) {
      this.symboltypes_[symboltype] = this.http_.get(
          this.mymapsUrl_ + '/symbols',
        {params: {
          'symboltype': symboltype
        }})
      .then(
          function(resp) {
            return resp['data']['results'];
          }.bind(this));
    }
    this.symboltypes_[symboltype].then(function(content) {
      this.selectedSymbols = content;
    }.bind(this));
  } else {
    this.selectedSymbols = null;
  }
};


/**
 * @param {string} color The color to set.
 * @export
 */
exports.prototype.setColor = function(color) {
  this.feature.set('color', color);
};


/**
 * @param {string} color The color.
 * @return {*} The color of the feature.
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
 * @param {string} symbol The symbol.
 * @return {string} The url of the symbol.
 * @export
 */
exports.prototype.getSymbolUrl = function(symbol) {
  return this.mymapsUrl_ + symbol;
};


/**
 * @return {boolean} True if the user is authenticated.
 * @export
 */
exports.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};


/**
 * @return {boolean} True if the input type color is supported in the current
 * browser.
 * @export
 */
exports.prototype.isHTML5ColorSupported = function() {
  return $('[type="color"]').prop('type') === 'color';
};

appModule.controller('AppSymbolSelectorController',
    exports);

goog.provide('app.SymbolSelectorController');
goog.provide('app.symbolSelectorDirective');

goog.require('app');
goog.require('goog.color.alpha');
goog.require('ol.Feature');


/**
 * @param {string} appSymbolSelectorTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 */
app.symbolSelectorDirective = function(appSymbolSelectorTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'symbolSelector': '=appSymbolSelectorSymbol',
      'feature': '=appSymbolSelectorFeature'
    },
    controller: 'AppSymbolSelectorController',
    bindToController: true,
    controllerAs: 'ctrl',
    templateUrl: appSymbolSelectorTemplateUrl
  };
};

app.module.directive('appSymbolSelector', app.symbolSelectorDirective);



/**
 * @param {angular.$http} $http
 * @constructor
 * @ngInject
 */
app.SymbolSelectorController = function($http) {

  /**
   * @type {boolean}
   * @export
   */
  this.showStylableSymbols = true;

  /**
   * @type {Array}
   * @export
   */
  this.selectedSymbols = [];

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
};


/**
 * @export
 *
 */
app.SymbolSelectorController.prototype.close = function() {
  this.symbolSelector = false;
};


/**
 * @param {number} symbolId
 * @export
 *
 */
app.SymbolSelectorController.prototype.selectSymbol = function(symbolId) {
  this.feature.set('symbolId', symbolId);
  this.feature.set('shape', undefined);
  this.close();
};


/**
 * @param {string} shape
 * @export
 *
 */
app.SymbolSelectorController.prototype.selectShape = function(shape) {
  this.feature.set('shape', shape);
  this.feature.set('symbolId', undefined);
  this.close();
};


/**
 * @export
 *
 */
app.SymbolSelectorController.prototype.openMySymbols = function() {
  this.showPublicSymbols = false;
  this.showMySymbols = true;
};


/**
 * @export
 *
 */
app.SymbolSelectorController.prototype.openPublicSymbols = function() {
  this.showPublicSymbols = true;
  this.showMySymbols = false;
};


/**
 * @return {?angular.$q.Promise}
 * @export
 *
 */
app.SymbolSelectorController.prototype.getPublicSymbols = function() {
  if ('public' in this.symboltypes_) {
    return this.symboltypes_['public'].then(function(response) {
      return response['data'];
    });
  }

  return null;
};


/**
 * @return {?angular.$q.Promise}
 * @export
 *
 */
app.SymbolSelectorController.prototype.getMySymbols = function() {
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
app.SymbolSelectorController.prototype.openSymbols = function(symboltype) {

  if (symboltype !== 'stylable') {
    this.showStylableSymbols = false;
    if (!(symboltype in this.symboltypes_) ||
        this.symboltypes_[symboltype]['status'] != 200) {
      this.symboltypes_[symboltype] = this.http_.get(
          '/mymaps/symbols',
          {params: {
            'symboltype': symboltype
          }})
      .then(
          goog.bind(function(resp) {
            return resp['data']['results'];
          },this));
    }
    this.symboltypes_[symboltype].then(goog.bind(function(content) {
      this.selectedSymbols = content;
    },this));
  } else {
    this.selectedSymbols = null;
    this.showStylableSymbols = true;
  }
};

app.module.controller('AppSymbolSelectorController',
    app.SymbolSelectorController);

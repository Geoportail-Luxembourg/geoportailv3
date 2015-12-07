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
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$http} $http
 * @param {app.UserManager} appUserManager
 * @param {string} mymapsUrl URL to "mymaps" Feature service.
 * @constructor
 * @ngInject
 */
app.SymbolSelectorController = function($scope, $http, appUserManager,
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

  $scope.$watch(goog.bind(function() {
    return this.newSymbol;
  }, this), goog.bind(function() {
    if (!this.newSymbol) {
      return;
    }
    if (this.newSymbol['result']) {
      this.selectedSymbols.push(this.newSymbol['result']);
    }
  }, this));
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
          goog.bind(function(resp) {
            return resp['data']['results'];
          },this));
    }
    this.symboltypes_[symboltype].then(goog.bind(function(content) {
      this.selectedSymbols = content;
    },this));
  } else {
    this.selectedSymbols = null;
  }
};


/**
 * @param {string} color
 * @export
 */
app.SymbolSelectorController.prototype.setColor = function(color) {
  this.feature.set('color', color);
};


/**
 * @param {string} symbol
 * @return {string}
 * @export
 */
app.SymbolSelectorController.prototype.getSymbolUrl = function(symbol) {
  return this.mymapsUrl_ + symbol;
};


/**
 * @return {boolean}
 * @export
 */
app.SymbolSelectorController.prototype.isAuthenticated = function() {
  return this.appUserManager_.isAuthenticated();
};

app.module.controller('AppSymbolSelectorController',
    app.SymbolSelectorController);

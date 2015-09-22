goog.provide('app.StyleEditingController');
goog.provide('app.styleEditingDirective');

goog.require('app');
goog.require('goog.color.alpha');
goog.require('ngeo.mapDirective');
goog.require('ol.Feature');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.source.OSM');
goog.require('ol.source.Vector');
goog.require('ol.style.RegularShape');
goog.require('ol.style.Stroke');
goog.require('ol.style.Text');


/**
 * @param {string} appStyleEditingTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 */
app.styleEditingDirective = function(appStyleEditingTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'feature': '=appStyleEditingFeature'
    },
    controller: 'AppStyleEditingController',
    bindToController: true,
    controllerAs: 'ctrl',
    templateUrl: appStyleEditingTemplateUrl
  };
};

app.module.directive('appStyleEditing', app.styleEditingDirective);



/**
 * @param {angular.Scope} $scope The scope.
 * @constructor
 */
app.StyleEditingController = function($scope) {

  /**
   * @type {ol.Feature}
   * @export
   */
  this.feature;


  /**
   * @type {string}
   * @export
   */
  this.type;


  /**
   * @type {string}
   * @export
   */
  this.color;


  /**
   * @type {number}
   * @export
   */
  this.opacity;


  /**
   * @type {string}
   * @export
   */
  this.shape;


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

  $scope.$watch(goog.bind(function() {
    return this.feature;
  }, this), goog.bind(function() {
    if (!goog.isDefAndNotNull(this.feature)) {
      return;
    }
    var style = this.feature.get('__style__');
    this.type = this.feature.getGeometry().getType().toLowerCase();
    if (this.type == 'point' && style['text']) {
      this.type = 'text';
    }
    this.color = style['color'];
    this.opacity = style['opacity'];
    this.shape = style['shape'];
    this.lineDash = style['lineDash'];
  }, this));
};


/**
 * @param {string} lineDash
 * @export
 */
app.StyleEditingController.prototype.setLineDash = function(lineDash) {
  if (!goog.isDefAndNotNull(this.feature)) {
    return;
  }
  var style = this.feature.get('__style__');
  style['lineDash'] = lineDash;
  this.lineDash = lineDash;
  this.feature.changed();
};


/**
 * @param {string} shape
 * @export
 */
app.StyleEditingController.prototype.setShape = function(shape) {
  if (!goog.isDefAndNotNull(this.feature)) {
    return;
  }
  var style = this.feature.get('__style__');
  style['shape'] = shape;
  this.shape = shape;
  this.feature.changed();
};


/**
 * @param {number} val
 * @return {*}
 * @export
 */
app.StyleEditingController.prototype.getSetSize = function(val) {
  if (!goog.isDefAndNotNull(this.feature)) {
    return;
  }
  var style = this.feature.get('__style__');
  if (arguments.length) {
    style['size'] = parseFloat(val);
    this.feature.changed();
    return;
  } else {
    return style['size'];
  }
};


/**
 * @param {number} val
 * @return {*}
 * @export
 */
app.StyleEditingController.prototype.getSetRotation = function(val) {
  if (!goog.isDefAndNotNull(this.feature)) {
    return;
  }
  var style = this.feature.get('__style__');
  if (arguments.length) {
    style['rotation'] = parseFloat(val) / 360 * Math.PI * 2;
    this.feature.changed();
    return;
  } else {
    return style['rotation'] * 360 / Math.PI / 2;
  }
};


/**
 * @param {number} val
 * @return {*}
 * @export
 */
app.StyleEditingController.prototype.getSetOpacity = function(val) {
  if (!goog.isDefAndNotNull(this.feature)) {
    return;
  }
  var style = this.feature.get('__style__');
  if (arguments.length) {
    this.opacity = 1 - (parseFloat(val) / 100);
    style['opacity'] = this.opacity;
    this.feature.changed();
    return;
  } else {
    return (1 - this.opacity) * 100;
  }
};


/**
 * @param {string} val
 * @return {*}
 * @export
 */
app.StyleEditingController.prototype.setColor = function(val) {
  if (!goog.isDefAndNotNull(this.feature)) {
    return;
  }
  var style = this.feature.get('__style__');
  if (arguments.length) {
    style['color'] = val;
    this.feature.changed();
    this.color = val;
    return;
  } else {
    return goog.color.parseRgb(style['color']);
  }
};


app.module.controller('AppStyleEditingController', app.StyleEditingController);

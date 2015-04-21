/**
 * @fileoverview This file provides a print directive. This directive is used
 * to create a print form panel in the page.
 *
 * Example:
 *
 * <app-print></app-print>
 */
goog.provide('app.printDirective');


/**
 * @param {string} appPrintTemplateUrl Url to print template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.printDirective = function(appPrintTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appPrintMap'
    },
    controller: 'AppPrintController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPrintTemplateUrl
  };
};


app.module.directive('appPrint', app.printDirective);


/**
 * @const
 * @private
 */
app.DOTS_PER_INCH_ = 72;


/**
 * @const
 * @private
 */
app.INCHES_PER_METER_ = 39.37;


/**
 * @const
 * @private
 */
app.PRINT_SCALES_ = [100, 250, 500, 2500, 5000, 10000, 25000, 50000,
  100000, 500000];


/**
 * @const
 * @private
 */
app.PRINT_DPI_ = 72;



/**
 * @param {angular.Scope} $scope Scope.
 * @constructor
 * @export
 * @ngInject
 */
app.PrintController = function($scope) {

  this['layouts'] = [
    ['A4 portrait', [550, 760]],
    ['A4 landscape', [802, 530]],
    ['A3 portrait', [802, 1108]],
    ['A3 landscape', [1150, 777]]
  ];

  this['layout'] = this['layouts'][0];

  this['scales'] = app.PRINT_SCALES_;

  /**
   * Draw the print window in a map postcompose listener.
   */
  //this['map'].on('postcompose', this.handlePostcompose_, this);
};


/**
 * @param {ol.render.Event} evt Postcompose event.
 * @private
 */
app.PrintController.prototype.handlePostcompose_ = function(evt) {
  var context = evt.context;
  var frameState = evt.frameState;

  var resolution = frameState.viewState.resolution;

  var viewportWidth = frameState.size[0] * frameState.pixelRatio;
  var viewportHeight = frameState.size[1] * frameState.pixelRatio;

  var centerX = viewportWidth / 2;
  var centerY = viewportHeight / 2;

  var paperSize = this['layout'][1];

  var scale = this.getOptimalScale_(
      frameState.size, resolution);

  var ppi = app.DOTS_PER_INCH_;
  var ipm = app.INCHES_PER_METER_;

  var extentHalfWidth =
      (((paperSize[0] / ppi) / ipm) * scale / resolution) / 2;

  var extentHalfHeight =
      (((paperSize[1] / ppi) / ipm) * scale / resolution) / 2;

  var minx = centerX - extentHalfWidth;
  var miny = centerY - extentHalfHeight;
  var maxx = centerX + extentHalfWidth;
  var maxy = centerY + extentHalfHeight;

  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(viewportWidth, 0);
  context.lineTo(viewportWidth, viewportHeight);
  context.lineTo(0, viewportHeight);
  context.lineTo(0, 0);
  context.closePath();

  context.moveTo(minx, miny);
  context.lineTo(minx, maxy);
  context.lineTo(maxx, maxy);
  context.lineTo(maxx, miny);
  context.lineTo(minx, miny);
  context.closePath();

  context.fillStyle = 'rgba(0, 5, 25, 0.5)';
  context.fill();
};


/**
 * Get the optimal print scale for a size and a resolution.
 * @param {ol.Size} size Size.
 * @param {number} resolution Resolution.
 * @return {number} The optimal scale.
 * @private
 */
app.PrintController.prototype.getOptimalScale_ = function(size, resolution) {
  var mapWidth = size[0] * resolution;
  var mapHeight = size[1] * resolution;

  var paperSize = this['layout'][1];
  var scaleWidth = mapWidth * app.INCHES_PER_METER_ *
      app.DOTS_PER_INCH_ / paperSize[0];
  var scaleHeight = mapHeight * app.INCHES_PER_METER_ *
      app.DOTS_PER_INCH_ / paperSize[1];

  var pageScale = Math.min(scaleWidth, scaleHeight);
  var optimal = Infinity;

  var i, ii;
  for (i = 0, ii = app.PRINT_SCALES_.length; i < ii; i++) {
    if (pageScale > app.PRINT_SCALES_[i]) {
      optimal = app.PRINT_SCALES_[i];
    }
  }

  return optimal;
};

app.module.controller('AppPrintController', app.PrintController);

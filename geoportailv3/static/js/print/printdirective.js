/**
 * @fileoverview This file provides a print directive. This directive is used
 * to create a print form panel in the page.
 *
 * Example:
 *
 * <app-print app-print-map="::mainCtrl.map"></app-print>
 */
goog.provide('app.printDirective');


goog.require('goog.events');
goog.require('ngeo.CreatePrint');
goog.require('ngeo.Print');
goog.require('ngeo.PrintUtils');
goog.require('ol.render.Event');
goog.require('ol.render.EventType');


/**
 * @param {string} appPrintTemplateUrl Url to print template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.printDirective = function(appPrintTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appPrintMap',
      'open': '=appPrintOpen'
    },
    controller: 'AppPrintController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPrintTemplateUrl
  };
};


app.module.directive('appPrint', app.printDirective);



/**
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$timeout} $timeout The Angular $timeout service.
 * @param {ngeo.CreatePrint} ngeoCreatePrint The ngeoCreatePrint service.
 * @param {ngeo.PrintUtils} ngeoPrintUtils The ngeoPrintUtils service.
 * @param {string} printServiceUrl URL to print service.
 * @constructor
 * @export
 * @ngInject
 */
app.PrintController = function($scope, $timeout, ngeoCreatePrint,
    ngeoPrintUtils, printServiceUrl) {

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];
  goog.asserts.assert(goog.isDefAndNotNull(this.map_));

  /**
   * @type {angular.$timeout}
   * @private
   */
  this.$timeout_ = $timeout;

  /**
   * @type {ngeo.Print}
   * @private
   */
  this.print_ = ngeoCreatePrint(printServiceUrl);

  /**
   * @type {ngeo.PrintUtils}
   * @private
   */
  this.printUtils_ = ngeoPrintUtils;

  /**
   * @type {Array.<string>}
   */
  this['layouts'] = app.PrintController.LAYOUTS_;

  /**
   * @type {string}
   */
  this['layout'] = this['layouts'][0];

  /**
   * @type {Array.<number>}
   */
  this['scales'] = app.PrintController.MAP_SCALES_;

  /**
   * @type {number}
   */
  this['scale'] = -1;

  /**
   * @type {boolean|undefined}
   */
  this['open'] = undefined;

  /**
   * @type {string|undefined}
   */
  this['title'] = '';

  /**
   * @type {goog.events.Key}
   */
  var postcomposeListenerKey = null;

  /**
   * @type {function(ol.render.Event)}
   */
  var postcomposeListener = ngeoPrintUtils.createPrintMaskPostcompose(
      goog.bind(
          /**
           * Return the size in dots of the map to print. Depends on
           * the selected layout.
           * @return {ol.Size} Size.
           */
          function() {
            var idx = this['layouts'].indexOf(this['layout']);
            goog.asserts.assert(idx >= 0);
            return app.PrintController.MAP_SIZES_[idx];
          }, this),
      goog.bind(
          /**
           * Return the scale of the map to print.
           * @param {olx.FrameState} frameState Frame state.
           * @return {number} Scale.
           */
          function(frameState) {
            return this['scale'];
          }, this));

  // Show/hide the print mask based on the value of the "open" property.
  $scope.$watch(goog.bind(function() {
    return this['open'];
  }, this), goog.bind(function(newVal) {
    if (!goog.isDef(newVal)) {
      return;
    }
    var open = /** @type {boolean} */ (newVal);
    if (open) {
      this.useOptimalScale_();
      goog.asserts.assert(goog.isNull(postcomposeListenerKey));
      postcomposeListenerKey = goog.events.listen(this.map_,
          ol.render.EventType.POSTCOMPOSE, postcomposeListener);
    } else {
      goog.asserts.assert(!goog.isNull(postcomposeListenerKey));
      goog.events.unlistenByKey(postcomposeListenerKey);
      postcomposeListenerKey = null;
    }
    this.map_.render();
  }, this));

};


/**
 * @const
 * @type {Array.<string>}
 * @private
 */
app.PrintController.LAYOUTS_ = [
  'A4 portrait', 'A4 landscape', 'A3 portrait', 'A3 landscape',
  'A2 portrait', 'A2 landscape', 'A1 portrait', 'A1 landscape',
  'A0 portrait', 'A0 landscape'
];


/**
 * @const
 * @type {Array.<number>}
 * @private
 */
app.PrintController.MAP_SCALES_ = [100, 250, 500, 2500, 5000, 10000,
  25000, 50000, 100000, 500000];


/**
 * These values should match those set in the jrxml print templates.
 * @const
 * @type {Array.<ol.Size>}
 * @private
 */
app.PrintController.MAP_SIZES_ = [
  // A4 portrait and landscape
  [470, 650], [715, 395],
  // A3 portrait and landscape
  [715, 975], [1065, 640],
  // A2 portrait and landscape
  [1064, 1475], [1558, 985],
  // A1 portrait and landscape
  [1558, 2175], [2255, 1482],
  // A0 portrait and landscape
  [2254, 3155], [3241, 2173]
];


/**
 * @const
 * @type {number}
 * @private
 */
app.PrintController.DPI_ = 72;


/**
 * @export
 */
app.PrintController.prototype.changeLayout = function() {
  this.map_.render();
};


/**
 * @export
 */
app.PrintController.prototype.changeScale = function() {
  this.map_.render();
};


/**
 * @export
 */
app.PrintController.prototype.print = function() {
  var map = this.map_;

  var dpi = app.PrintController.DPI_;
  var scale = this['scale'];
  var layout = this['layout'];

  // FIXME "description", "name", "url" and "qrimage" are harcoded at
  // this point.

  var spec = this.print_.createSpec(map, scale, dpi, layout, {
    'scale': scale,
    'description': 'Description',
    'name': this['title'],
    'url': 'http://g-o.lu/0mf4r',
    'qrimage': 'http://dev.geoportail.lu/shorten/qr?url=http://g-o.lu/0mf4r'
  });

  this.print_.createReport(spec).then(
      angular.bind(this, this.handleCreateReportSuccess_),
      angular.bind(this, this.handleCreateReportError_));
};


/**
 * @param {MapFishPrintReportResponse} resp Response.
 * @private
 */
app.PrintController.prototype.handleCreateReportSuccess_ = function(resp) {
  this.getStatus_(resp.ref);
};


/**
 * @param {string} ref Ref.
 * @private
 */
app.PrintController.prototype.getStatus_ = function(ref) {
  this.print_.getStatus(ref).then(
      angular.bind(this, this.handleGetStatusSuccess_, ref),
      angular.bind(this, this.handleGetStatusError_));
};


/**
 * @param {MapFishPrintReportResponse} resp Response.
 * @private
 */
app.PrintController.prototype.handleCreateReportError_ = function(resp) {
  // FIXME
};


/**
 * @param {string} ref Ref.
 * @param {MapFishPrintStatusResponse} resp Response.
 * @private
 */
app.PrintController.prototype.handleGetStatusSuccess_ = function(ref, resp) {
  var done = resp.done;
  if (done) {
    // The report is ready. Open it by changing the window location.
    window.location.href = this.print_.getReportUrl(ref);
  } else {
    // The report is not ready yet. Check again in 1s.
    var that = this;
    this.$timeout_(function() {
      that.getStatus_(ref);
    }, 1000, false);
  }
};


/**
 * @param {Object} data Data.
 * @private
 */
app.PrintController.prototype.handleGetStatusError_ = function(data) {
  // FIXME
};


/**
 * Get the optimal print scale for the current map size and resolution,
 * and for the selected print layout.
 * @private
 */
app.PrintController.prototype.useOptimalScale_ = function() {
  var mapSize = this.map_.getSize();
  goog.asserts.assert(goog.isDefAndNotNull(mapSize));
  var mapResolution = this.map_.getView().getResolution();
  goog.asserts.assert(goog.isDef(mapResolution));

  var idx = this['layouts'].indexOf(this['layout']);
  goog.asserts.assert(idx >= 0);

  this['scale'] = this.printUtils_.getOptimalScale(mapSize, mapResolution,
      app.PrintController.MAP_SIZES_[idx], this['scales']);
};


app.module.controller('AppPrintController', app.PrintController);

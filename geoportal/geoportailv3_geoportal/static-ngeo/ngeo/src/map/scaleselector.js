/**
 * @module ngeo.map.scaleselector
 */
import googAsserts from 'goog/asserts.js';
import * as olArray from 'ol/array.js';
import olMap from 'ol/Map.js';
import * as olEvents from 'ol/events.js';
import { unByKey } from 'ol/Observable';
import 'bootstrap/js/dropdown.js';

/**
 * @type {!angular.Module}
 */
const exports = angular.module('ngeoScaleselector', []);


exports.value('ngeoScaleselectorTemplateUrl',
  /**
   * @param {angular.JQLite} element Element.
   * @param {angular.Attributes} attrs Attributes.
   * @return {string} Template URL.
   */
  (element, attrs) => {
    const templateUrl = attrs['ngeoScaleselectorTemplateurl'];
    return templateUrl !== undefined ? templateUrl :
      'ngeo/map/scaleselector';
  });

exports.run(/* @ngInject */ ($templateCache) => {
  $templateCache.put('ngeo/map/scaleselector', require('./scaleselector.html'));
});


/**
 * Provides the "ngeoScaleselector" directive, a widget for
 * selecting map scales.
 *
 * Example:
 *
 *     <div ngeo-scaleselector="ctrl.scales" ngeo-scaleselector-map="ctrl.map">
 *     </div>
 *
 * The expression passed to the ngeo-scaleselector attribute should return an
 * array of this form:
 *
 *    [20000, 10000, 5000, 2500]
 *
 * That directive's partial uses Bootstrap's `dropdown` and `dropdown-menu`
 * classes, and `data-toggle="dropdown"`, so it is meant to be used with
 * Bootstrap's "dropdown" jQuery plugin.
 *
 * You can pass options to configure the behaviors of this element. Options is
 * a {@link ngeox.ScaleselectorOptions} object.
 *
 * Example:
 *
 *     <div ngeo-scaleselector="ctrl.scales"
 *       ngeo-scaleselector-map="ctrl.map"
 *       ngeo-scaleselector-options="ctrl.scaleSelectorOptions">
 *     </div>
 *
 * By default the directive uses "scaleselector.html" as its templateUrl. This
 * can be changed by redefining the "ngeoScaleselectorTemplateUrl" value.
 *
 * The directive has its own scope, but it is not isolate scope. That scope
 * includes a reference to the directive's controller: the "scaleselectorCtrl"
 * scope property.
 *
 * The directive doesn't create any watcher. In particular the object including
 * the scales information is now watched.
 *
 * See our live example: [../examples/scaleselector.html](../examples/scaleselector.html)
 *
 * @htmlAttribute {!Array.<number>} ngeo-scaleselector The available scales.
 * @htmlAttribute {ol.Map} ngeo-scaleselector-map The map.
 * @htmlAttribute {ngeox.ScaleselectorOptions} ngeo-scaleselector-options
 *     Optional. The configuration options.
 * @param {string|function(!angular.JQLite=, !angular.Attributes=)}
 *     ngeoScaleselectorTemplateUrl Template URL for the directive.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 * @ngdoc directive
 * @ngname ngeoScaleselector
 */
const directive = function(ngeoScaleselectorTemplateUrl) {
  return {
    restrict: 'A',
    scope: true,
    controller: 'NgeoScaleselectorController',
    templateUrl: ngeoScaleselectorTemplateUrl
  };
};


exports.directive('ngeoScaleselector', directive);


/**
 * @constructor
 * @private
 * @struct
 * @param {angular.Scope} $scope Directive scope.
 * @param {angular.JQLite} $element Element.
 * @param {angular.Attributes} $attrs Attributes.
 * @ngInject
 * @ngdoc controller
 * @ngname NgeoScaleselectorController
 */
const ScaleselectorController = function($scope, $element, $attrs, $window) {

  const scalesExpr = $attrs['ngeoScaleselector'];

  /**
   * The zoom level/scale map object.
   * @type {!Array.<number>}
   * @export
   */
  this.scales = /** @type {!Array.<number>} */
    ($scope.$eval(scalesExpr));
  googAsserts.assert(this.scales !== undefined);

  /**
   * @type {Array.<number>}
   * @export
   */
  this.zoomLevels;

  this.window_ = $window;

  $scope.$watch(() => Object.keys(this.scales).length, (newLength) => {
    this.zoomLevels = Object.keys(this.scales).map(Number);
    this.zoomLevels.sort(olArray.numberSafeCompareFunction);
  });

  const mapExpr = $attrs['ngeoScaleselectorMap'];

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_;

  const optionsExpr = $attrs['ngeoScaleselectorOptions'];
  const options = $scope.$eval(optionsExpr);

  /**
   * @type {!ngeox.ScaleselectorOptions}
   * @export
   */
  this.options = ScaleselectorController.getOptions_(options);

  /**
   * @type {angular.Scope}
   * @private
   */
  this.$scope_ = $scope;

  /**
   * @type {?ol.EventsKey}
   * @private
   */
  this.resolutionChangeKey_ = null;

  /**
   * @type {number|undefined}
   * @export
   */
  this.currentScale = undefined;

    // this.map_ = this['map'];
    this.map_ = this.window_.map;

    googAsserts.assertInstanceof(this.map_, olMap);
  
    const view = this.map_.getView();
    if (view !== null) {
      const currentZoom = this.map_.getView().getZoom();
      if (currentZoom !== undefined) {
        this.currentScale = this.getScale(currentZoom);
      }
    }
  
    // olEvents.listen(this.map_, 'change:resolution', this.handleViewChange_, this);
  
    this.map_.getView().on('change:resolution', (event) => {
      this.handleViewChange_();
    })


    this.registerResolutionChangeListener_();

  $scope['scaleselectorCtrl'] = this;

};

/**
 * @param {?} options Options after expression evaluation.
 * @return {!ngeox.ScaleselectorOptions} Options object.
 * @private
 */
ScaleselectorController.getOptions_ = function(options) {
  let dropup = false;
  if (options !== undefined) {
    dropup = options['dropup'] == true;
  }
  return /** @type {ngeox.ScaleselectorOptions} */ ({
    dropup: dropup
  });
};


/**
 * @param {number} zoom Zoom level.
 * @return {number} Scale.
 * @export
 */
ScaleselectorController.prototype.getScale = function(zoom) {
  return this.scales[zoom];
};


/**
 * @param {number} zoom Zoom level.
 * @export
 */
ScaleselectorController.prototype.changeZoom = function(zoom) {
  this.map_.getView().setZoom(zoom);
};


/**
 * @param {ol.Object.Event} e OpenLayers object event.
 * @private
 */
ScaleselectorController.prototype.handleResolutionChange_ = function(e) {
  const view = this.map_.getView();

  // const currentScale = this.scales[/** @type {number} */ (view.getZoom())];
  const currentScale = this.scales[Math.round(view.getZoom())];

  // handleResolutionChange_ is a change:resolution listener. The listener
  // may be executed outside the Angular context, for example when the user
  // double-clicks to zoom on the map.
  //
  // But it may also be executed inside the Angular context, when a function
  // in Angular context calls setZoom or setResolution on the view, which
  // is for example what happens when this controller's changeZoom function
  // is called.
  //
  // For that reason we use $applyAsync instead of $apply here.

  if (currentScale !== undefined) {
    this.$scope_.$applyAsync(() => {
      this.currentScale = currentScale;
    });
  }
};


/**
 * @param {ol.Object.Event} e OpenLayers object event.
 * @private
 */
ScaleselectorController.prototype.handleViewChange_ = function(e) {
  this.registerResolutionChangeListener_();
  this.handleResolutionChange_(null);
};


/**
 * @private
 */
ScaleselectorController.prototype.registerResolutionChangeListener_ = function() {
  if (this.resolutionChangeKey_ !== null) {
    // olEvents.unlistenByKey(this.resolutionChangeKey_);

    unByKey(this.resolutionChangeKey_);
  }

  const view = this.map_.getView();
  // this.resolutionChangeKey_ = olEvents.listen(view,
  //   'change:resolution', this.handleResolutionChange_,
  //   this);

  this.resolutionChangeKey_ = view.on('change:resolution', (event) => {
      console.log('change:resolution inside');
      this.handleResolutionChange_();
    });
};


exports.controller('NgeoScaleselectorController', ScaleselectorController);


export default exports;

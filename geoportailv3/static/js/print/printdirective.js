/**
 * @fileoverview This file provides a print directive. This directive is used
 * to create a print form panel in the page.
 *
 * Example:
 *
 * <app-print app-print-map="::mainCtrl.map"
 *            app-print-open="mainCtrl.printOpen"
 *            app-print-currenttheme="mainCtrl.currentTheme"
 *            app-print-layers="mainCtrl.selectedLayers">
 * </app-print>
 */
goog.provide('app.PrintController');
goog.provide('app.printDirective');


goog.require('app.GetShorturl');
goog.require('app.Themes');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.string');
goog.require('ngeo.CreatePrint');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.Print');
goog.require('ngeo.PrintUtils');
goog.require('ol.layer.Layer');
goog.require('ol.layer.Vector');
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
      'open': '=appPrintOpen',
      'currentTheme': '=appPrintCurrenttheme',
      'layers': '=appPrintLayers'
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
 * @param {angular.$q} $q The Angular $q service.
 * @param {angularGettext.Catalog} gettextCatalog
 * @param {ngeo.CreatePrint} ngeoCreatePrint The ngeoCreatePrint service.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {ngeo.PrintUtils} ngeoPrintUtils The ngeoPrintUtils service.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.GetShorturl} appGetShorturl The getShorturl function.
 * @param {string} printServiceUrl URL to print service.
 * @param {string} qrServiceUrl URL to qr generator service.
 * @constructor
 * @export
 * @ngInject
 */
app.PrintController = function($scope, $timeout, $q, gettextCatalog,
    ngeoCreatePrint, ngeoFeatureOverlayMgr, ngeoPrintUtils,
    appThemes, appGetShorturl, printServiceUrl, qrServiceUrl) {


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
   * @type {?angular.$q.Promise}
   * @private
   */
  this.statusTimeoutPromise_ = null;

  /**
   * @type {angular.$q}
   * @private
   */
  this.$q_ = $q;

  /**
   * @type {?angular.$q.Deferred}
   * @private
   */
  this.requestCanceler_ = null;

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
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * A reference to the vector layer used by feature overlays.
   * @type {ol.layer.Vector}
   * @private
   */
  this.featureOverlayLayer_ = ngeoFeatureOverlayMgr.getLayer();

  /**
   * @type {app.GetShorturl}
   * @private
   */
  this.getShorturl_ = appGetShorturl;

  /**
   * @type {string}
   * @private
   */
  this.qrServiceUrl_ = qrServiceUrl;

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;


  /**
   * Current report reference id.
   * @type {string}
   * @private
   */
  this.curRef_ = '';

  /**
   * @type {Array.<string>}
   */
  this['layouts'] = [
    gettextCatalog.getString('A4 portrait'),
    gettextCatalog.getString('A4 landscape'),
    gettextCatalog.getString('A3 portrait'),
    gettextCatalog.getString('A3 landscape'),
    gettextCatalog.getString('A2 portrait'),
    gettextCatalog.getString('A2 landscape'),
    gettextCatalog.getString('A1 portrait'),
    gettextCatalog.getString('A1 landscape'),
    gettextCatalog.getString('A0 portrait'),
    gettextCatalog.getString('A0 landscape')
  ];

  /**
   * @type {string}
   */
  this['layout'] = this['layouts'][0];

  /**
   * @type {Array.<number>}
   */
  this['scales'] = [];

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
   * @type {boolean}
   */
  this['legend'] = false;

  /**
   * @type {boolean}
   */
  this['printing'] = false;

  /**
   * @type {goog.events.Key}
   */
  var postcomposeListenerKey = null;

  /**
   * @type {Array.<ol.layer.Layer>}
   * @private
   */
  this.layers_ = this['layers'];

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
            var layoutIdx = this['layouts'].indexOf(this['layout']);
            goog.asserts.assert(layoutIdx >= 0);
            return app.PrintController.MAP_SIZES_[layoutIdx];
          }, this),
      goog.bind(
          /**
           * Return the scale of the map to print.
           * @param {olx.FrameState} frameState Frame state.
           * @return {number} Scale.
           */
          function(frameState) {
            return app.PrintController.adjustScale_(
                this.map_.getView(), this['scale']);
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
    } else if (!goog.isNull(postcomposeListenerKey)) {
      goog.events.unlistenByKey(postcomposeListenerKey);
      postcomposeListenerKey = null;
    }
    this.map_.render();
  }, this));

  // Set the possible print scales based on the current theme.
  $scope.$watch(goog.bind(function() {
    return this['currentTheme'];
  }, this), goog.bind(function() {
    this.setScales_();
  }, this));
};


/**
 * @const
 * @type {Array.<number>}
 * @private
 */
app.PrintController.DEFAULT_MAP_SCALES_ = [1500, 2500, 5000, 10000, 15000,
  20000, 25000, 50000, 80000, 100000, 125000, 200000, 250000, 400000];


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
app.PrintController.DPI_ = 96;


/**
 * Get the center resolution for the current view state.
 * @param {ol.View} view The view.
 * @return {number} The point resolution.
 * @private
 */
app.PrintController.getViewCenterResolution_ = function(view) {
  var viewCenter = view.getCenter();
  var viewProjection = view.getProjection();
  var viewResolution = view.getResolution();
  goog.asserts.assert(goog.isDef(viewCenter));
  goog.asserts.assert(!goog.isNull(viewProjection));
  goog.asserts.assert(goog.isDef(viewResolution));
  return viewProjection.getPointResolution(viewResolution, viewCenter);
};


/**
 * @param {ol.View} view The view.
 * @param {number} scale The non-adjusted scale.
 * @return {number} The adjusted scale.
 * @private
 */
app.PrintController.adjustScale_ = function(view, scale) {
  var viewResolution = view.getResolution();
  var viewCenterResolution = app.PrintController.getViewCenterResolution_(view);
  goog.asserts.assert(goog.isDef(viewResolution));
  var factor = viewResolution / viewCenterResolution;
  return scale * factor;
};


/**
 * @param {Array.<number>} scales Sorted array of scales (ascending).
 * @param {number} scale Current scale.
 * @return {number} The nearest scale.
 * @private
 */
app.PrintController.findNearestScale_ = function(scales, scale) {
  if (scale <= scales[0]) {
    scale = scales[0];
  } else if (scale >= scales[scales.length - 1]) {
    scale = scales[scales.length - 1];
  } else {
    for (var i = 1, l = scales.length; i < l; ++i) {
      if (scales[i] >= scale) {
        if (scales[i] - scale < scale - scales[i - 1]) {
          scale = scales[i];
        } else {
          scale = scales[i - 1];
        }
        break;
      }
    }
    goog.asserts.assert(i < l);
  }
  return scale;
};


/**
 * @export
 */
app.PrintController.prototype.cancel = function() {
  // Cancel the latest request, if it's not finished yet.
  goog.asserts.assert(!goog.isNull(this.requestCanceler_));
  this.requestCanceler_.resolve();

  // Cancel the status timeout if there's one set, to make sure no other
  // status request is sent.
  if (!goog.isNull(this.statusTimeoutPromise_)) {
    this.$timeout_.cancel(this.statusTimeoutPromise_);
  }

  goog.asserts.assert(this.curRef_.length > 0);

  this.print_.cancel(this.curRef_);

  this.resetPrintStates_();
};


/**
 * @param {string} newLayout The name of the selected layout
 * @export
 */
app.PrintController.prototype.changeLayout = function(newLayout) {
  this['layout'] = newLayout;
  this.useOptimalScale_();
  this.map_.render();
};


/**
 * @param {string} newScale The name of the selected scale
 * @export
 */
app.PrintController.prototype.changeScale = function(newScale) {
  this['scale'] = newScale;
  this.map_.render();
};


/**
 * @export
 */
app.PrintController.prototype.print = function() {
  var map = this.map_;

  var dpi = app.PrintController.DPI_;
  var scale = app.PrintController.adjustScale_(map.getView(), this['scale']);
  var layout = this['layout'];

  var legend = [];
  this.layers_.forEach(function(layer) {
    var name = layer.get('metadata')['legend_name'];
    if (goog.isDef(name)) {
      legend.push({'name': name});
    }
  });

  this.getShorturl_().then(goog.bind(
      /**
       * @param {string} shorturl The short URL.
       */
      function(shorturl) {
        this.requestCanceler_ = this.$q_.defer();
        this['printing'] = true;

        // create print spec object
        var spec = this.print_.createSpec(map, scale, dpi, layout, {
          'scale': this['scale'],
          'name': this['title'],
          'url': shorturl,
          'qrimage': this.qrServiceUrl_ + '?url=' + shorturl,
          'lang': this.gettextCatalog_.currentLanguage,
          'legend': this['legend'] ? legend : null,
          'scalebar': {'geodetic': true}
        });

        // add feature overlay layer to print spec
        var /** @type {Array.<MapFishPrintLayer>} */ layers = [];
        var resolution = map.getView().getResolution();
        goog.asserts.assert(goog.isDef(resolution));
        this.print_.encodeLayer(layers, this.featureOverlayLayer_, resolution);
        if (layers.length > 0) {
          spec.attributes.map.layers.unshift(layers[0]);
        }

        // create print report
        this.print_.createReport(spec, /** @type {angular.$http.Config} */ ({
          timeout: this.requestCanceler_.promise
        })).then(
            angular.bind(this, this.handleCreateReportSuccess_),
            angular.bind(this, this.handleCreateReportError_));

      }, this));
};


/**
 * @param {!angular.$http.Response} resp Response.
 * @private
 */
app.PrintController.prototype.handleCreateReportSuccess_ = function(resp) {
  var mfResp = /** @type {MapFishPrintReportResponse} */ (resp.data);
  var ref = mfResp.ref;
  goog.asserts.assert(ref.length > 0);
  this.curRef_ = ref;
  this.getStatus_(ref);
};


/**
 * @param {string} ref Ref.
 * @private
 */
app.PrintController.prototype.getStatus_ = function(ref) {
  this.requestCanceler_ = this.$q_.defer();
  this.print_.getStatus(ref, /** @type {angular.$http.Config} */ ({
    timeout: this.requestCanceler_.promise
  })).then(
      angular.bind(this, this.handleGetStatusSuccess_, ref),
      angular.bind(this, this.handleGetStatusError_));
};


/**
 * @param {!angular.$http.Response} resp Response.
 * @private
 */
app.PrintController.prototype.handleCreateReportError_ = function(resp) {
  this.resetPrintStates_();

  // FIXME display error message?
};


/**
 * @param {string} ref Ref.
 * @param {!angular.$http.Response} resp Response.
 * @private
 */
app.PrintController.prototype.handleGetStatusSuccess_ = function(ref, resp) {
  var mfResp = /** @type {MapFishPrintStatusResponse} */ (resp.data);
  var done = mfResp.done;
  if (done) {
    // The report is ready. Open it by changing the window location.
    window.location.href = this.print_.getReportUrl(ref);
    this.resetPrintStates_();
  } else {
    // The report is not ready yet. Check again in 1s.
    var that = this;
    this.statusTimeoutPromise_ = this.$timeout_(function() {
      that.getStatus_(ref);
    }, 1000, false);
  }
};


/**
 * @param {!angular.$http.Response} resp Response.
 * @private
 */
app.PrintController.prototype.handleGetStatusError_ = function(resp) {
  this.resetPrintStates_();

  // FIXME display error message?
};


/**
 * @private
 */
app.PrintController.prototype.resetPrintStates_ = function() {
  this['printing'] = false;
  this.curRef_ = '';
};


/**
 * Set possible print scales based on the current theme.
 * @private
 */
app.PrintController.prototype.setScales_ = function() {
  var currentTheme = this['currentTheme'];
  this.appThemes_.getThemeObject(currentTheme).then(goog.bind(
      /**
       * @param {Object} tree Tree object for the theme.
       */
      function(tree) {
        if (!goog.isNull(tree)) {
          goog.asserts.assert('metadata' in tree);
          var scales;
          if (!goog.string.isEmptySafe(tree['metadata']['print_scales'])) {
            var printScalesStr = tree['metadata']['print_scales'];
            scales = goog.array.map(
                printScalesStr.trim().split(','),
                /**
                 * @param {string} scale Scale value as a string.
                 * @return {number} Scale value as a number.
                 */
                function(scale) {
                  return +scale;
                });
            goog.array.sort(scales);
          } else {
            scales = app.PrintController.DEFAULT_MAP_SCALES_;
          }
          this['scales'] = scales;
          var scale = this['scale'];
          if (scale != -1) {
            // find nearest scale to current scale
            scale = app.PrintController.findNearestScale_(scales, scale);
            if (scale != this['scale']) {
              this['scale'] = scale;
              this.map_.render();
            }
          }
        }
      }, this));
};


/**
 * Get the optimal print scale for the current map size and resolution,
 * and for the selected print layout.
 * @private
 */
app.PrintController.prototype.useOptimalScale_ = function() {
  var map = this.map_;

  var mapSize = map.getSize();
  goog.asserts.assert(goog.isDefAndNotNull(mapSize));

  var viewCenterResolution = app.PrintController.getViewCenterResolution_(
      map.getView());

  var layoutIdx = this['layouts'].indexOf(this['layout']);
  goog.asserts.assert(layoutIdx >= 0);

  var scale = this.printUtils_.getOptimalScale(mapSize,
      viewCenterResolution, app.PrintController.MAP_SIZES_[layoutIdx],
      this['scales']);

  this['scale'] = scale != -1 ? scale : this['scales'][0];
};


app.module.controller('AppPrintController', app.PrintController);

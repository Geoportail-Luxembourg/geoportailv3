/**
 * @fileoverview This file provides a print directive. This directive is used
 * to create a print form panel in the page.
 *
 * Example:
 *
 * <app-print app-print-map="::mainCtrl.map"
 *            app-print-open="mainCtrl.printOpen"
 *            app-print-layers="mainCtrl.selectedLayers">
 * </app-print>
 */
goog.module('app.print.PrintController');


goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const appPrintPrintservice = goog.require('app.print.Printservice');
const olArray = goog.require('ol.array');
const olEasing = goog.require('ol.easing');
const olEvents = goog.require('ol.events');
const olObservable = goog.require('ol.Observable');
const olProj = goog.require('ol.proj');
const olRenderEventType = goog.require('ol.render.EventType');


/**
 * @param {angular.Scope} $scope Scope.
 * @param {angular.$window} $window Global Scope.
 * @param {angular.$timeout} $timeout The Angular $timeout service.
 * @param {angular.$q} $q The Angular $q service.
 * @param {angularGettext.Catalog} gettextCatalog The gettext service.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {ngeo.print.Utils} ngeoPrintUtils The ngeoPrintUtils service.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.Theme} appTheme the current theme service.
 * @param {app.draw.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.GetShorturl} appGetShorturl The getShorturl function.
 * @param {string} printServiceUrl URL to print service.
 * @param {string} qrServiceUrl URL to qr generator service.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 * @param {angular.$http} $http Angular $http service.
 * @param {ngeo.map.LayerHelper} ngeoLayerHelper Ngeo Layer Helper.
 * @constructor
 * @export
 * @ngInject
 */
exports = function($scope, $window, $timeout, $q, gettextCatalog,
    ngeoFeatureOverlayMgr, ngeoPrintUtils,
    appThemes, appTheme, appFeaturePopup, appGetShorturl,
    printServiceUrl, qrServiceUrl, appSelectedFeatures,
    ngeoBackgroundLayerMgr, $http, ngeoLayerHelper) {

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = $window;

  /**
   * @type {app.draw.FeaturePopup}
   * @private
   */
  this.featurePopup_ = appFeaturePopup;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];
  console.assert(this.map_ !== undefined && this.map_ !== null);

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
   * @type {ngeo.print.Service}
   * @private
   */
  this.print_ = new appPrintPrintservice(printServiceUrl, $http, ngeoLayerHelper);

  /**
   * @type {ngeo.print.Utils}
   * @private
   */
  this.printUtils_ = ngeoPrintUtils;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

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
   */
  this.gettextCatalog = gettextCatalog;


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
    gettextCatalog.getString('A4 landscape'),
    gettextCatalog.getString('A4 portrait'),
    gettextCatalog.getString('A3 landscape'),
    gettextCatalog.getString('A3 portrait'),
    gettextCatalog.getString('A2 landscape'),
    gettextCatalog.getString('A2 portrait'),
    gettextCatalog.getString('A1 landscape'),
    gettextCatalog.getString('A1 portrait'),
    gettextCatalog.getString('A0 landscape'),
    gettextCatalog.getString('A0 portrait')
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
   * @type {boolean}
   */
  this.needScaleRefresh = false;

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
   * @type {ol.EventsKey?}
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
          /**
           * Return the size in dots of the map to print. Depends on
           * the selected layout.
           * @return {ol.Size} Size.
           */
          (function() {
            var layoutIdx = this['layouts'].indexOf(this['layout']);
            console.assert(layoutIdx >= 0);
            return exports.MAP_SIZES_[layoutIdx];
          }).bind(this),
          /**
           * Return the scale of the map to print.
           * @param {olx.FrameState} frameState Frame state.
           * @return {number} Scale.
           */
          (function(frameState) {
            return exports.adjustScale_(
                this.map_.getView(), this['scale']);
          }).bind(this));

  // Show/hide the print mask based on the value of the "open" property.
  $scope.$watch(function() {
    return this['open'];
  }.bind(this), function(newVal) {
    if (newVal === undefined) {
      return;
    }
    var open = /** @type {boolean} */ (newVal);
    if (open) {
      if (this.needScaleRefresh) {
        this.needScaleRefresh = false;
        this.setScales_();
      }
      this.selectedFeatures_.clear();
      this.featurePopup_.hide();
      this.useOptimalScale_();
      console.assert(postcomposeListenerKey === null);
      postcomposeListenerKey = olEvents.listen(this.map_,
          olRenderEventType.POSTCOMPOSE, postcomposeListener);
    } else if (postcomposeListenerKey !== null) {
      olObservable.unByKey(postcomposeListenerKey);
      postcomposeListenerKey = null;
    }
    this.map_.render();
  }.bind(this));

  // Set the possible print scales based on the current theme.
  $scope.$watch(function() {
    return this.appTheme_.getCurrentTheme();
  }.bind(this), function() {
    this.setScales_();
  }.bind(this));
};


/**
 * @const
 * @type {Array.<number>}
 * @private
 */
exports.DEFAULT_MAP_SCALES_ = [1500, 2500, 5000, 10000, 15000,
  20000, 25000, 50000, 80000, 100000, 125000, 200000, 250000, 400000];


/**
 * These values should match those set in the jrxml print templates.
 * @const
 * @type {Array.<ol.Size>}
 * @private
 */
exports.MAP_SIZES_ = [
  // A4 portrait and landscape
  [715, 395], [470, 650],
  // A3 portrait and landscape
  [1065, 640], [715, 975],
  // A2 portrait and landscape
  [1558, 985], [1064, 1475],
  // A1 portrait and landscape
  [2255, 1482], [1558, 2175],
  // A0 portrait and landscape
  [3241, 2173], [2254, 3155]
];


/**
 * @const
 * @type {number}
 * @private
 */
exports.DPI_ = 127;


/**
 * Get the center resolution for the current view state.
 * @param {ol.View} view The view.
 * @return {number} The point resolution.
 * @private
 */
exports.getViewCenterResolution_ = function(view) {
  var viewCenter = view.getCenter();
  var viewProjection = view.getProjection();
  var viewResolution = view.getResolution();
  console.assert(viewCenter !== undefined);
  console.assert(viewProjection !== null);
  console.assert(viewResolution !== undefined);
  return olProj.getPointResolution(viewProjection, /** @type{number} */(viewResolution),  /** @type{Array<number>} */(viewCenter));
};


/**
 * @param {ol.View} view The view.
 * @param {number} scale The non-adjusted scale.
 * @return {number} The adjusted scale.
 * @private
 */
exports.adjustScale_ = function(view, scale) {
  var viewResolution = view.getResolution();
  var viewCenterResolution = exports.getViewCenterResolution_(view);
  console.assert(viewResolution !== undefined);
  var factor = viewResolution / viewCenterResolution;
  return scale * factor;
};


/**
 * @param {Array.<number>} scales Sorted array of scales (ascending).
 * @param {number} scale Current scale.
 * @return {number} The nearest scale.
 * @private
 */
exports.findNearestScale_ = function(scales, scale) {
  if (scale <= scales[0]) {
    scale = scales[0];
  } else if (scale >= scales[scales.length - 1]) {
    scale = scales[scales.length - 1];
  } else {
    var i = 1;
    var l;
    for (i = 1, l = scales.length; i < l; ++i) {
      if (scales[i] >= scale) {
        if (scales[i] - scale < scale - scales[i - 1]) {
          scale = scales[i];
        } else {
          scale = scales[i - 1];
        }
        break;
      }
    }
    console.assert(i < l);
  }
  return scale;
};


/**
 * @export
 */
exports.prototype.cancel = function() {
  // Cancel the latest request, if it's not finished yet.
  console.assert(this.requestCanceler_ !== null);
  this.requestCanceler_.resolve();

  // Cancel the status timeout if there's one set, to make sure no other
  // status request is sent.
  if (this.statusTimeoutPromise_ !== null) {
    this.$timeout_.cancel(this.statusTimeoutPromise_);
  }

  console.assert(this.curRef_.length > 0);

  this.print_.cancel(this.curRef_);

  this.resetPrintStates_();
};


/**
 * @param {string} newLayout The name of the selected layout.
 * @export
 */
exports.prototype.changeLayout = function(newLayout) {
  this['layout'] = newLayout;
  this.useOptimalScale_();
  this.map_.render();
};


/**
 * @param {number} newScale The new scale.
 * @export
 */
exports.prototype.changeScale = function(newScale) {
  this['scale'] = newScale;

  var map = this.map_;

  var mapSize = map.getSize();
  console.assert(mapSize !== undefined && mapSize !== null);

  var layoutIdx = this['layouts'].indexOf(this['layout']);
  console.assert(layoutIdx >= 0);

  var optimalResolution = this.printUtils_.getOptimalResolution(
      /** @type {Array<number>} */ (mapSize), exports.MAP_SIZES_[layoutIdx], newScale);

  var view = map.getView();
  var currentResolution = view.getResolution();

  if (currentResolution < optimalResolution) {
    var newResolution = view.constrainResolution(optimalResolution, 0, 1);
    console.assert(newResolution >= optimalResolution);
    view.animate({
      duration: 250,
      easing: olEasing.easeOut,
      resolution: currentResolution
    });
  }

  map.render();
};


/**
 * @param {string} format The print format.
 * @export
 */
exports.prototype.print = function(format) {
  this.featurePopup_.hide();
  var map = this.map_;

  var dpi = exports.DPI_;
  var scale = exports.adjustScale_(map.getView(), this['scale']);
  var layout = this['layout'];
  var curFormat = format;
  var legend = [];

  var bgLayer = this.backgroundLayerMgr_.get(this.map_);
  var bgMetadata = bgLayer.get('metadata');
  if (bgMetadata !== undefined) {
    var bgName = bgMetadata['legend_name'];
    if (bgName !== undefined) {
      legend.push({'name': bgName});
    }
  }
  this.layers_.forEach(function(layer) {
    var curMetadata = layer.get('metadata');
    var name = curMetadata['legend_name'];
    if (name !== undefined) {
      legend.push({'name': name});
    } else {
      var isExternalWms = curMetadata['isExternalWms'];
      if (isExternalWms) {
        var legendUrl = curMetadata['legendUrl'];
        var accessConstraints = curMetadata['legendAccessConstraints'];
        var legendTitle = curMetadata['legendTitle'];

        if (legendUrl !== undefined) {
          legend.push({
            'name': null,
            'legendUrl': legendUrl,
            'accessConstraints': accessConstraints,
            'legendTitle': legendTitle});
        }
      }
    }
    var metaMaxDpi = curMetadata['max_dpi'];
    if (metaMaxDpi !== undefined) {
      var maxDpi = parseInt(metaMaxDpi, 10);
      if (dpi > maxDpi) {
        dpi = maxDpi;
      }
    }
  });

  this.getShorturl_().then(
      /**
       * @param {string} shorturl The short URL.
       */
      (function(shorturl) {
        this.requestCanceler_ = this.$q_.defer();
        this['printing'] = true;
        var format = curFormat;
        var dataOwners = [];
        map.getLayers().forEach(function(layer) {
          var source = undefined;
          if (/** @type{Object} */ (layer).getSource instanceof Function) {
            source = /** @type{Object} */ (layer).getSource();
          }
          if (source != undefined) {
            var attributions = source.getAttributions();
            if (attributions !== null) {
              attributions.forEach(function(attribution) {
                dataOwners.push(attribution.getHTML());
              }.bind(this));
            }
          }
        });

        var routingAttributions = this.featureOverlayLayer_.getSource().getAttributions();
        if (routingAttributions !== undefined && routingAttributions !== null) {
          routingAttributions.forEach(function(attribution) {
            dataOwners.push(attribution.getHTML());
          }, this);
        }
        //Remove duplicates.
        dataOwners = dataOwners.filter(function(item, pos, self) {
          return self.indexOf(item) == pos;
        });
        var disclaimer = this.gettextCatalog.getString('www.geoportail.lu est un portail d\'accès aux informations géolocalisées, données et services qui sont mis à disposition par les administrations publiques luxembourgeoises. Responsabilité: Malgré la grande attention qu’elles portent à la justesse des informations diffusées sur ce site, les autorités ne peuvent endosser aucune responsabilité quant à la fidélité, à l’exactitude, à l’actualité, à la fiabilité et à l’intégralité de ces informations. Information dépourvue de foi publique. Droits d\'auteur: Administration du Cadastre et de la Topographie. http://g-o.lu/copyright');
        var dateText = this.gettextCatalog.getString('Date d\'impression: ');
        var scaleTitle = this.gettextCatalog.getString('Echelle approximative 1:');
        var appTitle = this.gettextCatalog.getString('Le géoportail national du Grand-Duché du Luxembourg');
        var queryResults = $('.printable:not(.ng-hide):not(.ng-scope)');
        var queryResultsHtml = null;
        if ((this['routingOpen'] || this['infoOpen']) && queryResults.length > 0) {
          var clonedQuery = queryResults[0].cloneNode(true);
          var profileElements = clonedQuery.getElementsByClassName('profile');
          if (profileElements !== null && profileElements.length > 0) {
            Array.prototype.slice.call(profileElements).forEach(function(profileElement) {
              var nodeList = profileElement.getElementsByTagName('svg');
              if (nodeList !== undefined && nodeList.length > 0) {
                var svgString = this.getSVGString_(nodeList[0]);
                var img = document.createElement('IMG');
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                var parent = nodeList[0].parentNode;
                if (parent) {
                  parent.replaceChild(img, nodeList[0]);
                }
              }
            }, this);
          }
          var noprintElements = clonedQuery.getElementsByClassName('no-print');
          if (noprintElements !== null && noprintElements.length > 0) {
            Array.prototype.slice.call(noprintElements).forEach(function(noprintElement) {
              noprintElement.parentNode.removeChild(noprintElement);
            }, this);
          }
          queryResultsHtml = clonedQuery.innerHTML;
        }

        // create print spec object
        var spec = this.print_.createSpec(map, scale, dpi, layout, format, {
          'disclaimer': disclaimer,
          'scaleTitle': scaleTitle,
          'appTitle': appTitle,
          'scale': this['scale'],
          'name': this['title'],
          'url': shorturl,
          'qrimage': this.qrServiceUrl_ + '?url=' + shorturl,
          'lang': this.gettextCatalog.currentLanguage,
          'legend': this['legend'] ? legend : null,
          'scalebar': {'geodetic': true},
          'dataOwner': dataOwners.join(' '),
          'dateText': dateText,
          'queryResults': queryResultsHtml
        });
        var piwikUrl =
            'http://' + this.appTheme_.getCurrentTheme() +
            '.geoportail.lu/print/' +
            layout.replace(' ', '/');
        var piwik = /** @type {app.Piwik} */ (this.window_['_paq']);
        piwik.push(['trackLink', piwikUrl, 'download']);

        // add feature overlay layer to print spec
        var /** @type {Array.<MapFishPrintLayer>} */ layers = [];
        var resolution = map.getView().getResolution();
        console.assert(resolution !== undefined);
        this.print_.encodeLayer(layers, this.featureOverlayLayer_, /** @type{number} */(resolution));
        if (layers.length > 0) {
          spec.attributes.map.layers.unshift(layers[0]);
        }
        spec.attributes.map.layers.forEach(function(layer) {
          if ((layer.matrices instanceof Array) &&
            layer.matrixSet == 'GLOBAL_WEBMERCATOR_4_V3_HD') {
            // Ugly hack to request non retina wmts layer for print
            layer.baseURL = layer.baseURL.replace('_hd', '');
            layer.matrixSet = layer.matrixSet.replace('_HD', '');
            // layer.layer = layer.layer + '_hd';
            // layer.matrices.forEach(function(matrice) {
            //   matrice.tileSize = [512, 512];
            // });
          }
          if ((layer.matrices instanceof Array)) {
            for (var i = layer.matrices.length - 1; i > 0; i--) {
              if (layer.matrices[i].scaleDenominator > this['scale']) {
                layer.matrices.splice(0, i + 1);
                break;
              }
            }
          }
          if (layer.type === 'wms') {
            if (!layer.customParams) {
              layer.customParams = {};
            }
            layer.customParams['MAP_RESOLUTION'] = dpi;
          }
          // set the graphicFormat because mapfish print is not able
          // to guess it from the externalGraphic (doesn't end with file
          // extension)
          if (layer.type === 'geojson') {
            var vector = /** @type {MapFishPrintVectorLayer} */ (layer);
            for (var key in vector.style) {
              var style = vector.style[key];
              if ((typeof style == 'object' && style !== null) || typeof style == 'function') {
                for (var j = 0; j < style.symbolizers.length; j++) {
                  var symbolizer = style.symbolizers[j];
                  symbolizer['conflictResolution'] = false;
                  if (symbolizer.labelAlign) {
                    symbolizer.labelAlign = 'lm';
                  }
                  if (symbolizer.externalGraphic) {
                    symbolizer.graphicFormat = 'image/png';
                    if (symbolizer.externalGraphic.indexOf('scale=') > 0) {
                      delete symbolizer.graphicHeight;
                      delete symbolizer.graphicWidth;
                    } else if (symbolizer.externalGraphic.indexOf('getarrow') > 0) {
                      symbolizer.graphicHeight = 10;
                      symbolizer.graphicWidth = 10;
                    }
                  }
                }
              }
            }
          }
        }, this);
        // create print report
        this.print_.createReport(spec, /** @type {angular.$http.Config} */ ({
          timeout: this.requestCanceler_.promise
        })).then(
            angular.bind(this, this.handleCreateReportSuccess_),
            angular.bind(this, this.handleCreateReportError_));

      }).bind(this));
};


/**
 * @param {!angular.$http.Response} resp Response.
 * @private
 */
exports.prototype.handleCreateReportSuccess_ = function(resp) {
  var mfResp = /** @type {MapFishPrintReportResponse} */ (resp.data);
  var ref = mfResp.ref;
  console.assert(ref.length > 0);
  this.curRef_ = ref;
  this.getStatus_(ref);
};


/**
 * @param {string} ref Ref.
 * @private
 */
exports.prototype.getStatus_ = function(ref) {
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
exports.prototype.handleCreateReportError_ = function(resp) {
  this.resetPrintStates_();

  // FIXME display error message?
};


/**
 * @param {string} ref Ref.
 * @param {!angular.$http.Response} resp Response.
 * @private
 */
exports.prototype.handleGetStatusSuccess_ = function(ref, resp) {
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
exports.prototype.handleGetStatusError_ = function(resp) {
  this.resetPrintStates_();

  // FIXME display error message?
};


/**
 * @private
 */
exports.prototype.resetPrintStates_ = function() {
  this['printing'] = false;
  this.curRef_ = '';
};


/**
 * Set possible print scales based on the current theme.
 * @private
 */
exports.prototype.setScales_ = function() {
  var currentTheme = this.appTheme_.getCurrentTheme();
  this.appThemes_.getThemeObject(currentTheme).then(
      /**
       * @param {Object} tree Tree object for the theme.
       */
      (function(tree) {
        var scales;
        if (tree === null) {
          this.needScaleRefresh = true;
        }
        if (tree !== null && tree['metadata']['print_scales']) {
          var printScalesStr = tree['metadata']['print_scales'];
          scales = printScalesStr.trim().split(',').map(
              /**
               * @param {string} scale Scale value as a string.
               * @return {number} Scale value as a number.
               */
              function(scale) {
                return +scale;
              });
          scales.sort();
        } else {
          scales = exports.DEFAULT_MAP_SCALES_;
        }
        this['scales'] = scales;
        var scale = this['scale'];
        if (scale != -1) {
          // find nearest scale to current scale
          scale = exports.findNearestScale_(scales, scale);
          if (scale != this['scale']) {
            this['scale'] = scale;
            this.map_.render();
          }
        }
      }).bind(this));
};


/**
 * Get the optimal print scale for the current map size and resolution,
 * and for the selected print layout.
 * @private
 */
exports.prototype.useOptimalScale_ = function() {
  var map = this.map_;

  var mapSize = map.getSize();
  console.assert(mapSize !== undefined && mapSize !== null);

  var viewCenterResolution = exports.getViewCenterResolution_(
      map.getView());

  var layoutIdx = this['layouts'].indexOf(this['layout']);
  console.assert(layoutIdx >= 0);

  var scale = this.printUtils_.getOptimalScale(/** @type {Array<number>} */ (mapSize),
      viewCenterResolution, exports.MAP_SIZES_[layoutIdx],
      this['scales']);

  this['scale'] = scale != -1 ? scale : this['scales'][0];
};

/**
 * Get the optimal print scale for the current map size and resolution,
 * and for the selected print layout.
 * @param {Element} svgNode Element.
 * @return {string} the string as valid svg.
 * @private
 */
exports.prototype.getSVGString_ = function(svgNode) {
  svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
  var cssStyleText = this.getCSSStyles_(svgNode);
  this.appendCSS_(cssStyleText, svgNode);

  var serializer = new XMLSerializer();
  var svgString = serializer.serializeToString(svgNode);
  svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
  svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

  return svgString;
};

/**
 * Append css.
 * @param {string} cssText The css text.
 * @param {Element} element Element.
 * @private
 */
exports.prototype.appendCSS_ = function(cssText, element) {
  var styleElement = document.createElement('style');
  styleElement.setAttribute('type', 'text/css');
  styleElement.innerHTML = cssText;
  var refNode = element.hasChildNodes() ? element.children[0] : null;
  element.insertBefore(styleElement, refNode);
};

/**
 * Get the css styles.
 * @param {Element} parentElement Element.
 * @return {string} The extracted CSS Text.
 * @private
 */
exports.prototype.getCSSStyles_ = function(parentElement) {
  var selectorTextArr = [];

  // Add Parent element Id and Classes to the list
  selectorTextArr.push('#' + parentElement.id);
  for (var c1 = 0; c1 < parentElement.classList.length; c1++) {
    if (!olArray.includes(selectorTextArr, '.' + parentElement.classList[c1])) {
      selectorTextArr.push('.' + parentElement.classList[c1]);
    }
  }
  // Add Children element Ids and Classes to the list
  var nodes = parentElement.getElementsByTagName('*');
  for (var i1 = 0; i1 < nodes.length; i1++) {
    var id = nodes[i1].id;
    if (!olArray.includes(selectorTextArr, '#' + id)) {
      selectorTextArr.push('#' + id);
    }
    var classes = nodes[i1].classList;
    for (var c2 = 0; c2 < classes.length; c2++) {
      if (!olArray.includes(selectorTextArr, '.' + classes[c2])) {
        selectorTextArr.push('.' + classes[c2]);
      }
    }
  }

  // Extract CSS Rules
  var extractedCSSText = '';
  for (var i2 = 0; i2 < document.styleSheets.length; i2++) {
    var s = document.styleSheets[i2];
    try {
      if (!s.cssRules) {
        continue;
      }
    } catch (e) {
      if (e.name !== 'SecurityError') {
        throw e; // for Firefox
      }
      continue;
    }

    var cssRules = s.cssRules;
    for (var r1 = 0; r1 < cssRules.length; r1++) {
      if (olArray.includes(selectorTextArr, cssRules[r1].selectorText)) {
        extractedCSSText += cssRules[r1].cssText;
      }
    }
  }
  return extractedCSSText;
};

appModule.controller('AppPrintController', exports);

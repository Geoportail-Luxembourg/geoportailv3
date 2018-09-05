
/**
 * @fileoverview This file provides a scale service to display scales
 * with ngeoScaleselector
 */
goog.provide('app.ScalesService');

goog.require('app');
goog.require('goog.object');


/**
 * @constructor
 * @param {angular.$sce} $sce Angular sce service.
 * @ngInject
 */
app.ScalesService = function($sce) {
  /**
   * The zoom level/scale map object for the ngeoScaleselector directive.
   * The values need to be trusted as HTML.
   * @type {Object.<string, string>}
   * @const
   */
  this.origScales = {
    '8': $sce.trustAsHtml('1&nbsp;:&nbsp;1\'500\'000'),
    '9': $sce.trustAsHtml('1&nbsp;:&nbsp;750\'000'),
    '10': $sce.trustAsHtml('1&nbsp;:&nbsp;400\'000'),
    '11': $sce.trustAsHtml('1&nbsp;:&nbsp;200\'000'),
    '12': $sce.trustAsHtml('1&nbsp;:&nbsp;100\'000'),
    '13': $sce.trustAsHtml('1&nbsp;:&nbsp;50\'000'),
    '14': $sce.trustAsHtml('1&nbsp;:&nbsp;25\'000'),
    '15': $sce.trustAsHtml('1&nbsp;:&nbsp;12\'000'),
    '16': $sce.trustAsHtml('1&nbsp;:&nbsp;6\'000'),
    '17': $sce.trustAsHtml('1&nbsp;:&nbsp;3\'000'),
    '18': $sce.trustAsHtml('1&nbsp;:&nbsp;1\'500'),
    '19': $sce.trustAsHtml('1&nbsp;:&nbsp;750'),
    '20': $sce.trustAsHtml('1&nbsp;:&nbsp;400'),
    '21': $sce.trustAsHtml('1&nbsp;:&nbsp;200')
  };

  /**
   * @type {Object.<string, string>}
   */
  this.scales = goog.object.clone(this.origScales);
};


/**
 * @return {Object.<string, string>} The zoom level/scale map object for the
 * ngeoScaleselector directive.
 * @export
 */
app.ScalesService.prototype.getScales = function() {
  return this.scales;
};


/**
 * Set maximum zoom level.
 * @param {number} maxScale The maximum zoom.
 */
app.ScalesService.prototype.setMaxZoomLevel = function(maxScale) {
  for (var i = 9; i < 22; i++) {
    if (i <= maxScale) {
      if (!this.scales['' + i]) {
        this.scales['' + i] = this.origScales['' + i];
      }
    } else {
      delete this.scales['' + i];
    }
  }
};

app.module.service('appScalesService', app.ScalesService);

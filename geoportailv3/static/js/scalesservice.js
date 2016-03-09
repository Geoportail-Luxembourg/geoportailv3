
/**
 * @fileoverview This file provides a scale service to display scales
 * with ngeoScaleselector
 */
goog.provide('app.ScalesService');

goog.require('app');
goog.require('ol.proj');



/**
 * @constructor
 * @param {angular.$sce} $sce Angular sce service.
 * @ngInject
 */
app.ScalesService = function($sce) {
  /**
   * The zoom level/scale map object for the ngeoScaleselector directive.
   * The values need to be trusted as HTML.
   * @type {Array.<string>}
   * @const
   */
  this.scalesArray = [
    $sce.trustAsHtml('1&nbsp;:&nbsp;1\'500\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;750\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;400\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;200\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;100\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;50\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;25\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;12\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;6\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;3\'000'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;1\'500'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;750'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;400'),
    $sce.trustAsHtml('1&nbsp;:&nbsp;200')
  ];
  /**
   * @type {number}
   */
  this.nbScales_ = 12;

};


/**
 * @return {Object.<string, string>} The zoom level/scale map object for the
 *   ngeoScaleselector directive.
 */
app.ScalesService.prototype.getScales = function() {
  console.log(this.nbScales_);
  var scales = {}
  for (var i = 0; (i < this.nbScales_) && (i < this.scalesArray.length); i++){
    scales['' + (i + 8)] = this.scalesArray[i];
  }
  return scales;
};


/**
 * Set the number of available scales
 * @param {number} nbScales
 *   ngeoScaleselector directive.
 */
app.ScalesService.prototype.setNbScales = function(nbScales) {
  this.nbScales_ = nbScales;
  console.log(" set : " + this.nbScales_);
};

app.module.service('appScalesService', app.ScalesService);

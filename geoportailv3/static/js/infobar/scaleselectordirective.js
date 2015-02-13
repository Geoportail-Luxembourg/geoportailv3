goog.provide('app.scaleselectorDirective');

goog.require('app');
goog.require('ngeo.ScaleselectorOptions');
goog.require('ngeo.mapDirective');
goog.require('ngeo.scaleselectorDirective');


// Use the default "scale selector" template.
//app.module.value('ngeoScaleselectorTemplateUrl',
//    '../src/directives/partials/scaleselector.html');


/**
 * The application-specific scale selector directive, based on the
 * ngeo-scaleselector directive.
 *
 * @return {angular.Directive} Directive Definition Object.
 */
app.scaleselectorDirective = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appScaleselectorMap'
    },
    template: '<div ngeo-scaleselector="ctrl.scales" ' +
        'ngeo-scaleselector-map="ctrl.map" ' +
        'ngeo-scaleselector-options="ctrl.options"></div>',
    controllerAs: 'ctrl',
    bindToController: true,
    controller: 'AppScaleselectorController'
  };
};


app.module.directive('appScaleselector', app.scaleselectorDirective);



/**
 * @constructor
 * @param {angular.$sce} $sce Angular sce service.
 * @ngInject
 */
app.ScaleselectorController = function($sce) {

  /**
   * The zoom level/scale map object for the ngeoScaleselector directive.
   * The values need to be trusted as HTML.
   * @type {Object.<string, string>}
   * @const
   */
  this['scales'] = {
    '09': $sce.trustAsHtml('1&nbsp;:&nbsp;1\'000\'000'),
    '10': $sce.trustAsHtml('1&nbsp;:&nbsp;500\'000'),
    '11': $sce.trustAsHtml('1&nbsp;:&nbsp;250\'000'),
    '12': $sce.trustAsHtml('1&nbsp;:&nbsp;150\'000'),
    '13': $sce.trustAsHtml('1&nbsp;:&nbsp;70\'000'),
    '14': $sce.trustAsHtml('1&nbsp;:&nbsp;35\'000'),
    '15': $sce.trustAsHtml('1&nbsp;:&nbsp;15\'000'),
    '16': $sce.trustAsHtml('1&nbsp;:&nbsp;8\'000'),
    '17': $sce.trustAsHtml('1&nbsp;:&nbsp;4\'000'),
    '18': $sce.trustAsHtml('1&nbsp;:&nbsp;2\'000'),
    '19': $sce.trustAsHtml('1&nbsp;:&nbsp;1\'000')
  };

  /**
   * Use the "dropup" variation of the Bootstrap dropdown.
   * @type {ngeo.ScaleselectorOptions}
   */
  this['options'] = {
    'dropup': true
  };
};

app.module.controller('AppScaleselectorController',
    app.ScaleselectorController);

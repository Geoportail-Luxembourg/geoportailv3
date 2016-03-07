goog.provide('app.ScaleselectorController');
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
   * Use the "dropup" variation of the Bootstrap dropdown.
   * @type {ngeo.ScaleselectorOptions}
   */
  this['options'] = {
    'dropup': true
  };
};

app.module.controller('AppScaleselectorController',
    app.ScaleselectorController);

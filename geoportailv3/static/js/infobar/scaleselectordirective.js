goog.provide('app.ScaleselectorController');
goog.provide('app.scaleselectorDirective');

goog.require('app.module');


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
    template: '<div ngeo-scaleselector="ctrl.scalesService.getScales()" ' +
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
 * @param {app.ScalesService} appScalesService Service returning scales.
 * @ngInject
 */
app.ScaleselectorController = function(appScalesService) {

  /**
   * @type {app.ScalesService}
   * @export
   */
  this.scalesService = appScalesService;

  /**
   * Use the "dropup" variation of the Bootstrap dropdown.
   * @type {ngeox.ScaleselectorOptions}
   */
  this['options'] = {
    'dropup': true
  };
};

app.module.controller('AppScaleselectorController',
    app.ScaleselectorController);

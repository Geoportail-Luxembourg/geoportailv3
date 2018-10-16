goog.provide('app.infobar.ScaleselectorController');

goog.require('app.module');


// Use the default "scale selector" template.
//app.module.value('ngeoScaleselectorTemplateUrl',
//    '../src/directives/partials/scaleselector.html');


/**
 * @constructor
 * @param {app.ScalesService} appScalesService Service returning scales.
 * @ngInject
 */
app.infobar.ScaleselectorController = function(appScalesService) {

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
    app.infobar.ScaleselectorController);

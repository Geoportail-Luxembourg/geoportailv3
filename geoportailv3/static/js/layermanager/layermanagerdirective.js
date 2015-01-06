goog.provide('app.layermanagerDirective');

goog.require('app');


/**
 * @param {string} appLayermanagerTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 */
app.layermanagerDirective = function(appLayermanagerTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appLayermanagerMap'
    },
    controller: 'AppLayermanagerController',
    controllerAs: 'layermanagerCtrl',
    bindToController: true,
    templateUrl: appLayermanagerTemplateUrl
  };
};


app.module.directive('appLayermanager', app.layermanagerDirective);



/**
 * @constructor
 * @export
 * @ngInject
 */
app.LayermanagerController = function() {
};


app.module.controller('AppLayermanagerController', app.LayermanagerController);

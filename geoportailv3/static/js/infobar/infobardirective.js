/**
 * @fileoverview This file provides a "infobar" directive. This directive is
 * used to insert an Info Bar into the HTML page.
 * Example:
 *
 * <app-infobar app-infobar-map="::mainCtrl.map"map></app-infobar>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.infobarDirective');
goog.require('app');
goog.require('ol.control.MousePosition');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appInfobarTemplateUrl
 * @ngInject
 */
app.infobarDirective = function(appInfobarTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appInfobarMap'
    },
    controller: 'AppInfobarController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appInfobarTemplateUrl
  };
};


app.module.directive('appInfobar', app.infobarDirective);



/**
 * @ngInject
 * @constructor
 */
app.InfobarDirectiveController = function() {
    this['infobarOpen'] = false;
};

app.InfobarDirectiveController.prototype.infobarSwitch = function(){
    if (this['infobarOpen']){
        this['infobarOpen'] = false;
    } else {
        this['infobarOpen'] = true;
    };
}

app.module.controller('AppInfobarController',
    app.InfobarDirectiveController);

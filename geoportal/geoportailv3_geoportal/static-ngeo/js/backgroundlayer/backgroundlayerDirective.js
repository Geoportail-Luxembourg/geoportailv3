/**
 * @module app.backgroundlayer.backgroundlayerDirective
 */
/**
 * @fileoverview This file provides the "backgroundlayer" directive. This
 * directive is used to create a dropdown for selecting the map's background
 * layer. This directive is based on Bootstrap's "dropdown" component, and
 * on the "ngeoBackgroundLayerMgr" service.
 *
 * Example:
 *
 * <app-backgroundlayer app-backgroundlayer-map="::mainCtrl.map" active-mvt="mainCtrl.activeMvt">
 * </app-backgroundlayer>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */

import appModule from '../module.js';

/**
 * @param {string} appBackgroundlayerTemplateUrl URL to backgroundlayer
 *     template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appBackgroundlayerTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appBackgroundlayerMap',
      'activeMvt': '='
    },
    controller: 'AppBackgroundlayerController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appBackgroundlayerTemplateUrl
  };
};


appModule.directive('appBackgroundlayer', exports);

 // Custom directive for the  "vector tiles style" change button
appModule.directive('customOnChange', function() {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var onChangeHandler = scope.$eval(attrs.customOnChange);
      element.on('change', onChangeHandler);
      element.on('$destroy', function() {
        element.off();
      });
    }
  };
});


export default exports;

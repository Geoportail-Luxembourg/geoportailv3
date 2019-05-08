/**
 * @module app.imageupload.ImguploadDirective
 */
/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */

import appModule from '../module.js';

/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
const exports = function() {
  return {
    restrict: 'A',
    link:
        /**
         * @param {!angular.Scope} scope Scope.
         * @param {angular.JQLite} element Element.
         * @param {angular.Attributes} attrs Attributes.
         * @param {app.imageupload.ImguploadController} ctrl Controller.
         */
        function(scope, element, attrs, ctrl) {
          element.bind('change', function() {
            scope.$apply(function() {
              ctrl.uploadFileToUrl(element[0].files[0], scope, attrs);
            });
          });
        },
    controller: 'AppImguploadController'
  };
};


appModule.directive('appImgupload', exports);


export default exports;

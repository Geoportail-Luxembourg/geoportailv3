goog.provide('app.imageupload.ImguploadDirective');

/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */

goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
app.imageupload.ImguploadDirective = function() {
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


app.module.directive('appImgupload', app.imageupload.ImguploadDirective);

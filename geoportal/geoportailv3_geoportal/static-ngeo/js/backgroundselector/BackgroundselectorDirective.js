import appModule from '../module.js';

/**
 * @param {string} appBackgroundselectorTemplateUrl Url to backgroundselector template.
 * @return {angular.IDirective}
 * @ngInject
 */
const exports = function(appBackgroundselectorTemplateUrl) {
    return {
        restrict: 'E',
        scope: {
            'map': '=appBackgroundselectorMap'
        },
        controller: 'AppBackgroundselectorController',
        controllerAs: 'ctrl',
        bindToController: true,
        templateUrl: appBackgroundselectorTemplateUrl
    }
}

 // Custom directive for the  "vector tiles style" upload button
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

appModule.directive('appBackgroundselector', exports);

export default exports;

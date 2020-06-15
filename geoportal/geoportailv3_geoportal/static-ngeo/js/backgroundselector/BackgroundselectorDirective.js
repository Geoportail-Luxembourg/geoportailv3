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

appModule.directive('appBackgroundselector', exports);

export default exports;

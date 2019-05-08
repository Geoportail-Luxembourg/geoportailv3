/**
 * @fileoverview This file provides a shorturl directive
 * This directive is used to create a short url panel in the page.
 *
 * Example:
 *
 * <app-shorturl app-shorturl-active="::mainCtrl.active"></app-shorturl>
 *
 */
goog.module('app.share.shorturlDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appShorturlTemplateUrl Url to share template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appShorturlTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'active': '=appShorturlActive',
      'onlyMymaps': '=appShorturlActiveMymaps',
      'showLongUrl': '=appShorturlShowLongUrl'
    },
    controller: 'AppShorturlController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appShorturlTemplateUrl
  };
};

appModule.directive('appShorturl', exports);

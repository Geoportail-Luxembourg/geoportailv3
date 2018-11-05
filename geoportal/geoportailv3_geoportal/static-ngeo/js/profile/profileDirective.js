/**
 * @module app.profile.profileDirective
 */
/**
 * @fileoverview This file provides a profile directive. This directive is used
 * to create a profile panel in the page.
 *
 * Example:
 *
 * <app-profile app-profile-data="mainCtrl.profileData"
 *   app-profile-open="mainCtrl.profileOpen" app-profile-map="::mainCtrl.map">
 * </app-profile>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */

import appModule from '../module.js';

/**
 * @param {string} appProfileTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appProfileTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'profileData': '=appProfileData',
      'profileInteraction': '=appProfileInteraction',
      'map': '=appProfileMap',
      'isLoadingProfileMsg': '=appProfileIsLoadingMsg'
    },
    controller: 'AppProfileController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appProfileTemplateUrl
  };
};

appModule.directive('appProfile', exports);


export default exports;

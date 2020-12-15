/**
 * @module app.layertabDirective
 */
/**
 * @fileoverview Provides a directive that resizes the map in an animation
 * loop during 2 second when the value of "state" changes.
 *
 * Example:
 *
 * <div app-resizemap="ctrl.map"
 *      app-resizemap-mainCtrl="mainCtrl">
 * <div>
 */

import appModule from './module.js';


/**
 * @param {angular.$window} $window Angular window service.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
const exports = function($window) {
  return {
    restrict: 'A',
    replace: true,
    scope: {
      'mainCtrl': '=mainCtrl'
    },
    template: `<ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="my-layers-tab">
              <a href="#mylayers" data-toggle="tab" role="tab"
                ng-class="{active: mainCtrl.layersActiveTab=='mylayers'}"
                ng-click="mainCtrl.showTab('mylayers', $event)">
                <span translate>my_layers</span>
                <span ng-if="mainCtrl.selectedLayersLength() > 0">({{mainCtrl.selectedLayersLength()}})</span>
              </a>
            </li>
            <li role="presentation" class="catalog-tab">
              <a href="#catalog" data-toggle="tab" role="tab"
                ng-class="{active: mainCtrl.layersActiveTab=='catalog'}"
                ng-click="mainCtrl.showTab('catalog', $event)"
                translate>
                Catalog
              </a>
            </li>
          </ul>`
  };
};


appModule.directive('appLayerstab', exports);


export default exports;

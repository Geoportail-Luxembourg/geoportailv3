// @ts-check
import appModule from '../module.js';

appModule.component('appMediumStyle', {
  template: `
  <div ng-repeat="item in $ctrl.stylings">
    <app-medium-style-item on-change="$ctrl.onStylingChanged" item="item"></<app-medium-style-item>
  </div>
  `,
  bindings: {
    stylings: '=',
    onStylingChanged: '<',
  }
});


export default class ItemController {

  /**
   * @param {string} color The color.
   * @return {string} The color of the item.
   */
  getSetColor(color) {
    if (arguments.length) {
      this.item.color = color;
      this.onChange(this.item);
    } else {
      return this.item.color;
    }
  }

    /**
   * @param {string} visible The color.
   * @return {string} The color of the item.
   */
  getSetVisible(visible) {
    if (arguments.length) {
      this.item.visible = visible;
      this.onChange(this.item);
    } else {
      return this.item.visible;
    }
  }
};

appModule.component('appMediumStyleItem', {
  template: `
  <div>
    <span class="stylinglabel">{{$ctrl.item.label | translate}}</span>
    <input class="color" type="color" ng-model="$ctrl.getSetColor" ng-model-options="{getterSetter: true}">
    <input class="visible" type="checkbox" ng-model="$ctrl.getSetVisible" ng-model-options="{getterSetter: true}">
  </div>
  `,
  controller: ItemController,
  bindings: {
    onChange: '<',
    item: '='
  }
});

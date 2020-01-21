// @ts-check
import appModule from '../../module.js';

appModule.component('appSimpleStyle', {
  template: `
  <div ng-repeat="item in $ctrl.stylings">
    <app-simple-style-item ng-click="$ctrl.onStylingSelected(item)" item="item"></<app-medium-style-item>
  </div>
  `,
  bindings: {
    stylings: '=',
    onStylingSelected: '<',
  }
});


appModule.component('appSimpleStyleItem', {
  template: `
  <span ng-repeat="color in $ctrl.item track by $index">
    <span style="background-color: {{color}}">&nbsp;</span>
  </span>
  `,
  bindings: {
    item: '='
  }
});

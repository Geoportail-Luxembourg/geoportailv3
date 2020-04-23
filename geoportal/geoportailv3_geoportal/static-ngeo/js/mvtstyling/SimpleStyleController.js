// @ts-check
import appModule from '../module.js';

appModule.component('appSimpleStyle', {
  template: `
  <div ng-repeat="item in $ctrl.stylings" class="{{item['selected']?'selectedstyleline':''}}">
<span>{{item['label']|translate}} : </span><app-simple-style-item ng-click="$ctrl.onStylingSelected(item)" item="item['colors']"></<app-medium-style-item>
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
